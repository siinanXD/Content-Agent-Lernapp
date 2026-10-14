/**
 * SIN-629: Regressionsschutz für Inhalte. Feste Prüfsätze und Vergleich der Richter-Quoten (Basis gegen PR).
 * Reine Logik ohne Netz; der Lauf steht in scripts/goldset-regression.ts, der Job in .github/workflows/goldset.yml.
 */
import { ELEKTRO_MUSTER, ELEKTRO_VORHANDEN, PRUEFHINWEIS_MUSTER } from "@/lib/review/pruefhinweise";
import { quelleGehoertZuBeruf } from "@/lib/generate/quellen-beruf";
import type { GoldQuestion } from "./maf-goldset-fixture";
import type { QuestionEval } from "./schemas";

/** Verschlechterung in Prozentpunkten, ab der der PR rot wird (mehr als). */
export const MAX_VERSCHLECHTERUNG_PP = 3;
/** Kostendeckel je Lauf in Euro (ein Lauf = Basis + PR). */
export const GOLDSET_DECKEL_EUR = 2;
/** Feste Stichprobe: die ersten 30 Goldset-Einträge nach Kennung. */
export const STICHPROBE = 30;

export type Messung = {
  /** Anteil der Stichprobe, den der Richter beim ersten Mal besteht (0–100). */
  erstquote: number;
  /** Anteil der Goldset-Einträge, bei denen das Urteil dem erwarteten entspricht (0–100). */
  uebereinstimmung: number;
  /** Verstöße gegen die festen Prüfsätze; leer = in Ordnung. */
  fehler: string[];
  costUsd: number;
};

export function stichprobe<T extends { id: string }>(items: T[], n = STICHPROBE): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id)).slice(0, n);
}

export const prozent = (anteil: number) => Math.round(anteil * 1000) / 10;

export function erstquote(sample: { id: string }[], judged: Pick<QuestionEval, "questionId" | "passed">[]): number {
  const bestanden = new Set(judged.filter((j) => j.passed).map((j) => j.questionId));
  return prozent(sample.filter((q) => bestanden.has(q.id)).length / Math.max(1, sample.length));
}

/**
 * Feste Prüfsätze: Quelle passt zum Beruf, keine internen Hinweise, Elektro-Hinweis bei Eingriffen.
 * `generatorPrompt` ist der System-Prompt des Generators; er muss die Textregeln (SIN-620) enthalten.
 */
export function festePruefsaetze(items: GoldQuestion[], beruf: string, generatorPrompt: string, elektroHinweis: string): string[] {
  const fehler: string[] = [];
  const einheiten = new Map<string, string[]>();
  for (const q of items) {
    if (!quelleGehoertZuBeruf(q.sourceUrl, beruf)) fehler.push(`${q.id}: Quelle gehört nicht zum Beruf ${beruf}`);
    const texte = [q.prompt, q.explanation];
    if (PRUEFHINWEIS_MUSTER.test([...texte, ...[q.correct].flat()].join(" "))) fehler.push(`${q.id}: interner Prüfhinweis im Text`);
    einheiten.set(q.unitId, [...(einheiten.get(q.unitId) ?? []), ...texte]);
  }
  for (const [id, texte] of einheiten) {
    const text = texte.join(" ");
    if (ELEKTRO_MUSTER.test(text) && !ELEKTRO_VORHANDEN.test(text)) fehler.push(`${id}: elektrischer Eingriff ohne Elektrofachkraft-Hinweis`);
  }
  if (!generatorPrompt.includes(elektroHinweis)) fehler.push("Generator-Prompt: Elektro-Hinweis fehlt");
  if (!/Prüfhinweise/.test(generatorPrompt)) fehler.push("Generator-Prompt: Regel gegen interne Prüfhinweise fehlt");
  return fehler;
}

export type Vergleich = { ok: boolean; gruende: string[] };

/** Rot, wenn eine Quote um mehr als 3 Prozentpunkte fällt oder ein fester Prüfsatz verletzt ist. */
export function vergleiche(basis: Messung | null, pr: Messung, max = MAX_VERSCHLECHTERUNG_PP): Vergleich {
  const gruende = pr.fehler.map((f) => `Prüfsatz: ${f}`);
  if (basis) {
    for (const [name, key] of [["Erstquote Richter", "erstquote"], ["Urteil wie erwartet", "uebereinstimmung"]] as const) {
      const delta = Math.round((pr[key] - basis[key]) * 10) / 10;
      if (delta < -max) gruende.push(`${name}: ${delta} Prozentpunkte (Grenze −${max})`);
    }
  }
  return { ok: gruende.length === 0, gruende };
}

export function renderKommentar(basis: Messung | null, pr: Messung, v: Vergleich, kostenEur: number): string {
  const zahl = (x: number) => `${x} %`.replace(".", ",");
  return [
    "## Goldset-Prüfung (SIN-629)",
    "",
    v.ok ? "Ergebnis: **grün**" : "Ergebnis: **rot**",
    "",
    "| | Basis (main) | PR |",
    "| --- | --- | --- |",
    `| Erstquote Richter (${STICHPROBE} Einträge) | ${basis ? zahl(basis.erstquote) : "–"} | ${zahl(pr.erstquote)} |`,
    `| Urteil wie erwartet (Goldset) | ${basis ? zahl(basis.uebereinstimmung) : "–"} | ${zahl(pr.uebereinstimmung)} |`,
    `| Verstöße gegen feste Prüfsätze | ${basis ? basis.fehler.length : "–"} | ${pr.fehler.length} |`,
    "",
    ...(v.gruende.length ? ["Gründe:", ...v.gruende.map((g) => `- ${g}`), ""] : []),
    `Kosten dieses Laufs: ${kostenEur.toFixed(2).replace(".", ",")} € (Deckel ${GOLDSET_DECKEL_EUR} €), im Ledger \`goldset-regression\` und als Langfuse-Experiment.`,
    "",
  ].join("\n");
}
