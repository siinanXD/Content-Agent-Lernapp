/**
 * AP-23 / SIN-220 — Content-Fabrik: Planung des wöchentlichen Laufs.
 * Reine Funktionen (kein Netz): Queue aus den Curriculum-Maps, Deckel, Bericht.
 * Der Lauf selbst steht in scripts/content-grow.ts.
 */
import type { Curriculum, CurriculumModule } from "@/lib/content/curriculum";
import { neutralSharedModuleIds } from "@/lib/content/shared-modules";
import {
  EUR_PER_USD,
  GPT_JUDGE_IN_PER_MTOK,
  GPT_JUDGE_OUT_PER_MTOK,
  OLD_REGEN_EUR_PER_UNIT,
} from "@/lib/quality/cost-guard";
import type { EvalItem } from "@/lib/quality/evaluate-agent";
import type { GeneratedUnit } from "./maf-lernfeld-seed";
import type { BatchChunkTarget } from "./batch-generate";
import { formatSchemaStats, type SchemaStats } from "./question-schema";

/** Deckel je Lauf (AGENTS.md); Stopp schon bei 19 €, weil der Richter nach dem Batch noch läuft (D-45). */
export const RUN_CAP_EUR = 20;
export const RUN_STOP_EUR = 19;
/** SIN-469: Wochendeckel über alle Live-Läufe der letzten 7 Tage (3 Läufe × 20 €). */
export const WEEK_CAP_EUR = 60;
/** SIN-469: Mehrere Läufe pro Woche, aber höchstens einer je UTC-Tag. */
export const MAX_RUNS_PER_DAY = 1;
/** Sicherheitsfaktor auf die Kosten je Einheit bei der Vorab-Rechnung. */
export const COST_MARGIN = 1.25;
/**
 * SIN-478: Reserve für die Reparaturstufe. Sie läuft vor der Fabrik und kostete im Lauf 10-12 2,90 €;
 * ihr letzter Batch darf höchstens so viel kosten, dann bleibt der Lauf unter 20 €.
 */
export const REPAIR_BATCH_RESERVE_EUR = 3;
/** SIN-478: Stopp der Reparaturstufe (als `--stop-eur` an scripts/ap15-regen-dropped.ts). */
export const REPAIR_STOP_EUR = RUN_CAP_EUR - REPAIR_BATCH_RESERVE_EUR;

/**
 * Maps, die die Fabrik erzeugt: MAF Metall, Industriekaufleute (SIN-431) und die 6 weiteren
 * MAF-Schwerpunkte (SIN-479). Die Weiterbildung folgt später.
 */
export const SUPPORTED_MAP_IDS: readonly string[] = [
  "maf-metall",
  "indkfl",
  "maf-kunststoff",
  "maf-textil",
  "maf-textilveredelung",
  "maf-lebensmittel",
  "maf-druckverarbeitung",
  "maf-packmittel",
];

/** SIN-479: Maps mit Vorrang. Die 6 weiteren Schwerpunkte kommen erst, wenn diese fertig sind. */
export const PRIORITY_MAP_IDS: readonly string[] = ["maf-metall", "indkfl"];

/**
 * Kurs, Stichwort und Langfuse-Kontext je Map. Die Einheiten liegen in `courses.generated` des Kurses.
 * Feste Kennung (`courseId`) oder Kursname (`courseKeyword`, SIN-479): die Kurse der Schwerpunkte legt
 * die Migration 20261005020000 mit zufälliger Kennung an, darum löst `resolveCourseIds` sie über den Namen auf.
 */
