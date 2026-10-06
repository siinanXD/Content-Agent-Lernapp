import type { Curriculum } from "@/lib/content/curriculum";
import { drawSample, isSafetyUnit, type SampleUnit } from "./safety-sample";

/**
 * SIN-278: Prüfseite für Sinan (je Frage Antwort, Quelle mit Link, Ankreuzfeld).
 * Reine Logik; Laden und Schreiben in scripts/safety-sample.mjs. Bewertet nichts.
 */

const ELECTRIC_WORDS = /elektr|spannung|freischalt|schutzleiter|fi-schutz|stromschlag|steckdose/i;

export type SampleQuestion = {
  unitId: string;
  unitTitle: string;
  questionId: string;
  prompt: string;
  choices?: string[];
  correct: string[];
  explanation: string;
  sourceUrl: string;
  sourceFetchedAt: string;
};

type QuestionUnit = SampleUnit & {
  questions?: Array<{
    id: string;
    prompt: string;
    choices?: string[];
    correct: string | string[];
    explanation?: string;
    sourceUrl?: string;
    sampleSolution?: string;
  }>;
};

/** Elektrik oder Maschinensicherheit: Sicherheits-Einheit (siehe isSafetyUnit) oder Elektrik-Stichwort im Titel. */
export function isElectricOrMachineSafety(unit: QuestionUnit, curriculum?: Curriculum): boolean {
  return isSafetyUnit(unit, curriculum) || ELECTRIC_WORDS.test(unit.title);
}

/** Zieht `fraction` (Standard 10 %, mindestens 1) aller Fragen der passenden Einheiten, seedbar. */
export function buildQuestionSample(
  units: QuestionUnit[],
  curriculum: Curriculum | undefined,
  opts: { seed: number; fraction?: number },
): { total: number; sample: SampleQuestion[] } {
  const all: Array<SampleQuestion & { id: string }> = [];
  for (const u of units.filter((x) => isElectricOrMachineSafety(x, curriculum))) {
    for (const q of u.questions ?? []) {
      const correct = (Array.isArray(q.correct) ? q.correct : [q.correct]).filter(Boolean);
      all.push({
        id: `${u.id}/${q.id}`,
        unitId: u.id,
        unitTitle: u.title,
        questionId: q.id,
        prompt: q.prompt,
        choices: q.choices,
        correct: correct.length ? correct : q.sampleSolution ? [q.sampleSolution] : [],
        explanation: q.explanation ?? "",
        sourceUrl: (q.sourceUrl || u.sourceUrl || "").trim(),
        sourceFetchedAt: (u.sourceFetchedAt ?? "").trim(),
      });
    }
  }
  const n = all.length ? Math.max(1, Math.ceil(all.length * (opts.fraction ?? 0.1))) : 0;
  return { total: all.length, sample: drawSample(all, n, opts.seed) };
}

export function renderReviewPage(
  r: { total: number; sample: SampleQuestion[] },
  meta: { date: string; source: string; seed: number },
): string {
  const lines = [
    `# Sicherheits-Stichprobe MAF Metall: Prüfseite (${meta.date})`,
    "",
    "Für Sinan. Bitte je Frage ankreuzen und das Ergebnis im Chat melden. „falsch“-Fragen werden zurückgezogen und neu erzeugt. Erst nach deiner Rückmeldung wird `content-safety` in `docs/product-readiness.json` eingetragen.",
    "",
    `- Datenquelle: ${meta.source}`,
    `- Auswahl: 10 % der Fragen zu Elektrik und Maschinensicherheit, ${r.sample.length} von ${r.total} (Seed ${meta.seed})`,
    "",
  ];
  if (!r.sample.length) lines.push("**Keine Fragen gefunden. Dieser Bericht ist kein Beleg.**", "");
  r.sample.forEach((q, i) => {
    const fetched = q.sourceFetchedAt ? `abgerufen ${q.sourceFetchedAt.slice(0, 10)}` : "Abrufdatum fehlt";
    lines.push(
      `## ${i + 1}. ${q.unitTitle} (${q.unitId} / ${q.questionId})`,
      "",
      `**Frage:** ${q.prompt}`,
      "",
      ...(q.choices?.length ? [...q.choices.map((c) => `- ${c}`), ""] : []),
      `**Richtige Antwort:** ${q.correct.join(" · ") || "(keine hinterlegt)"}`,
      "",
      ...(q.explanation ? [`**Begründung:** ${q.explanation}`, ""] : []),
      `**Quelle:** ${q.sourceUrl ? `[${q.sourceUrl}](${q.sourceUrl})` : "fehlt"} (${fetched})`,
      "",
      "- [ ] passt",
      "- [ ] falsch",
      "- [ ] unklar",
      "",
    );
  });
  return lines.join("\n");
}
