import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import type { Curriculum } from "@/lib/content/curriculum";

/**
 * SIN-272: reproduzierbare Stichprobe sicherheitsrelevanter, veröffentlichter Einheiten
 * und Prüfung von Quelle und Abrufdatum. Reine Logik; Laden und Schreiben im Skript
 * scripts/safety-sample.mjs. Die KI bewertet nichts: der Bericht listet nur Fakten,
 * die Bestätigung setzt ein Mensch.
 */

export type SampleUnit = Pick<
  GeneratedUnit,
  "id" | "title" | "sourceUrl" | "sourceFetchedAt" | "moduleId" | "blockId" | "safetyFlag"
>;

const SAFETY_WORDS =
  /arbeitsschutz|arbeitssicherheit|unfall|gefahrstoff|gefährdung|schutzeinrichtung|schutzausrüstung|\bpsa\b|sicherheit|maschinensicherheit|not-?halt|brandschutz|lockout|freischalt|erste hilfe/i;

/** Sicherheitsrelevant: Flag der Einheit, Sicherheits-Block/-Modul der Lehrplan-Karte oder Stichwort im Titel. */
export function isSafetyUnit(unit: SampleUnit, curriculum?: Curriculum): boolean {
  if (unit.safetyFlag) return true;
  const mod = curriculum?.modules.find((m) => m.id === unit.moduleId);
  const block = mod?.blocks.find((b) => b.id === unit.blockId);
  if (block?.safety) return true;
  return SAFETY_WORDS.test(unit.title);
}

