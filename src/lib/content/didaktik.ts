import type { Curriculum, CurriculumBlock, CurriculumModule, ExamPart, QuestionType } from "./curriculum";

/**
 * AP-18 didactics contract (docs/content/DIDAKTIK.md, D-31): the shape of a learning
 * unit in the three modes Lernen / Üben / Prüfen, the limits every generated unit must
 * respect, the Leitner repetition schedule and the exam-set builder. Pure functions,
 * no I/O, so the generate agent (AP-14) and the UI can share one source of truth.
 */

export type UnitVariant = "standard" | "ablauf" | "rechnen" | "sicherheit";
export type QuestionLevel = "erinnern" | "verstehen" | "anwenden";
export type ImageKind = "flow" | "schema" | "sign" | "sketch" | "chart";

export type UnitSections = {
  /** One sentence, practice-related, addressing the learner directly. */
  einstieg: string;
  /** Core explanation, at most LIMITS.kernWords words, plain language. */
  kern: string;
  /** One concrete case from the Betrieb, at most LIMITS.beispielWords words. */
  beispiel: string;
  /** One sentence, at most LIMITS.merksatzWords words. */
  merksatz: string;
};

export type UnitImage = {
  src: string;
  /** At most LIMITS.altChars characters. */
  alt: string;
  /** Required for schema and sketch (DIDAKTIK.md §7). */
  longDescription?: string;
  kind: ImageKind;
  source: { url: string; license: string; attribution?: string };
  /** e.g. the Mermaid text a flow diagram was rendered from. */
  generatedFrom?: string;
};

export type DidaktikQuestion = {
  id: string;
  type: QuestionType;
  level: QuestionLevel;
  prompt: string;
  /** auswahl: exactly 4 options, exactly one of them equals `correct`. */
  choices?: string[];
  /** zuordnen: 3–5 pairs [Begriff, Erklärung]. */
  pairs?: Array<[string, string]>;
  /** reihenfolge: 4–6 steps; `correct` is the ordered list. */
  steps?: string[];
  /** lueckentext: the Wortliste offered (correct fills plus 1–2 Ablenker); `correct` lists the fills in order. */
  blanks?: string[];
  correct: string | string[];
  /** At most LIMITS.explanationWords words, cites the source. */
  explanation: string;
  sourceUrl: string;
  image?: UnitImage;
  /** Exam area ids from the module (e.g. "PT-a"); never empty. */
  examAreas: string[];
};

export type DidaktikUnit = {
  id: string;
  title: string;
  minutes: number;
  moduleId: string;
  blockId: string;
  variant: UnitVariant;
  sections: UnitSections;
  /** Fallback summary of `sections` for v1 consumers (today's Einheit page). */
  explanation: string;
  /** Shorter version for the "Einfache Sprache" switch. */
  explanationSimple?: string;
  image?: UnitImage;
  questions: DidaktikQuestion[];
  sourceUrl: string;
  sourceFetchedAt: string;
  /** Required true for variant "sicherheit" (10 % human sample before publish). */
  safetyFlag?: boolean;
};

export type ReviewStage = 1 | 2 | 3 | 4;
export type ReviewItem = { questionId: string; stage: ReviewStage; dueAt: string };

export type ExamSet = {
  id: string;
  mapId: string;
  partId: string;
  durationMinutes: number;
  questionIds: string[];
  /** Set by buildExamSet(): how many questions the set should have; `questionIds` may be shorter when the pool is too small. */
  targetCount?: number;
  /** Set by buildExamSet(): questions per Gebiet. */
  byArea?: Record<string, number>;
};

export type Ampel = "gruen" | "gelb" | "rot";

export type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] };

export const LIMITS = {
  einstiegSentences: 1,
  kernWords: 120,
  beispielWords: 60,
  merksatzWords: 15,
  explanationWords: 60,
  altChars: 125,
  questionsMin: 5,
  questionsMax: 8,
  minutesMin: 5,
  minutesMax: 10,
  ablaufStepsMin: 3,
  ablaufStepsMax: 7,
} as const;

