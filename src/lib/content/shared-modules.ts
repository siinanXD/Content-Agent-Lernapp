import { createHash } from "node:crypto";
import {
  listCurriculumFiles,
  loadCurriculum,
  type Curriculum,
  type CurriculumModule,
} from "./curriculum";

/**
 * AP-20: Modul-Bibliothek. Gemeinsame MAF-Module werden einmal erzeugt und per
 * Verknüpfung (`course_shared_modules`) in jedem Schwerpunkt-Kurs gezeigt.
 * Kein Kopieren von Einheiten oder Fragen.
 */

/**
 * Kandidaten: Module-IDs, die in allen 7 MAF-Maps vorkommen. Geteilt wird nur, was
 * `checkSharedModule` als neutral einstuft (identisch, keine Schwerpunkt-Begriffe).
 * Befund siehe DECISIONS.md D-40: M0 neutral, PA je Schwerpunkt verschieden.
 */
export const SHARED_MODULE_CANDIDATES = [
  "M0",
  "ZP",
  "PA",
  "QS",
  "WISO",
  "SBP",
  "APPT",
  "APPP",
] as const;

/** Schlüssel in `shared_modules.key`, z. B. `maf:M0`. */
export function sharedModuleKey(family: string, moduleId: string): string {
  return `${family}:${moduleId}`;
}

/** Begriffe, die auf einen einzelnen Schwerpunkt hinweisen (Metall, Kunststoff, ...). */
const SCHWERPUNKT_TERMS =
  /\b(metall\w*|kunststoff\w*|kautschuk\w*|lebensmittel\w*|packmittel\w*|textil\w*|druckverarbeitung\w*|industriemechaniker\w*)\b/i;

/** Stabiler Fingerabdruck eines Moduls (Titel, Blöcke, Themen, Quellen, Fragenmix). */
export function moduleFingerprint(m: CurriculumModule): string {
  const { order: _order, ...rest } = m;
  void _order;
  return createHash("sha256").update(JSON.stringify(rest)).digest("hex").slice(0, 16);
}

/** Alle Textstellen eines Moduls, die in Prompts und Lerntexte einfließen. */
function moduleTexts(m: CurriculumModule): string[] {
  return [
    m.title,
    m.note ?? "",
    ...m.blocks.flatMap((b) => [b.title, ...b.topics]),
  ];
}

export type SharedModuleCheck = {
  moduleId: string;
  /** Gleicher Fingerabdruck in allen verglichenen Maps. */
  identical: boolean;
  /** Treffer von Schwerpunkt-Begriffen (Text → Begriff). */
  termHits: Array<{ text: string; term: string }>;
  /** Neutral = identisch und keine Schwerpunkt-Begriffe. Nur neutrale werden geteilt. */
  neutral: boolean;
};

export function checkSharedModule(
  moduleId: string,
  curricula: Curriculum[],
): SharedModuleCheck {
  const mods = curricula.map((c) => c.modules.find((m) => m.id === moduleId));
  if (mods.some((m) => !m)) {
    return { moduleId, identical: false, termHits: [], neutral: false };
  }
  const present = mods as CurriculumModule[];
  const prints = new Set(present.map(moduleFingerprint));
  const termHits: SharedModuleCheck["termHits"] = [];
  for (const text of moduleTexts(present[0])) {
    const hit = text.match(SCHWERPUNKT_TERMS);
    if (hit) termHits.push({ text, term: hit[0] });
  }
  const identical = prints.size === 1;
  return { moduleId, identical, termHits, neutral: identical && termHits.length === 0 };
}

/** Die 7 MAF-Maps (family `maf`). */
export function loadMafCurricula(): Curriculum[] {
  return listCurriculumFiles()
    .map(loadCurriculum)
    .filter((c) => c.family === "maf");
}

/** Module-IDs, die geteilt werden dürfen (identisch + neutral). */
export function neutralSharedModuleIds(curricula: Curriculum[] = loadMafCurricula()): string[] {
  return SHARED_MODULE_CANDIDATES.filter((id) => checkSharedModule(id, curricula).neutral);
}

/**
 * Generator-Filter: Module, die schon veröffentlicht sind, werden nicht neu erzeugt.
 * `published` = Modul-IDs mit veröffentlichten Einheiten (aus `shared_modules`/Kurs).
 */
export function modulesToGenerate<T extends { id: string }>(
  modules: T[],
  published: ReadonlySet<string>,
  shared: readonly string[] = neutralSharedModuleIds(),
): { generate: T[]; skipped: T[] } {
  const generate: T[] = [];
  const skipped: T[] = [];
  for (const m of modules) {
    if (shared.includes(m.id) && published.has(m.id)) skipped.push(m);
    else generate.push(m);
  }
  return { generate, skipped };
}
