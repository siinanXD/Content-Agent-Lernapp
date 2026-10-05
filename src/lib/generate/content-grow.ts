/**
 * AP-23 / SIN-220 — Content-Fabrik: Planung des wöchentlichen Laufs.
 * Reine Funktionen (kein Netz): Queue aus den Curriculum-Maps, Deckel, Bericht.
 * Der Lauf selbst steht in scripts/content-grow.ts.
 */
import type { Curriculum, CurriculumModule } from "@/lib/content/curriculum";
import { neutralSharedModuleIds } from "@/lib/content/shared-modules";
import { OLD_REGEN_EUR_PER_UNIT } from "@/lib/quality/cost-guard";
import type { EvalItem } from "@/lib/quality/evaluate-agent";
import type { GeneratedUnit } from "./maf-lernfeld-seed";
import type { BatchChunkTarget } from "./batch-generate";

/** Deckel je Lauf (AGENTS.md); Stopp schon bei 19 €, weil der Richter nach dem Batch noch läuft (D-45). */
export const RUN_CAP_EUR = 20;
export const RUN_STOP_EUR = 19;
/** Sicherheitsfaktor auf die Kosten je Einheit bei der Vorab-Rechnung. */
export const COST_MARGIN = 1.25;

/** Der Generator liest bisher nur die Metall-Map (loadMafCurriculum). Andere Maps folgen mit der Kurswahl. */
export const SUPPORTED_MAP_IDS: readonly string[] = ["maf-metall"];

/** Secrets laut SIN-220; der Workflow prüft sie vor allem anderen mit scripts/check-env.mjs. */
export const REQUIRED_SECRETS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_WORKSPACE_ID",
  "OPENAI_API_KEY",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_BASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function missingSecrets(env: Record<string, string | undefined>): string[] {
  return REQUIRED_SECRETS.filter((k) => !env[k]?.trim());
}

/** Alle Einheiten-IDs eines Moduls: `<blockId>-u<n>` mit n = 1..units. */
export function slotIds(m: CurriculumModule): string[] {
  return m.blocks.flatMap((b) =>
    Array.from({ length: b.units }, (_, i) => `${b.id}-u${i + 1}`),
  );
}

export type QueueItem = {
  mapId: string;
  module: CurriculumModule;
  shared: boolean;
  supported: boolean;
};

/**
 * Reihenfolge: MAF Metall vor den anderen Maps, dann MAF vor den übrigen Familien.
 * Je Map zuerst neutrale Shared-Module (AP-20), dann Schwerpunkt-Module nach `order`.
 * Ein neutrales Shared-Modul steht nur in der ersten Map, die es hat; alle anderen
 * Maps nutzen es per Verknüpfung.
 */
export function buildQueue(
  curricula: Curriculum[],
  shared: readonly string[] = neutralSharedModuleIds(curricula.filter((c) => c.family === "maf")),
): QueueItem[] {
  const rank = (c: Curriculum) => (c.id === "maf-metall" ? 0 : c.family === "maf" ? 1 : 2);
  const maps = [...curricula].sort(
    (a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id, "de"),
  );
  const seenShared = new Set<string>();
  const out: QueueItem[] = [];
  for (const c of maps) {
    const items = c.modules
      .filter((m) => {
        if (!shared.includes(m.id) || c.family !== "maf") return true;
        if (seenShared.has(m.id)) return false;
        seenShared.add(m.id);
        return true;
      })
      .map((module) => ({
        mapId: c.id,
        module,
        shared: shared.includes(module.id) && c.family === "maf",
        supported: SUPPORTED_MAP_IDS.includes(c.id),
      }));
    items.sort(
      (a, b) => Number(b.shared) - Number(a.shared) || a.module.order - b.module.order,
    );
    out.push(...items);
  }
  return out;
}

/** Einheiten, die ein Modul noch braucht: nicht veröffentlicht und nicht schon verworfen. */
export function pendingSlots(
  m: CurriculumModule,
  published: ReadonlySet<string>,
  discarded: ReadonlySet<string>,
): string[] {
  return slotIds(m).filter((id) => !published.has(id) && !discarded.has(id));
}