/** mulberry32: kleiner, deterministischer Zufallsgenerator. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zieht n Einheiten ohne Zurücklegen; gleiche Eingabe und gleicher Seed ergeben dieselbe Liste. */
export function drawSample<T extends { id: string }>(units: T[], n: number, seed: number): T[] {
  const pool = [...units].sort((a, b) => a.id.localeCompare(b.id, "de"));
  const rnd = seededRandom(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

export type SourceProblem =
  | "quelle-fehlt"
  | "quelle-keine-url"
  | "abrufdatum-fehlt"
  | "abrufdatum-ungueltig"
  | "abrufdatum-in-zukunft"
  | "quelle-nicht-in-lehrplan";

export type UnitCheck = {
  unitId: string;
  title: string;
  moduleId?: string;
  blockId?: string;
  sourceUrl: string;
  sourceFetchedAt: string;
  /** Quelle steht in der Quellenliste einer Lehrplan-Karte (amtlich: Ausbildungsordnung/Rahmenlehrplan). */
  officialSourceKind: string | null;
  problems: SourceProblem[];
};

function normalizeUrl(u: string): string {
  return u.trim().replace(/#.*$/, "").replace(/\/$/, "");
}

/** Prüft Quelle und Abrufdatum einer Einheit gegen die Quellen der Lehrplan-Karten. */
export function checkUnitSource(
  unit: SampleUnit,
  curricula: Curriculum[],
  today: string,
): UnitCheck {
  const sourceUrl = (unit.sourceUrl ?? "").trim();
  const sourceFetchedAt = (unit.sourceFetchedAt ?? "").trim();
  const problems: SourceProblem[] = [];
  let officialSourceKind: string | null = null;

  if (!sourceUrl) problems.push("quelle-fehlt");
  else {
    try {
      const u = new URL(sourceUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") problems.push("quelle-keine-url");
    } catch {
      problems.push("quelle-keine-url");
    }
    const wanted = normalizeUrl(sourceUrl);
    for (const c of curricula) {
      const hit = c.sources.find((s) => normalizeUrl(s.url) === wanted);
      if (hit) {
        officialSourceKind = hit.kind;
        break;
      }
    }
    if (!officialSourceKind && !problems.includes("quelle-keine-url")) {
      problems.push("quelle-nicht-in-lehrplan");
    }
  }

  const day = sourceFetchedAt.slice(0, 10);
  if (!sourceFetchedAt) problems.push("abrufdatum-fehlt");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) {
    problems.push("abrufdatum-ungueltig");
  } else if (day > today) problems.push("abrufdatum-in-zukunft");

  return {
    unitId: unit.id,
    title: unit.title,
    moduleId: unit.moduleId,
    blockId: unit.blockId,
    sourceUrl,
    sourceFetchedAt,
    officialSourceKind,
    problems,
  };
}

export type SafetySampleResult = {
  seed: number;
  requested: number;
  publishedUnits: number;
  safetyUnits: number;
  checks: UnitCheck[];
};

export function buildSafetySample(
  units: SampleUnit[],
  curricula: Curriculum[],
  opts: { seed: number; size: number; today: string },
): SafetySampleResult {
  const mafMetall = curricula.find((c) => c.id === "maf-metall");
  const safety = units.filter((u) => isSafetyUnit(u, mafMetall));
  const sample = drawSample(safety, opts.size, opts.seed);
  return {
    seed: opts.seed,
    requested: opts.size,
    publishedUnits: units.length,
    safetyUnits: safety.length,
    checks: sample.map((u) => checkUnitSource(u, curricula, opts.today)),
  };
}

/** Nur Anzahlen für den Lauf-Bericht (SIN-404): keine Einheiten-Inhalte, keine Personendaten. */
export function sampleCounts(r: SafetySampleResult) {
  return {
    seed: r.seed,
    angefragt: r.requested,
    veroeffentlicht: r.publishedUnits,
    sicherheitsrelevant: r.safetyUnits,
    gezogen: r.checks.length,
    befunde: r.checks.filter((c) => c.problems.length > 0).length,
  };
}

const PROBLEM_TEXT: Record<SourceProblem, string> = {
  "quelle-fehlt": "Quelle fehlt",
  "quelle-keine-url": "Quelle ist keine URL",
  "abrufdatum-fehlt": "Abrufdatum fehlt",
  "abrufdatum-ungueltig": "Abrufdatum ungültig",
  "abrufdatum-in-zukunft": "Abrufdatum liegt in der Zukunft",
  "quelle-nicht-in-lehrplan": "Quelle steht nicht in der Quellenliste der Lehrplan-Karte",
};

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** Markdown-Bericht. Spalte „Mensch“ bleibt leer, bis eine Person geprüft hat. */
export function renderReport(r: SafetySampleResult, meta: { date: string; source: string }): string {
  const missing = r.checks.filter((c) => c.problems.length > 0);
  const lines: string[] = [
    "# Sicherheits-Stichprobe MAF Metall (SIN-272)",
    "",
    "Erzeugt mit `node --import tsx scripts/safety-sample.mjs`. Das Skript prüft nur, ob Quelle und Abrufdatum vorhanden und plausibel sind und ob die Quelle in der Quellenliste der Lehrplan-Karte steht. **Es bewertet nicht, ob der Inhalt fachlich stimmt.** Das macht ein Mensch (Spalte „Mensch“).",
    "",
    `- Datum: ${meta.date}`,
    `- Seed: ${r.seed}`,
    `- Stichprobengröße: ${r.checks.length} (angefragt ${r.requested})`,
    `- Veröffentlichte Einheiten: ${r.publishedUnits}, davon sicherheitsrelevant: ${r.safetyUnits}`,
    `- Datenquelle: ${meta.source}`,
    `- Reproduzieren: gleiche Einheiten und gleicher Seed ergeben dieselbe Liste.`,
    "",
    "## Ergebnis je Einheit",
    "",
    "| Einheit | Titel | Modul | Quelle | Abruf | Befund | Mensch |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...r.checks.map(
      (c) =>
        `| ${cell(c.unitId)} | ${cell(c.title)} | ${cell(c.moduleId ?? "–")} | ${cell(c.sourceUrl || "–")}${c.officialSourceKind ? ` (${c.officialSourceKind})` : ""} | ${cell(c.sourceFetchedAt || "–")} | ${c.problems.length ? c.problems.map((p) => PROBLEM_TEXT[p]).join("; ") : "Quelle und Abrufdatum vorhanden"} | offen |`,
    ),
    "",
    "## Fehlende oder auffällige Angaben",
    "",
    ...(missing.length
      ? missing.map((c) => `- ${c.unitId}: ${c.problems.map((p) => PROBLEM_TEXT[p]).join("; ")}`)
      : r.checks.length
        ? ["Keine."]
        : ["Keine Einheiten in der Stichprobe. Der Bericht ist damit kein Beleg."]),
    "",
    "## Bestätigung durch einen Menschen",
    "",
    "Offen. Die Prüfperson gleicht jede Einheit mit der amtlichen Quelle (Ausbildungsordnung, Rahmenlehrplan) ab, trägt Name, Datum und Ergebnis hier ein und setzt danach `content-safety` in `docs/product-readiness.json` mit Datum und Beleg auf diesen Bericht.",
    "",
  ];
  return lines.join("\n");
}
