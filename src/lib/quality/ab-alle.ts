/**
 * SIN-437: Goldset-Vergleich aller Kandidaten (`npm run ap22:alle`, Aufgabe `ab-alle-modelle`).
 * Reine Funktionen: Kandidatenliste, Kostenschätzung, Bericht. Die Aufrufe liegen in scripts/ap22-alle.ts.
 */
import { AB_MODELS } from "@/lib/anthropic/client";
import { OPENAI_CANDIDATES, openaiCandidate } from "@/lib/openai/candidates";
import { CLAUDE_BATCH_PRICES } from "./cost-guard";
import { DISAGREEMENT_WARN_RATE, type JudgeDisagreement, type JudgeMeans } from "./two-judges";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";

/** Deckel für den ganzen Vergleich (Issue SIN-437). */
export const ALLE_BUDGET_EUR = 6;
export const USD_PER_EUR = 1.075;
export const ALLE_BUDGET_USD = ALLE_BUDGET_EUR * USD_PER_EUR;

export type Candidate = { id: string; provider: "anthropic" | "openai"; inPerMtok: number; outPerMtok: number };

/** Feste Liste: die zwei Claude-Modelle von `ap22:ab` und die OpenAI-Kandidaten. */
export function allCandidates(): Candidate[] {
  return [
    ...AB_MODELS.map((id) => ({
      id,
      provider: "anthropic" as const,
      // Standard-Preis = 2× Batch (kein Batch in diesem Vergleich: gleiche Bedingungen für alle).
      inPerMtok: CLAUDE_BATCH_PRICES[id]!.in * 2,
      outPerMtok: CLAUDE_BATCH_PRICES[id]!.out * 2,
    })),
    ...OPENAI_CANDIDATES.map((c) => ({
      id: c.id,
      provider: "openai" as const,
      inPerMtok: c.inPerMtok,
      outPerMtok: c.outPerMtok,
    })),
  ];
}

/** Richterpreise je 1 Mio. Token: gpt-5.4-mini (cost-guard) und Claude Haiku 5.5 (Standard). */
const JUDGE_OPENAI = { in: 0.75, out: 4.5 };
const JUDGE_CLAUDE = { in: CLAUDE_BATCH_PRICES["claude-haiku-5-5"]!.in * 2, out: CLAUDE_BATCH_PRICES["claude-haiku-5-5"]!.out * 2 };

export type Estimate = { id: string; generationUsd: number; repairUsd: number; judgeUsd: number; totalUsd: number; priceVerified: boolean };

/**
 * Vorab-Schätzung je Kandidat: 3.000 Token Eingabe und 4.000 Token Ausgabe je Einheit (wie `ap22:ab`),
 * Reparatur für 30 % der Einheiten-Menge, Richter 1.200/200 Token je Frage mit 7 Fragen je Einheit, beide Richter,
 * Fragen nach der Reparatur zu 30 % erneut bewertet. Bewusst oben angesetzt.
 */
export function estimateCandidate(c: Candidate, units: number): Estimate {
  const cost = (inTok: number, outTok: number, p: { inPerMtok?: number; outPerMtok?: number; in?: number; out?: number }) =>
    (inTok / 1e6) * (p.inPerMtok ?? p.in ?? 0) + (outTok / 1e6) * (p.outPerMtok ?? p.out ?? 0);
  const generationUsd = cost(units * 3000, units * 4000, c);
  const repairUsd = generationUsd * 0.3;
  const judgedQuestions = units * 7 * 1.3;
  const judgeUsd =
    cost(judgedQuestions * 1200, judgedQuestions * 200, JUDGE_OPENAI) +
    cost(judgedQuestions * 1200, judgedQuestions * 200, JUDGE_CLAUDE);
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  const verified = c.provider === "anthropic" || openaiCandidate(c.id).priceVerified;
  return {
    id: c.id,
    generationUsd: round(generationUsd),
    repairUsd: round(repairUsd),
    judgeUsd: round(judgeUsd),
    totalUsd: round(generationUsd + repairUsd + judgeUsd),
    priceVerified: verified,
  };
}

export type ModelReport = {
  model: string;
  provider: "anthropic" | "openai";
  units: number;
  failedChunks: string[];
  questions: number;
  judges: { openai: JudgeMeans; claude: JudgeMeans; mean: JudgeMeans };
  disagreement: JudgeDisagreement;
  /** Bestehen beider Richter, vor Reparatur. */
  questionPassRate: number;
  unitPassRate: number;
  unitsPublishable: number;
  unitsDiscarded: number;
  costUsd: { generation: number; repair: number; judgeOpenai: number; judgeClaude: number; total: number };
  usdPerUnit: number | null;
  eurPerUnit: number | null;
  examples: GeneratedUnit[];
};