/** Anchor mix for seven questions; levelMixFor() scales it to 5–8. */
export const LEVEL_MIX: Record<QuestionLevel, number> = { erinnern: 2, verstehen: 3, anwenden: 2 };
export const LEVEL_ORDER: QuestionLevel[] = ["erinnern", "verstehen", "anwenden"];

export const TYPE_RULES = {
  auswahl: { choices: 4 },
  zuordnen: { pairsMin: 3, pairsMax: 5 },
  lueckentext: { blanksMin: 1, blanksMax: 2, ablenkerMin: 1, ablenkerMax: 2 },
  reihenfolge: { stepsMin: 4, stepsMax: 6 },
} as const;

/** Leitner intervals in days for stages 1–4; a correct answer on stage 4 retires the item. */
export const LEITNER_DAYS: readonly number[] = [1, 3, 7, 14];
export const REVIEWS_PER_DAY_MAX = 10;
export const AMPEL = { gruen: 80, gelb: 60 } as const;
export const EXAM_MINUTES_PER_QUESTION = 4;
export const EXAM_RECENT_DAYS = 7;

const ABLAUF_PATTERN = /\b(planen|durchführen|in Betrieb nehmen|anfahren|abfahren|Ablauf|Schritte|Inbetriebnahme|Rüstvorgang|Vorgehen)\b/i;
const IHK_LEAK = /\bIHK[- ]?(Prüfung|Prüfungs|Aufgabe|Abschlussprüfung|Zwischenprüfung)/i;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Counts sentence ends: ". ! ?" followed by whitespace and an uppercase letter or the end of the text. */
export function sentenceCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const ends = t.match(/[.!?]+(?=\s+[A-ZÄÖÜ„"(]|\s*$)/g) ?? [];
  return Math.max(1, ends.length);
}

/** Variant from the block flags: safety first, then rechnen, then an Ablauf wording, else standard. */
export function deriveVariant(block: Pick<CurriculumBlock, "title" | "topics" | "rechnen" | "safety">): UnitVariant {
  if (block.safety) return "sicherheit";
  if (block.rechnen) return "rechnen";
  if (ABLAUF_PATTERN.test(`${block.title} ${block.topics.join(" ")}`)) return "ablauf";
  return "standard";
}

/** Scale the 2/3/2 anchor to n questions (5–8); every level keeps at least one question. */
export function levelMixFor(n: number): Record<QuestionLevel, number> {
  const count = Math.min(LIMITS.questionsMax, Math.max(LIMITS.questionsMin, Math.round(n)));
  const outer = Math.max(1, Math.round((count * LEVEL_MIX.erinnern) / 7));
  return { erinnern: outer, verstehen: count - 2 * outer, anwenden: outer };
}

function numberedSteps(text: string): number {
  return (text.match(/(^|\n)\s*\d+[.)]\s+\S/g) ?? []).length;
}

function isHttps(url: string | undefined): boolean {
  return typeof url === "string" && /^https:\/\/\S+$/.test(url);
}

function checkImage(img: UnitImage, where: string, errors: string[]): void {
  if (!img.src?.trim()) errors.push(`${where}: image.src fehlt`);
  if (!img.alt?.trim()) errors.push(`${where}: image.alt fehlt`);
  else if (img.alt.length > LIMITS.altChars) errors.push(`${where}: image.alt länger als ${LIMITS.altChars} Zeichen`);
  if (!img.source?.license?.trim()) errors.push(`${where}: image.source.license fehlt`);
  if (!img.source?.url?.trim()) errors.push(`${where}: image.source.url fehlt`);
  if ((img.kind === "schema" || img.kind === "sketch") && !img.longDescription?.trim()) {
    errors.push(`${where}: image.longDescription ist bei ${img.kind} Pflicht`);
  }
}

function checkQuestion(q: DidaktikQuestion, idx: number, ctx: ValidateContext, errors: string[]): void {
  const where = `Frage ${idx + 1} (${q.id ?? "ohne id"})`;
  if (!q.id?.trim()) errors.push(`${where}: id fehlt`);
  if (!LEVEL_ORDER.includes(q.level)) errors.push(`${where}: level fehlt oder ungültig`);
  if (!q.prompt?.trim()) errors.push(`${where}: prompt fehlt`);
  if (!q.explanation?.trim()) errors.push(`${where}: explanation fehlt`);
  else if (wordCount(q.explanation) > LIMITS.explanationWords) {
    errors.push(`${where}: explanation länger als ${LIMITS.explanationWords} Wörter`);
  }
  if (!isHttps(q.sourceUrl)) errors.push(`${where}: sourceUrl muss https sein`);
  else if (ctx.curriculum && !ctx.curriculum.sources.some((s) => s.url === q.sourceUrl)) {
    errors.push(`${where}: sourceUrl ist keine Quelle der Map`);
  }
  if (IHK_LEAK.test(`${q.prompt} ${q.explanation}`)) errors.push(`${where}: Bezug auf IHK-Prüfungsaufgaben ist verboten`);
  if (!Array.isArray(q.examAreas) || q.examAreas.length === 0) errors.push(`${where}: examAreas fehlt`);
  else if (ctx.module) {
    for (const a of q.examAreas) {
      if (!ctx.module.examAreas.includes(a)) errors.push(`${where}: examArea ${a} gehört nicht zum Modul ${ctx.module.id}`);
    }
  }
  if (q.image) checkImage(q.image, where, errors);

  const correctList = Array.isArray(q.correct) ? q.correct : [q.correct];
  switch (q.type) {
    case "auswahl": {
      const n = q.choices?.length ?? 0;
      if (n !== TYPE_RULES.auswahl.choices) errors.push(`${where}: auswahl braucht genau ${TYPE_RULES.auswahl.choices} Optionen`);
      if (typeof q.correct !== "string" || !q.choices?.includes(q.correct)) {
        errors.push(`${where}: auswahl braucht genau eine richtige Option aus choices`);
      }
      if (q.choices?.some((c) => /\b(alle|keine) der (genannten|oben)/i.test(c))) {
        errors.push(`${where}: Optionen "alle/keine der genannten" sind nicht erlaubt`);
      }
      break;
    }
    case "zuordnen": {
      const n = q.pairs?.length ?? 0;
      if (n < TYPE_RULES.zuordnen.pairsMin || n > TYPE_RULES.zuordnen.pairsMax) {
        errors.push(`${where}: zuordnen braucht ${TYPE_RULES.zuordnen.pairsMin}–${TYPE_RULES.zuordnen.pairsMax} Paare`);
      }
      if (q.pairs?.some((p) => !p[0]?.trim() || !p[1]?.trim())) errors.push(`${where}: leeres Paar`);
      break;
    }
    case "lueckentext": {
      const fills = correctList.length;
      const list = q.blanks?.length ?? 0;
      if (fills < TYPE_RULES.lueckentext.blanksMin || fills > TYPE_RULES.lueckentext.blanksMax) {
        errors.push(`${where}: lueckentext braucht ${TYPE_RULES.lueckentext.blanksMin}–${TYPE_RULES.lueckentext.blanksMax} Lücken (correct)`);
      }
      const ablenker = list - fills;
      if (ablenker < TYPE_RULES.lueckentext.ablenkerMin || ablenker > TYPE_RULES.lueckentext.ablenkerMax) {
        errors.push(`${where}: Wortliste (blanks) braucht ${TYPE_RULES.lueckentext.ablenkerMin}–${TYPE_RULES.lueckentext.ablenkerMax} Ablenker zusätzlich zu den Lösungen`);
      }
      if (!correctList.every((c) => q.blanks?.includes(c))) errors.push(`${where}: jede Lösung muss in der Wortliste stehen`);
      break;
    }
    case "reihenfolge": {
      const n = q.steps?.length ?? 0;
      if (n < TYPE_RULES.reihenfolge.stepsMin || n > TYPE_RULES.reihenfolge.stepsMax) {
        errors.push(`${where}: reihenfolge braucht ${TYPE_RULES.reihenfolge.stepsMin}–${TYPE_RULES.reihenfolge.stepsMax} Schritte`);
      }
      const sameSet = n === correctList.length && [...correctList].sort().join("\u0000") === [...(q.steps ?? [])].sort().join("\u0000");
      if (!sameSet) errors.push(`${where}: correct muss genau die Schritte in richtiger Reihenfolge enthalten`);
      break;
    }
    case "rechnen": {
      if (!/\d/.test(correctList.join(" "))) errors.push(`${where}: rechnen braucht ein Zahlenergebnis in correct`);
      if (!/\d/.test(q.explanation ?? "")) errors.push(`${where}: rechnen braucht den Rechenweg mit Zahlen in explanation`);
      break;
    }
    default:
      errors.push(`${where}: unbekannter Fragetyp ${String(q.type)}`);
  }
}

export type ValidateContext = {
  curriculum?: Curriculum;
  module?: CurriculumModule;
  block?: CurriculumBlock;
};

/** Check a unit against DIDAKTIK.md §3, §4 and §7. Errors block publish; warnings are hints. */
export function validateUnit(unit: DidaktikUnit, ctx: ValidateContext = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!unit.id?.trim()) errors.push("id fehlt");
  if (!unit.title?.trim()) errors.push("title fehlt");
  if (!(unit.minutes >= LIMITS.minutesMin && unit.minutes <= LIMITS.minutesMax)) {
    errors.push(`minutes muss zwischen ${LIMITS.minutesMin} und ${LIMITS.minutesMax} liegen`);
  }
  if (!unit.moduleId?.trim()) errors.push("moduleId fehlt");
  if (!unit.blockId?.trim()) errors.push("blockId fehlt");
  if (ctx.module && unit.moduleId !== ctx.module.id) errors.push(`moduleId ${unit.moduleId} passt nicht zu ${ctx.module.id}`);
  if (ctx.block && unit.blockId !== ctx.block.id) errors.push(`blockId ${unit.blockId} passt nicht zu ${ctx.block.id}`);
  if (!unit.explanation?.trim()) errors.push("explanation (Fallback) fehlt");
  if (!isHttps(unit.sourceUrl)) errors.push("sourceUrl muss https sein");
  if (!unit.sourceFetchedAt || Number.isNaN(Date.parse(unit.sourceFetchedAt))) errors.push("sourceFetchedAt fehlt oder ist kein Datum");
  if (ctx.curriculum && ctx.block) {
    const allowed = ctx.block.sourceIds
      .map((id) => ctx.curriculum!.sources.find((s) => s.id === id)?.url)
      .filter((u): u is string => Boolean(u));
    if (!allowed.includes(unit.sourceUrl)) errors.push("sourceUrl ist keine Quelle des Blocks");
  }

  const s = unit.sections;
  if (!s) {
    errors.push("sections fehlen");
  } else {
    for (const key of ["einstieg", "kern", "beispiel", "merksatz"] as const) {
      if (!s[key]?.trim()) errors.push(`sections.${key} fehlt`);
    }
    if (s.einstieg && sentenceCount(s.einstieg) > LIMITS.einstiegSentences) errors.push("sections.einstieg hat mehr als einen Satz");
    if (s.kern && wordCount(s.kern) > LIMITS.kernWords) errors.push(`sections.kern länger als ${LIMITS.kernWords} Wörter`);
    if (s.beispiel && wordCount(s.beispiel) > LIMITS.beispielWords) errors.push(`sections.beispiel länger als ${LIMITS.beispielWords} Wörter`);
    if (s.merksatz && wordCount(s.merksatz) > LIMITS.merksatzWords) errors.push(`sections.merksatz länger als ${LIMITS.merksatzWords} Wörter`);
    if (s.merksatz && sentenceCount(s.merksatz) > 1) errors.push("sections.merksatz hat mehr als einen Satz");
    if (IHK_LEAK.test(Object.values(s).join(" "))) errors.push("Bezug auf IHK-Prüfungsaufgaben ist verboten");
  }

  const variants: UnitVariant[] = ["standard", "ablauf", "rechnen", "sicherheit"];
  if (!variants.includes(unit.variant)) errors.push("variant fehlt oder ungültig");
  if (ctx.block) {
    const derived = deriveVariant(ctx.block);
    if ((derived === "sicherheit" || derived === "rechnen") && unit.variant !== derived) {
      errors.push(`Block ${ctx.block.id} verlangt variant ${derived}`);
    }
  }
  if (unit.variant === "sicherheit" && unit.safetyFlag !== true) errors.push("variant sicherheit verlangt safetyFlag = true");
  if (unit.variant === "rechnen" && !unit.questions?.some((q) => q.type === "rechnen")) {
    errors.push("variant rechnen verlangt mindestens eine Rechenfrage");
  }
  if (unit.variant === "ablauf" && s?.kern) {
    const n = numberedSteps(s.kern);
    if (n < LIMITS.ablaufStepsMin || n > LIMITS.ablaufStepsMax) {
      errors.push(`variant ablauf verlangt ${LIMITS.ablaufStepsMin}–${LIMITS.ablaufStepsMax} nummerierte Schritte im kern`);
    }
    if (!unit.image) warnings.push("variant ablauf: Flussdiagramm empfohlen (DIDAKTIK.md §7)");
  }
  if (unit.image) checkImage(unit.image, "Einheit", errors);

  const qs = unit.questions ?? [];
  if (qs.length < LIMITS.questionsMin || qs.length > LIMITS.questionsMax) {
    errors.push(`${LIMITS.questionsMin}–${LIMITS.questionsMax} Fragen nötig, ${qs.length} vorhanden`);
  }
  const ids = new Set<string>();
  qs.forEach((q, i) => {
    if (ids.has(q.id)) errors.push(`Frage ${i + 1}: id ${q.id} doppelt`);
    ids.add(q.id);
    checkQuestion(q, i, ctx, errors);
  });
  if (qs.length >= LIMITS.questionsMin && qs.length <= LIMITS.questionsMax) {
    const want = levelMixFor(qs.length);
    for (const level of LEVEL_ORDER) {
      const have = qs.filter((q) => q.level === level).length;
      if (Math.abs(have - want[level]) > 1) {
        errors.push(`Stufe ${level}: ${have} Fragen, erwartet etwa ${want[level]} (±1)`);
      }
    }
    const order = qs.map((q) => LEVEL_ORDER.indexOf(q.level));
    if (order.some((v, i) => i > 0 && v < order[i - 1]!)) errors.push("Fragen müssen aufsteigend nach Stufe sortiert sein");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** First review after a wrong answer or a first correct Anwenden answer: stage 1, due tomorrow. */
export function newReview(questionId: string, now: Date): ReviewItem {
  return { questionId, stage: 1, dueAt: addDays(now, LEITNER_DAYS[0]!).toISOString() };
}

/** Correct → one stage up (stage 4 retires the item → null); wrong → back to stage 1. */
export function leitnerNext(item: ReviewItem, correct: boolean, now: Date): ReviewItem | null {
  if (!correct) return { questionId: item.questionId, stage: 1, dueAt: addDays(now, LEITNER_DAYS[0]!).toISOString() };
  if (item.stage >= 4) return null;
  const stage = (item.stage + 1) as ReviewStage;
  return { questionId: item.questionId, stage, dueAt: addDays(now, LEITNER_DAYS[stage - 1]!).toISOString() };
}

/** Items due now, oldest first, capped at REVIEWS_PER_DAY_MAX. */
export function dueReviews(items: ReviewItem[], now: Date, max: number = REVIEWS_PER_DAY_MAX): ReviewItem[] {
  return items
    .filter((it) => Date.parse(it.dueAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, max);
}

/** German alias of trafficLight() on a 0–100 scale. */
export function ampel(percent: number): Ampel {
  const light = trafficLight(percent / 100);
  return light === "green" ? "gruen" : light === "yellow" ? "gelb" : "rot";
}

/** "120 Minuten" → 120; anything without a minute figure (e.g. "höchstens 7 Stunden") → null. */
export function parseDurationMinutes(duration?: string): number | null {
  const m = duration?.match(/(\d+)\s*Minuten/i);
  return m ? Number(m[1]) : null;
}

/** About 4 minutes per question, rounded up to a multiple of 5 (90 → 25, 120 → 30, 150 → 40, 60 → 15). */
export function examQuestionCount(durationMinutes: number): number {
  return Math.ceil(Math.ceil(durationMinutes / EXAM_MINUTES_PER_QUESTION) / 5) * 5;
}

/** Graded written parts with a minute figure; the practical part and the Fachaufgabe are not simulated. */
export function writtenExamParts(c: Curriculum): Array<ExamPart & { durationMinutes: number }> {
  return c.exam.gradedParts
    .filter((p) => p.form === "schriftlich" && p.weightPercent != null)
    .map((p) => ({ ...p, durationMinutes: parseDurationMinutes(p.duration) ?? -1 }))
    .filter((p) => p.durationMinutes > 0);
}

export type ExamPoolQuestion = Pick<DidaktikQuestion, "id" | "type" | "examAreas">;

/**
 * Build one exam set for a graded part: questions whose examAreas hit the part's Gebiete
 * (or the part id itself), spread round-robin over the Gebiete, recent questions excluded.
 * `offset` rotates each Gebiet's candidate list so repeated calls yield different sets.
 */
export function buildExamSet(
  c: Curriculum,
  partId: string,
  pool: ExamPoolQuestion[],
  opts: { recentQuestionIds?: Iterable<string>; offset?: number; minRechnen?: number; setId?: string } = {},
): ExamSet | null {
  const part = c.exam.gradedParts.find((p) => p.id === partId);
  const minutes = part ? parseDurationMinutes(part.duration) : null;
  if (!part || minutes == null) return null;
  const recent = new Set(opts.recentQuestionIds ?? []);
  const areas = part.gebiete.length ? part.gebiete.map((g) => g.id) : [part.id];
  const targetCount = examQuestionCount(minutes);

  const buckets = new Map<string, ExamPoolQuestion[]>();
  for (const a of areas) buckets.set(a, []);
  for (const q of [...pool].sort((x, y) => x.id.localeCompare(y.id))) {
    if (recent.has(q.id)) continue;
    const area = q.examAreas.find((a) => buckets.has(a)) ?? (q.examAreas.includes(part.id) ? areas[0] : undefined);
    if (area) buckets.get(area)!.push(q);
  }
  const offset = opts.offset ?? 0;
  for (const [a, list] of buckets) {
    if (list.length) buckets.set(a, [...list.slice(offset % list.length), ...list.slice(0, offset % list.length)]);
  }

  const chosen: ExamPoolQuestion[] = [];
  const cursors = new Map<string, number>(areas.map((a) => [a, 0]));
  let progressed = true;
  while (chosen.length < targetCount && progressed) {
    progressed = false;
    for (const a of areas) {
      const list = buckets.get(a)!;
      const i = cursors.get(a)!;
      if (i < list.length && chosen.length < targetCount) {
        chosen.push(list[i]!);
        cursors.set(a, i + 1);
        progressed = true;
      }
    }
  }

  const minRechnen = opts.minRechnen ?? 0;
  if (minRechnen > 0) {
    const chosenIds = new Set(chosen.map((q) => q.id));
    const spare = [...buckets.values()].flat().filter((q) => q.type === "rechnen" && !chosenIds.has(q.id));
    let have = chosen.filter((q) => q.type === "rechnen").length;
    for (let i = chosen.length - 1; i >= 0 && have < minRechnen && spare.length; i--) {
      if (chosen[i]!.type !== "rechnen") {
        chosen[i] = spare.shift()!;
        have++;
      }
    }
  }

  const byArea: Record<string, number> = {};
  for (const q of chosen) {
    const area = q.examAreas.find((a) => buckets.has(a)) ?? areas[0]!;
    byArea[area] = (byArea[area] ?? 0) + 1;
  }
  return {
    id: opts.setId ?? `${c.id}-${partId}-${offset}`,
    mapId: c.id,
    partId,
    durationMinutes: minutes,
    targetCount,
    questionIds: chosen.map((q) => q.id),
    byArea,
  };
}

// ---------------------------------------------------------------------------
// Helpers used by the learner UI, the seed and the prompts (merged from the
// parallel AP-18 branch; same thresholds as above, English light names).
// ---------------------------------------------------------------------------

/** Leitner intervals in days keyed by stage (same values as LEITNER_DAYS). */
export const LEITNER_INTERVALS_DAYS = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
} as const;

/** Traffic-light thresholds for exam area readiness as ratios (AMPEL / 100). */
export const EXAM_TRAFFIC = {
  greenMin: AMPEL.gruen / 100,
  yellowMin: AMPEL.gelb / 100,
} as const;

export type TrafficLight = "green" | "yellow" | "red";

export function trafficLight(ratio: number): TrafficLight {
  if (ratio >= EXAM_TRAFFIC.greenMin) return "green";
  if (ratio >= EXAM_TRAFFIC.yellowMin) return "yellow";
  return "red";
}

export function trafficLabel(light: TrafficLight): string {
  if (light === "green") return "Prüfungsreif";
  if (light === "yellow") return "Vertiefen";
  return "Wiederholen";
}

/** Join sections into the legacy explanation string (fallback for old UI/data). */
export function explanationFromSections(sections: UnitSections): string {
  return [sections.einstieg, sections.kern, sections.beispiel, sections.merksatz]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

/** Prefer sections when present; otherwise use explanation. */
export function resolveExplanation(
  unit: { sections?: UnitSections; explanation: string; explanationSimple?: string },
  simpleLanguage: boolean,
): string {
  if (simpleLanguage && unit.explanationSimple?.trim()) {
    return unit.explanationSimple.trim();
  }
  if (unit.sections) {
    return explanationFromSections(unit.sections);
  }
  return unit.explanation;
}

/** Variant from block flags only (no title); deriveVariant() is the full rule. */
export function variantFromBlock(flags: { rechnen?: boolean; safety?: boolean; topics?: string[] }): UnitVariant {
  if (flags.safety) return "sicherheit";
  if (flags.rechnen) return "rechnen";
  const topics = (flags.topics ?? []).join(" ").toLowerCase();
  if (/\b(planen|durchführen|in betrieb|ablauf|rüsten|umrüsten|verfahren)\b/.test(topics)) {
    return "ablauf";
  }
  return "standard";
}

/**
 * Target question counts for exam parts by part id, falling back to ~4 min/question.
 * examQuestionCount() is the duration-only rule; both agree for PT/PP/WISO/T1/T2A/T2C.
 */
export function examQuestionTarget(partId: string, durationMinutes: number | null): number {
  const defaults: Record<string, number> = {
    PT: 30,
    PP: 15,
    WISO: 15,
    ZP: 15,
    T1: 25,
    T2: 40,
    T2A: 40,
    T2C: 15,
  };
  if (defaults[partId] != null) return defaults[partId]!;
  if (durationMinutes != null && durationMinutes > 0) {
    return examQuestionCount(durationMinutes);
  }
  return 15;
}

export function altTextOk(alt: string): boolean {
  const t = alt.trim();
  return t.length > 0 && t.length <= LIMITS.altChars;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
