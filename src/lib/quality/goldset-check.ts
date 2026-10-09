/**
 * SIN-449: Richter gegen ein Goldset prüfen. Vergleicht das Urteil des Richters mit den erwarteten Werten:
 * Besteht er die guten Fragen, und lässt er die Gegenproben durchfallen? Reine Logik ohne Netz.
 */
import { scoresPass, type QuestionEval } from "./schemas";

export type GoldItemForCheck = {
  id: string;
  prompt: string;
  expected: { sourceFidelity: 0 | 1; uniqueness: 0 | 1; niveau: number; language: number; safetyFlag: boolean };
  gegenprobe?: string;
};

export type GoldsetCheck = {
  total: number;
  judged: number;
  /** Urteil (bestanden oder nicht) wie erwartet. */
  agree: number;
  agreementRate: number;
  /** Gute Fragen, die der Richter ablehnt. */
  falseFail: { id: string; reasons: string[] }[];
  /** Fragen, die durchfallen sollten, aber bestehen (vor allem Gegenproben). */
  falsePass: string[];
  gegenproben: { total: number; erkannt: number };
  /** Fragen ohne Urteil des Richters. */
  missing: string[];
};

export function checkGoldset(items: GoldItemForCheck[], judged: QuestionEval[]): GoldsetCheck {
  const byId = new Map(judged.map((j) => [j.questionId, j]));
  const falseFail: GoldsetCheck["falseFail"] = [];
  const falsePass: string[] = [];
  const missing: string[] = [];
  let agree = 0;
  let gpTotal = 0;
  let gpErkannt = 0;
  for (const item of items) {
    const j = byId.get(item.id);
    const shouldPass = scoresPass(item.expected);
    if (item.gegenprobe) gpTotal += 1;
    if (!j) {
      missing.push(item.id);
      continue;
    }
    if (j.passed === shouldPass) agree += 1;
    else if (shouldPass) falseFail.push({ id: item.id, reasons: j.reasons ?? [] });
    else falsePass.push(item.id);
    if (item.gegenprobe && !j.passed) gpErkannt += 1;
  }
  const judgedCount = items.length - missing.length;
  return {
    total: items.length,
    judged: judgedCount,
    agree,
    agreementRate: Math.round((agree / Math.max(1, judgedCount)) * 1000) / 1000,
    falseFail,
    falsePass,
    gegenproben: { total: gpTotal, erkannt: gpErkannt },
    missing,
  };
}

/** Kurzer Bericht für Sinan. */
export function renderGoldsetCheck(
  c: GoldsetCheck,
  meta: { dataset: string; judgeModel: string; runId: string; costUsd: number; langfuse: string },
  items: GoldItemForCheck[],
): string {
  const prompt = new Map(items.map((i) => [i.id, i.prompt]));
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  return [
    `# Richter gegen Goldset ${meta.dataset}, Lauf ${meta.runId}`,
    "",
    `Richter: ${meta.judgeModel}. Kosten: ${meta.costUsd.toFixed(4).replace(".", ",")} USD. Langfuse: ${meta.langfuse}.`,
    "",
    `- Urteil wie erwartet: **${c.agree} von ${c.judged}** (${pct(c.agreementRate)})`,
    `- Gegenproben erkannt: **${c.gegenproben.erkannt} von ${c.gegenproben.total}**`,
    `- Gute Fragen abgelehnt: ${c.falseFail.length}`,
    `- Schlechte Fragen durchgelassen: ${c.falsePass.length}`,
    ...(c.missing.length ? [`- Ohne Urteil: ${c.missing.join(", ")}`] : []),
    ...(c.falseFail.length
      ? ["", "## Gute Fragen, die der Richter ablehnt", "", ...c.falseFail.map((f) => `- \`${f.id}\` ${prompt.get(f.id) ?? ""} → ${f.reasons.join("; ") || "ohne Begründung"}`)]
      : []),
    ...(c.falsePass.length
      ? ["", "## Schlechte Fragen, die der Richter durchlässt", "", ...c.falsePass.map((id) => `- \`${id}\` ${prompt.get(id) ?? ""}`)]
      : []),
    "",
  ].join("\n");
}