export type AlleReport = {
  runId: string;
  judges: { openai: string; claude: string };
  unitTarget: number;
  totalUsd: number;
  totalEur: number;
  aborted?: string;
  priceNotes: string[];
  models: ModelReport[];
  published: false;
};

const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = (x: number | null, d = 4) => (x === null ? "–" : x.toFixed(d).replace(".", ","));

function unitMarkdown(u: GeneratedUnit): string {
  const s = u.sections;
  const parts = [`#### ${u.id}: ${u.title}`, ""];
  if (s) {
    for (const k of ["einstieg", "kern", "beispiel", "merksatz"] as const) if (s[k]) parts.push(`**${k}:** ${s[k]}`, "");
  } else if (u.explanation) parts.push(u.explanation, "");
  u.questions.forEach((q, i) => {
    parts.push(`${i + 1}. ${q.prompt}`);
    if (q.choices?.length) parts.push(...q.choices.map((c) => `   - ${c}`));
    parts.push(`   Richtig: ${JSON.stringify(q.correct)}. ${q.explanation} (Quelle: ${q.sourceUrl})`);
  });
  return parts.join("\n");
}

/** Bericht für Sinan: Zahlen je Modell, Abweichungen der Richter, zwei Beispiele im Volltext. */
export function renderAlleMarkdown(r: AlleReport): string {
  const head = [
    `# Goldset-Vergleich aller Modelle (SIN-437), Lauf ${r.runId}`,
    "",
    `Richter: ${r.judges.openai} (OpenAI) und ${r.judges.claude} (Claude). Eine Frage besteht nur, wenn **beide** Richter die unveränderte Schwelle bestätigen. ${r.unitTarget} Einheiten LF3, gleicher Prompt, gleiche Vorgaben, ein Reparatur-Durchgang. Gesamtkosten: ${num(r.totalUsd, 2)} USD (${num(r.totalEur, 2)} EUR).`,
    ...(r.aborted ? ["", `**Abgebrochen:** ${r.aborted}`] : []),
    ...r.priceNotes.map((n) => `\n> ${n}`),
    "",
    "Es wird kein Standardmodell gewechselt. Die Wahl trifft Sinan.",
    "",
    "## Überblick",
    "",
    "| Modell | Richter OpenAI | Richter Claude | Mittelwert | Fragen bestanden | Einheiten bestanden | Verworfen nach Reparatur | Kosten je Einheit (USD / EUR) |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  const avg = (m: JudgeMeans) => `Ø ${num(m.niveau, 2)} Niveau, ${num(m.language, 2)} Sprache, ${pct(m.passRate)} bestanden`;
  const rows = r.models.map(
    (m) =>
      `| ${m.model} | ${avg(m.judges.openai)} | ${avg(m.judges.claude)} | ${avg(m.judges.mean)} | ${pct(m.questionPassRate)} | ${pct(m.unitPassRate)} | ${m.unitsDiscarded} von ${m.units} | ${num(m.usdPerUnit)} / ${num(m.eurPerUnit)} |`,
  );
  const dis = [
    "",
    "## Abweichungen zwischen den Richtern",
    "",
    "| Modell | Uneinig (Fragen) | Quote | Ø Abstand Niveau | Ø Abstand Sprache | Hinweis |",
    "| --- | --- | --- | --- | --- | --- |",
    ...r.models.map(
      (m) =>
        `| ${m.model} | ${m.disagreement.count} | ${pct(m.disagreement.rate)} | ${num(m.disagreement.meanAbsNiveauDiff, 2)} | ${num(m.disagreement.meanAbsLanguageDiff, 2)} | ${m.disagreement.rate > DISAGREEMENT_WARN_RATE ? "Richter uneinig: Ergebnis mit Vorsicht lesen" : "–"} |`,
    ),
    "",
    "## Kosten je Modell (USD, inkl. Erzeugen, Reparatur und beider Richter)",
    "",
    "| Modell | Erzeugen | Reparatur | Richter OpenAI | Richter Claude | Summe |",
    "| --- | --- | --- | --- | --- | --- |",
    ...r.models.map(
      (m) =>
        `| ${m.model} | ${num(m.costUsd.generation)} | ${num(m.costUsd.repair)} | ${num(m.costUsd.judgeOpenai)} | ${num(m.costUsd.judgeClaude)} | ${num(m.costUsd.total)} |`,
    ),
  ];
  const ex = r.models.flatMap((m) => [
    "",
    `## Beispiele ${m.model}`,
    "",
    ...(m.examples.length ? m.examples.map(unitMarkdown) : ["Keine Einheit erzeugt."]),
  ]);
  return [...head, ...rows, ...dis, ...ex, ""].join("\n");
}