export type MapCourse = {
  courseId?: string;
  courseKeyword?: string;
  keyword: string;
  beruf: string;
  schwerpunkt: string;
};
const mafSchwerpunkt = (name: string, beruf: string): MapCourse => ({
  courseKeyword: `Maschinen- und Anlagenführer – Schwerpunkt ${name}`,
  keyword: `Maschinen- und Anlagenführer – Schwerpunkt ${name}`,
  beruf,
  schwerpunkt: name,
});
export const MAP_COURSES: Record<string, MapCourse> = {
  "maf-metall": {
    courseId: "e22073de-7020-4380-9002-c70d46c25e25",
    keyword: "Maschinen- und Anlagenführer",
    beruf: "MAF Metall",
    schwerpunkt: "Metall",
  },
  // Kurs und Quellen legt die Migration 20261012010000_sin431_kurs_indkfl.sql an.
  indkfl: {
    courseId: "5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31",
    keyword: "Industriekaufmann",
    beruf: "Industriekaufleute",
    schwerpunkt: "Industriekaufmann/-frau",
  },
  "maf-kunststoff": mafSchwerpunkt("Kunststoff", "MAF Kunststoff"),
  "maf-textil": mafSchwerpunkt("Textil", "MAF Textil"),
  "maf-textilveredelung": mafSchwerpunkt("Textilveredelung", "MAF Textilveredelung"),
  "maf-lebensmittel": mafSchwerpunkt("Lebensmittel", "MAF Lebensmittel"),
  "maf-druckverarbeitung": mafSchwerpunkt("Druckverarbeitung", "MAF Druckverarbeitung"),
  "maf-packmittel": mafSchwerpunkt("Packmittel", "MAF Packmittel"),
};

/** Kurs-Kennung je Map: feste Kennung, sonst der echte Kurs (kein Mock) mit dem Namen der Map. */
export function resolveCourseIds(
  courses: ReadonlyArray<{ id: string; keyword: string; mock?: boolean }>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [mapId, mc] of Object.entries(MAP_COURSES)) {
    const id =
      mc.courseId ?? courses.find((c) => !c.mock && c.keyword === mc.courseKeyword)?.id;
    if (id) out.set(mapId, id);
  }
  return out;
}

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
 * Reihenfolge: MAF Metall, dann Industriekaufleute, dann die MAF-Schwerpunkte (SIN-479), dann der Rest.
 * Je Map zuerst neutrale Shared-Module (AP-20), dann Schwerpunkt-Module nach `order`.
 * Ein neutrales Shared-Modul steht nur in der ersten Map, die es hat; alle anderen
 * Maps nutzen es per Verknüpfung.
 */
