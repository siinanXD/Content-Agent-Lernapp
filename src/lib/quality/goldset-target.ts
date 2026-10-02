/**
 * Calibrated goldset target (AP-06).
 * Generated 2026-10-02T22:57:24.077Z by scripts/ap06-calibrate.ts — do not hand-edit.
 */
export const GOLDSET_TARGET = {
  sourceFidelity: 1,
  uniqueness: 1,
  niveau: 4,
  language: 4.9,
  sampleSize: 70,
  judgedCount: 70,
  modelId: "gpt-5.4-mini",
  calibratedAt: "2026-10-02T22:57:24.077Z",
  note: "Live OpenAI judge on 70 AO/BIBB practice items; IHK exams not used.",
  costUsdEstimate: 0.0803,
} as const;

export type GoldsetTarget = typeof GOLDSET_TARGET;
