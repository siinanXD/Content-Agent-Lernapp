/**
 * SIN-297 — Regeln aus AGENTS.md („Verboten“) als prüfbare Liste. Jede Regel nennt, wer sie prüft:
 * `publish` (Wächter vor dem Veröffentlichen, content-guard.ts), `diff` (feste Prüfung am PR-Diff,
 * scripts/autonomy/review.mjs) und/oder `review` (das zweite Modell liest die Regel im Prompt).
 * Ein Test hält die Liste deckungsgleich mit dem Abschnitt „Verboten“ in AGENTS.md.
 */

export type Pruefer = "publish" | "diff" | "review";

export type Regel = {
  id: string;
  /** Wörtlich wie in AGENTS.md (Abschnitt „Verboten“). */
  verbot: string;
  pruefer: Pruefer[];
};

export const VERBOTEN_REGELN: readonly Regel[] = [
  { id: "ihk-kopie", verbot: "IHK-Prüfungsaufgaben kopieren", pruefer: ["publish", "review"] },
  { id: "personendaten", verbot: "Personendaten in Prompts", pruefer: ["publish", "diff", "review"] },
  { id: "unter-schwelle", verbot: "Inhalte unter der Qualitäts-Schwelle veröffentlichen", pruefer: ["publish", "review"] },
  {
    id: "zugangsdaten-abrechnung-loeschung",
    verbot: "Zugangsdaten, Abrechnung oder Datenbank-Löschungen anfassen",
    pruefer: ["diff", "review"],
  },
  {
    id: "a11y-tests-aus",
    verbot: "Barrierefreiheits-Tests abschalten, um einen Merge durchzubekommen",
    pruefer: ["diff", "review"],
  },
];

/** Zusätzliche Grundsätze, die nur für Inhalte gelten (PRODUCT.md, AGENTS.md „Grundsatz“ und „Qualität“). */
export const INHALTS_REGELN: readonly string[] = [
  "Ohne amtliche Quelle wird kein Lerninhalt erzeugt.",
  "Jede Lerneinheit speichert Quelle und Abrufdatum.",
  "KI-erzeugte Inhalte sind als solche gekennzeichnet.",
];

/** Die Regeln als Aufzählung für den Prompt des Review-Agenten. */
export function regelnFuerPrompt(): string {
  return [...VERBOTEN_REGELN.map((r) => r.verbot), ...INHALTS_REGELN].map((r) => `- ${r}`).join("\n");
}
