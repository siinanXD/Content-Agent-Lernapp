/**
 * AP-18 Didaktik schema (D-31 / docs/content/DIDAKTIK.md).
 * Extends GeneratedUnit/Question; explanation remains a fallback summary of sections.
 */

export type UnitVariant = "standard" | "ablauf" | "rechnen" | "sicherheit";

export type QuestionLevel = "erinnern" | "verstehen" | "anwenden";

export type ImageKind = "flow" | "schema" | "sign" | "sketch" | "chart";

export type UnitSections = {
  einstieg: string;
  kern: string;
  beispiel: string;
  merksatz: string;
};

export type UnitImage = {
  /** SVG or image path (Phase A: generated SVG only). */
  src: string;
  /** Max 125 characters. */
  alt: string;
  /** Required for schemas / labelled diagrams. */
  longDescription?: string;
  kind: ImageKind;
  source: { url: string; license: string; attribution?: string };
  /** e.g. Mermaid source for flow diagrams. */
  generatedFrom?: string;
};

export type ReviewItem = {
  questionId: string;
  stage: 1 | 2 | 3 | 4;
  dueAt: string;
};

export type ExamSet = {
  id: string;
  mapId: string;
  partId: string;
  durationMinutes: number;
  questionIds: string[];
};

/** Leitner intervals in days (D-31). */
export const LEITNER_INTERVALS_DAYS = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
} as const;

/** Traffic-light thresholds for exam area readiness (D-31). */
export const EXAM_TRAFFIC = {
  greenMin: 0.8,
  yellowMin: 0.6,
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
export function resolveExplanation(unit: {
  sections?: UnitSections;
  explanation: string;
  explanationSimple?: string;
}, simpleLanguage: boolean): string {
  if (simpleLanguage && unit.explanationSimple?.trim()) {
    return unit.explanationSimple.trim();
  }
  if (unit.sections) {
    return explanationFromSections(unit.sections);
  }
  return unit.explanation;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Infer didactic variant from curriculum block/module flags. */
export function variantFromBlock(flags: {
  rechnen?: boolean;
  safety?: boolean;
  topics?: string[];
}): UnitVariant {
  if (flags.safety) return "sicherheit";
  if (flags.rechnen) return "rechnen";
  const topics = (flags.topics ?? []).join(" ").toLowerCase();
  if (
    /\b(planen|durchführen|in betrieb|ablauf|rüsten|umrüsten|verfahren)\b/.test(
      topics,
    )
  ) {
    return "ablauf";
  }
  return "standard";
}

/** Parse MAF/INDUSTRY duration strings like "120 Minuten" → minutes. */
export function parseDurationMinutes(duration?: string): number | null {
  if (!duration) return null;
  const m = duration.match(/(\d+)\s*Minuten/i);
  return m ? Number(m[1]) : null;
}

/**
 * Target question counts for exam parts (DIDAKTIK §6, ~4 min/question).
 * Practical parts are not simulated as timed MC sets.
 */
export function examQuestionTarget(partId: string, durationMinutes: number | null): number {
  const defaults: Record<string, number> = {
    PT: 30,
    PP: 15,
    WISO: 15,
    ZP: 15,
    T1: 25,
    T2: 40,
  };
  if (defaults[partId] != null) return defaults[partId]!;
  if (durationMinutes != null && durationMinutes > 0) {
    return Math.max(5, Math.round(durationMinutes / 4));
  }
  return 15;
}

export function altTextOk(alt: string): boolean {
  const t = alt.trim();
  return t.length > 0 && t.length <= 125;
}