export function buildQueue(
  curricula: Curriculum[],
  shared: readonly string[] = neutralSharedModuleIds(curricula.filter((c) => c.family === "maf")),
): QueueItem[] {
  const rank = (c: Curriculum) =>
    c.id === "maf-metall" ? 0 : c.id === "indkfl" ? 1 : c.family === "maf" ? 2 : 3;
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

/**
 * SIN-469: Darf die Fabrik jetzt laufen? Zählt Live-Läufe mit Kosten oder Ergebnis (ein Lauf, der
 * nach Sekunden an der API-Sperre endete, hinterlässt keinen Bericht und zählt nicht).
 * - höchstens ein Lauf je UTC-Tag
 * - Kosten der letzten 7 Tage unter `WEEK_CAP_EUR`
 * Beides ist ein sauberes Überspringen (Exit 0), kein Fehler.
 */
export function runAllowed(
  history: ReadonlyArray<Pick<RunReport, "mode" | "startedAt" | "costEur" | "generated">>,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  const live = history
    .filter((r) => r.mode === "live" && (r.costEur > 0 || r.generated > 0))
    .map((r) => ({ ...r, at: Date.parse(r.startedAt) }))
    .filter((r) => Number.isFinite(r.at));
  const today = now.toISOString().slice(0, 10);
  if (live.filter((r) => new Date(r.at).toISOString().slice(0, 10) === today).length >= MAX_RUNS_PER_DAY) {
    return { ok: false, reason: `heute (${today}) schon gelaufen: höchstens ${MAX_RUNS_PER_DAY} Lauf je Tag` };
  }
  const since = now.getTime() - 7 * 86_400_000;
  const week = live.filter((r) => r.at > since).reduce((s, r) => s + r.costEur, 0);
  if (week >= WEEK_CAP_EUR) {
    return { ok: false, reason: `Wochendeckel erreicht: ${week.toFixed(2)} € von ${WEEK_CAP_EUR} € in 7 Tagen` };
  }
  return { ok: true };
}

/** SIN-479: Bilanz je Map fürs Lauf-Protokoll: Ziel, vorhanden, geteilt, neu. */
export type MapBilanz = {
  mapId: string;
  /** Alle Einheiten der Map laut Curriculum. */
  ziel: number;
  /** In der Map selbst schon veröffentlicht. */
  vorhanden: number;
  /** Einheiten gemeinsamer Module, die ein anderer Kurs erzeugt und diese Map nur verknüpft. */
  geteilt: number;
  /** Noch zu erzeugen: weder veröffentlicht noch verworfen, ohne die geteilten Module. */
  neu: number;
};

export function mapBilanz(
  curricula: readonly Curriculum[],
  queue: readonly QueueItem[],
  published: ReadonlyMap<string, ReadonlySet<string>>,
  discarded: ReadonlyMap<string, ReadonlySet<string>>,
): MapBilanz[] {
  const none: ReadonlySet<string> = new Set();
  return curricula
    .filter((c) => SUPPORTED_MAP_IDS.includes(c.id))
    .map((c) => {
      const eigene = queue.filter((q) => q.mapId === c.id);
      const eigeneIds = new Set(eigene.map((q) => q.module.id));
      const pub = published.get(c.id) ?? none;
      const dis = discarded.get(c.id) ?? none;
      return {
        mapId: c.id,
        ziel: c.modules.reduce((s, m) => s + slotIds(m).length, 0),
        vorhanden: eigene.reduce((s, q) => s + slotIds(q.module).filter((id) => pub.has(id)).length, 0),
        geteilt: c.modules
          .filter((m) => !eigeneIds.has(m.id))
          .reduce((s, m) => s + slotIds(m).length, 0),
        neu: eigene.reduce((s, q) => s + pendingSlots(q.module, pub, dis).length, 0),
      };
    });
}

/**
 * SIN-431: Welche Map ein Lauf bedient. Abwechselnd je Lauf, damit Industriekaufleute nicht
 * erst nach allen Metall-Einheiten drankommt. Ein angefangenes Modul (`resumeModuleId`) läuft
 * zuerst weiter. Sonst kommt nach `lastMapId` die nächste Map mit offenen Einheiten
 * (Reihenfolge der Schlange); ohne letzten Lauf die erste.
 */
export function chooseRunMap(
  queue: QueueItem[],
  published: ReadonlyMap<string, ReadonlySet<string>>,
  discarded: ReadonlyMap<string, ReadonlySet<string>>,
  lastMapId?: string | null,
  resumeModuleId?: string | null,
): string | null {
  const none: ReadonlySet<string> = new Set();
  const order = [...new Set(queue.filter((q) => q.supported).map((q) => q.mapId))];
  const allOpen = order.filter((mapId) =>
    queue.some(
      (q) =>
        q.mapId === mapId &&
        q.supported &&
        pendingSlots(q.module, published.get(mapId) ?? none, discarded.get(mapId) ?? none).length > 0,
    ),
  );
  if (allOpen.length === 0) return null;
  // SIN-479: erst Metall und Industriekaufleute fertig, dann die Schwerpunkte (angefangene Module ausgenommen).
  const prioOpen = allOpen.filter((id) => PRIORITY_MAP_IDS.includes(id));
  const withOpen = prioOpen.length > 0 ? prioOpen : allOpen;
  // Modul-Kennungen können in zwei Maps vorkommen: die Map des letzten Laufs gilt zuerst.
  const resumeCandidates = resumeModuleId
    ? queue.filter((q) => allOpen.includes(q.mapId) && q.module.id === resumeModuleId)
    : [];
  const resumed = resumeCandidates.find((q) => q.mapId === lastMapId) ?? resumeCandidates[0];
  if (resumed) return resumed.mapId;
  // SIN-469: MAF Metall mit Modulen ohne veröffentlichte Einheit (z. B. LF3 bis LF6) kommt vor dem Wechsel.
  const metallPub = published.get("maf-metall") ?? none;
  const metallUntouched = queue.some(
    (q) =>
      q.mapId === "maf-metall" &&
      q.supported &&
      !slotIds(q.module).some((id) => metallPub.has(id)) &&
      pendingSlots(q.module, metallPub, discarded.get("maf-metall") ?? none).length > 0,
  );
  if (metallUntouched) return "maf-metall";
  const last = lastMapId ? order.indexOf(lastMapId) : -1;
  for (let i = 1; i <= order.length; i++) {
    const id = order[(last + i + order.length) % order.length]!;
    if (withOpen.includes(id)) return id;
  }
  return withOpen[0]!;
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

/**
 * SIN-406: Mehrere Module je Lauf. Das erste Modul wie bei `nextOpenItem` (Fortsetzung zuerst),
 * danach weitere unberührte Module in Queue-Reihenfolge, solange `maxUnits` reicht. Das letzte
 * Modul darf teilweise laufen; der Rest bleibt für den nächsten Lauf (`resumeModuleId`).
 * Der Deckel kommt nur über `maxUnits` (affordableUnits) herein, hier wird nichts gelockert.
 */
export function nextOpenItems(
  queue: QueueItem[],
  published: ReadonlySet<string>,
  discarded: ReadonlySet<string>,
  resumeModuleId: string | null | undefined,
  maxUnits: number,
): Array<{ item: QueueItem; pending: string[] }> {
  const first = nextOpenItem(queue, published, discarded, resumeModuleId);
  if (!first) return [];
  const out = [first];
  let units = first.pending.length;
  for (const item of queue) {
    if (units >= maxUnits) break;
    if (!item.supported || out.some((x) => x.item === item)) continue;
    if (slotIds(item.module).some((id) => published.has(id))) continue;
    const pending = pendingSlots(item.module, published, discarded);
    if (pending.length === 0) continue;
    out.push({ item, pending });
    units += pending.length;
  }
  return out;
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

/**
 * SIN-478: Kosten je Einheit für die Vorab-Rechnung. Ein Batch wird erst nach dem Absenden gemessen,
 * also plant die Fabrik mit dem teuersten bisherigen Lauf. Der Durchschnitt (`eurPerUnit`) reichte nicht:
 * Lauf 10-08 kostete 0,041 € je Einheit, Lauf 10-12 0,059 €; mit 0,041 geplant lief er auf 21,78 €.
 */
export function planEurPerUnit(history: ReadonlyArray<{ costEur: number; unitsGenerated: number }>): number {
  const perRun = history
    .filter((r) => r.unitsGenerated > 0 && r.costEur > 0)
    .map((r) => r.costEur / r.unitsGenerated);
  return perRun.length > 0 ? Math.max(...perRun) : OLD_REGEN_EUR_PER_UNIT;
}

/**
 * SIN-478: Richter-Kosten für `units` Einheiten vor dem Richter-Aufruf (OpenAI). Gleiche Annahme wie
 * `phaseAPreflightUsd`: 6 Fragen je Einheit, 1200 Eingabe- und 200 Ausgabe-Token je Frage, plus Sicherheitsfaktor.
 */
export function judgeReserveEur(units: number, questionsPerUnit = 6): number {
  const q = units * questionsPerUnit;
  const usd = ((q * 1200) / 1e6) * GPT_JUDGE_IN_PER_MTOK + ((q * 200) / 1e6) * GPT_JUDGE_OUT_PER_MTOK;
  return Math.round(usd * EUR_PER_USD * COST_MARGIN * 100) / 100;
}

/**
 * SIN-434: Historie für `eurPerUnit` ohne Reparaturkosten. Die Reparatur (AP-21) steht im Bericht
 * als eigener Posten und wird in der Planung schon als `spentEur` abgezogen; wer sie auch in die
 * Kosten je Einheit rechnet, zählt sie doppelt und plant zu wenige Einheiten (Lauf 10-08: 2,43 €
 * gesamt, davon 1,62 € Reparatur, also 0,04 statt 0,12 € je Einheit).
 */
export function unitCostHistory(
  reports: ReadonlyArray<{ costEur: number; generated: number; repair?: { costEur: number } }>,
): Array<{ costEur: number; unitsGenerated: number }> {
  return reports
    .filter((r) => r.generated > 0)
    .map((r) => ({
      costEur: Math.max(0, r.costEur - (r.repair?.costEur ?? 0)),
      unitsGenerated: r.generated,
    }));
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

export type NichtVersuchtGrund = "kostendeckel" | "zeitlimit" | "begonnene-module" | "andere-map";
export type NichtVersucht = { grund: NichtVersuchtGrund; units: number };

/**
 * SIN-434: Offene Einheiten, die dieser Lauf nicht versucht hat, nach Grund.
 * - `begonnene-module`: Lücken in Modulen mit veröffentlichten Einheiten; die holt nur die Reparatur.
 * - `kostendeckel`: unberührte Module hinter dem Plan (er endet bei `affordableUnits`) und das,
 *   was `trimTargets` abgeschnitten hat (`deferred`).
 * - `zeitlimit`: der Batch wurde nicht rechtzeitig fertig; `deferred` zählt dann hierher.
 * - `andere-map`: offene Einheiten der Maps, die dieser Lauf nicht bedient (ein Lauf = eine Map).
 * Eine Batch-Obergrenze gibt es im Code nicht (Anthropic: bis 100.000 Anfragen), daher kein eigener Grund.
 */
export function nichtVersucht(
  queue: QueueItem[],
  published: ReadonlySet<string>,
  discarded: ReadonlySet<string>,
  planModuleIds: ReadonlySet<string>,
  deferred: number,
  timedOut: boolean,
  otherMapOpen = 0,
): NichtVersucht[] {
  let begonnen = 0;
  let hinterPlan = 0;
  for (const item of queue) {
    if (!item.supported || planModuleIds.has(item.module.id)) continue;
    const pending = pendingSlots(item.module, published, discarded).length;
    if (slotIds(item.module).some((id) => published.has(id))) begonnen += pending;
    else hinterPlan += pending;
  }
  return [
    { grund: "kostendeckel" as const, units: hinterPlan + (timedOut ? 0 : deferred) },
    { grund: "zeitlimit" as const, units: timedOut ? deferred : 0 },
    { grund: "begonnene-module" as const, units: begonnen },
    { grund: "andere-map" as const, units: otherMapOpen },
  ].filter((x) => x.units > 0);
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
  /** SIN-406: alle Module dieses Laufs (moduleId = erstes). */
  moduleIds?: string[];
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
  /** SIN-434: offene Einheiten, die dieser Lauf nicht versucht hat, nach Grund. */
  nichtVersucht?: NichtVersucht[];
  /** SIN-479: Einheiten je Map (Ziel, vorhanden, geteilt, neu) zu Beginn des Laufs. */
  maps?: MapBilanz[];
  /** SIN-473: Fragen erzeugt, ungültig (Schema), repariert, verworfen. */
  schema?: SchemaStats;
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

const NICHT_VERSUCHT_TEXT: Record<NichtVersuchtGrund, string> = {
  kostendeckel: "Kostendeckel",
  zeitlimit: "Zeitlimit",
  "begonnene-module": "begonnenem Modul (Reparatur zuständig)",
  "andere-map": "anderer Map in diesem Lauf",
};

/** Kommentar fürs Linear-Projekt: erzeugt, bestanden, verworfen, Kosten, nächstes Modul. */
export function linearSummary(r: RunReport): string {
  const next = r.nextModuleId ?? "keins (Queue leer oder nicht unterstützt)";
  return [
    `**Content-Lauf ${r.runId}** (${r.mode})`,
    `- Modul: ${r.mapId ?? "–"} / ${r.moduleIds?.length ? r.moduleIds.join(", ") : (r.moduleId ?? "–")}`,
    `- Erzeugt: ${r.generated}, bestanden: ${r.passed}, verworfen: ${r.discarded}, zurückgestellt: ${r.deferred}`,
    `- Verworfen (Richter unter Schwelle oder nicht geliefert): ${r.discarded}${r.discardedUnitIds.length ? ` (${r.discardedUnitIds.join(", ")})` : ""}`,
    ...(r.maps?.length
      ? [
          "- Einheiten je Map (Ziel / vorhanden / geteilt / neu):",
          ...r.maps.map((m) => `  - ${m.mapId}: ${m.ziel} / ${m.vorhanden} / ${m.geteilt} / ${m.neu}`),
        ]
      : []),
    `- Frageschema (SIN-473): ${r.schema ? formatSchemaStats(r.schema) : "nicht erfasst"}`,
    `- Nicht versucht: ${r.nichtVersucht?.length ? r.nichtVersucht.map((x) => `${x.units} wegen ${NICHT_VERSUCHT_TEXT[x.grund]}`).join("; ") : "nichts offen oder nicht erfasst"}`,
    `- Reparatur (AP-21): ${r.repair.ran ? `€${r.repair.costEur.toFixed(2)}` : "nicht gelaufen"}; Quellen-Neuerzeugung: ${r.sourceRefresh.replaced}/${r.sourceRefresh.units}`,
    `- Kosten: €${r.costEur.toFixed(2)} von €${r.capEur} (Modell ${r.model})`,
    `- Stopp: ${r.stopReason ?? "kein"}`,
    `- Nächstes Modul: ${next}`,
  ].join("\n");
}