/**
 * Nächstes Modul ohne veröffentlichte Einheiten (SIN-220). Ausnahme: `resumeModuleId`,
 * ein Modul, das der Deckel im Vorlauf nur teilweise geschafft hat; es läuft zuerst weiter.
 * Lücken in schon begonnenen Modulen (z. B. die 32 verworfenen aus Phase A) gehören der
 * Reparatur (AP-21) und blockieren die Queue nicht.
 */
export function nextOpenItem(
  queue: QueueItem[],
  published: ReadonlySet<string>,
  discarded: ReadonlySet<string>,
  resumeModuleId?: string | null,
): { item: QueueItem; pending: string[] } | null {
  const open = queue
    .filter((item) => item.supported)
    .map((item) => ({ item, pending: pendingSlots(item.module, published, discarded) }))
    .filter((x) => x.pending.length > 0);
  const resumed = resumeModuleId ? open.find((x) => x.item.module.id === resumeModuleId) : undefined;
  if (resumed) return resumed;
  return (
    open.find((x) => !slotIds(x.item.module).some((id) => published.has(id))) ?? null
  );
}

/** Chunk-Ziele (2 Einheiten je Request) nur für offene Einheiten, höchstens `maxUnits`. */
export function trimTargets(
  targets: BatchChunkTarget[],
  pending: ReadonlySet<string>,
  maxUnits: number,
): { targets: BatchChunkTarget[]; units: number; leftOver: number } {
  const open = targets.filter((t) => {
    for (let i = 0; i < t.unitCount; i++) {
      if (pending.has(`${t.block.id}-u${t.unitOffset + i + 1}`)) return true;
    }
    return false;
  });
  const out: BatchChunkTarget[] = [];
  let units = 0;
  for (const t of open) {
    if (units + t.unitCount > maxUnits) break;
    out.push(t);
    units += t.unitCount;
  }
  const total = open.reduce((s, t) => s + t.unitCount, 0);
  return { targets: out, units, leftOver: total - units };
}

/** Kosten je Einheit aus echten Läufen (Bericht-Historie), sonst der alte Regen-Wert. */
export function eurPerUnit(history: ReadonlyArray<{ costEur: number; unitsGenerated: number }>): number {
  const units = history.reduce((s, r) => s + r.unitsGenerated, 0);
  const eur = history.reduce((s, r) => s + r.costEur, 0);
  return units > 0 && eur > 0 ? eur / units : OLD_REGEN_EUR_PER_UNIT;
}

/** Wie viele Einheiten passen noch unter den Stopp-Wert (mit Sicherheitsfaktor)? */
export function affordableUnits(spentEur: number, perUnitEur: number): number {
  const room = RUN_STOP_EUR - spentEur;
  if (room <= 0 || perUnitEur <= 0) return 0;
  return Math.floor(room / (perUnitEur * COST_MARGIN));
}

export function overBudget(spentEur: number): boolean {
  return spentEur >= RUN_STOP_EUR;
}

/** Eindeutiger Schlüssel einer Quellenänderung (Bericht `diff.changed`). */
export type SourceChange = { url: string; field: string; after: string };
export const changeKey = (c: SourceChange) => `${c.url}|${c.field}|${c.after}`;

/**
 * Einheiten, die der Quellen-Monitor betrifft: Blöcke der betroffenen Module der Map.
 * Bereits behandelte Änderungen (Bericht-Historie) lösen nichts mehr aus, weil das
 * Lock erst nach menschlicher Prüfung aktualisiert wird.
 */
export function affectedUnitIds(
  report: {
    diff?: { changed?: SourceChange[] } | null;
    affected?: Array<{ mapId: string; modules: Array<{ moduleId: string; blockIds: string[] }> }>;
  } | null,
  mapId: string,
  stored: ReadonlyArray<Pick<GeneratedUnit, "id" | "blockId">>,
  handled: ReadonlySet<string>,
): { unitIds: string[]; changeKeys: string[] } {
  const changes = report?.diff?.changed ?? [];
  const fresh = changes.filter((c) => !handled.has(changeKey(c)));
  if (fresh.length === 0) return { unitIds: [], changeKeys: [] };
  const blocks = new Set(
    (report?.affected ?? [])
      .filter((a) => a.mapId === mapId)
      .flatMap((a) => a.modules.flatMap((m) => m.blockIds)),
  );
  const unitIds = stored.filter((u) => u.blockId && blocks.has(u.blockId)).map((u) => u.id);
  return { unitIds, changeKeys: fresh.map(changeKey) };
}

/** Eval-Einträge für den Richter (gleiche Form wie in den ap15-Skripten). */
export function toEvalItems(
  entries: Array<{ unit: GeneratedUnit; questions: GeneratedUnit["questions"] }>,
  curriculum: Curriculum,
): EvalItem[] {
  return entries.flatMap(({ unit: u, questions }) => {
    const mod = curriculum.modules.find((m) => m.id === u.moduleId);
    return questions.map((q) => ({
      id: `${u.id}-${q.id}`,
      unitId: u.id,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
      moduleId: u.moduleId,
      blockId: u.blockId,
      year: mod?.year,
      niveauHint: u.niveau ?? mod?.niveau,
      safety: u.safetyFlag ?? mod?.safety,
    }));
  });
}

/** Sicherheits-Stichprobe wie AP-15: 10 % der Safety-Einheiten, mindestens eine, deterministisch. */
export function pickSafetySample<T extends { id: string; safetyFlag?: boolean }>(
  units: T[],
  pct = 0.1,
): T[] {
  const safety = units.filter((u) => u.safetyFlag);
  if (safety.length === 0) return [];
  const n = Math.max(1, Math.round(safety.length * pct));
  const sorted = [...safety].sort((a, b) => a.id.localeCompare(b.id, "de"));
  const step = Math.max(1, Math.floor(sorted.length / n));
  const sample: T[] = [];
  for (let i = 0; i < sorted.length && sample.length < n; i += step) sample.push(sorted[i]!);
  return sample;
}

export type RunReport = {
  runId: string;
  mode: "live" | "dry-run";
  startedAt: string;
  mapId: string | null;
  moduleId: string | null;
  nextModuleId: string | null;
  /** Gesetzt, wenn der Deckel das Modul unterbrochen hat; der nächste Lauf macht dort weiter. */
  resumeModuleId: string | null;
  /** Neu erzeugt und bewertet. */
  generated: number;
  passed: number;
  discarded: number;
  discardedUnitIds: string[];
  /** Offen wegen Deckel; kommt im nächsten Lauf. */
  deferred: number;
  repair: { ran: boolean; costEur: number };
  sourceRefresh: { units: number; replaced: number; changeKeys: string[] };
  model: string;
  costEur: number;
  capEur: number;
  stopReason: string | null;
  safetySampleUnitIds: string[];
  batchIds: string[];
  langfuseTraceId?: string;
};

export function reportFileName(r: Pick<RunReport, "runId" | "mode">): string {
  return `${r.runId}${r.mode === "dry-run" ? "-dry-run" : ""}.json`;
}

/** Kommentar fürs Linear-Projekt: erzeugt, bestanden, verworfen, Kosten, nächstes Modul. */
export function linearSummary(r: RunReport): string {
  const next = r.nextModuleId ?? "keins (Queue leer oder nicht unterstützt)";
  return [
    `**Content-Lauf ${r.runId}** (${r.mode})`,
    `- Modul: ${r.mapId ?? "–"} / ${r.moduleId ?? "–"}`,
    `- Erzeugt: ${r.generated}, bestanden: ${r.passed}, verworfen: ${r.discarded}, zurückgestellt: ${r.deferred}`,
    `- Reparatur (AP-21): ${r.repair.ran ? `€${r.repair.costEur.toFixed(2)}` : "nicht gelaufen"}; Quellen-Neuerzeugung: ${r.sourceRefresh.replaced}/${r.sourceRefresh.units}`,
    `- Kosten: €${r.costEur.toFixed(2)} von €${r.capEur} (Modell ${r.model})`,
    `- Stopp: ${r.stopReason ?? "kein"}`,
    `- Nächstes Modul: ${next}`,
  ].join("\n");
}
