/**
 * SIN-629: Goldset-Prüfung bei Änderungen an Generator, Richter oder Modellwahl.
 *
 *   npm run quality:regression -- messen --out pr.json [--ledger]   misst Richter und feste Prüfsätze (OPENAI_API_KEY)
 *   npm run quality:regression -- vergleichen --basis basis.json --pr pr.json --out kommentar.md   Exit 1 = rot
 *
 * Messen kostet wenige Cent (70 Einträge, ein Richter-Durchgang). `--ledger` schreibt Kosten ins Ledger
 * (pipeline_run_costs, kind goldset-regression) und die Werte als Langfuse-Trace (Experiment).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { generatorSystemText } from "../src/lib/generate/didaktik-prompts";
import { ELEKTRO_HINWEIS } from "../src/lib/review/pruefhinweise";
import { addOpenAIUsage, emptyLedger } from "../src/lib/quality/cost-guard";
import { JUDGE_MODEL, JUDGE_PROMPT_VERSION, liveJudgeWithUsage } from "../src/lib/quality/evaluate-agent";
import { checkGoldset } from "../src/lib/quality/goldset-check";
import { recordEvaluationTrace } from "../src/lib/quality/langfuse-client";
import { shutdownLangfuseOtel } from "../src/lib/quality/langfuse-otel";
import { MAF_GOLDSET_ITEMS } from "../src/lib/quality/maf-goldset";
import {
  GOLDSET_DECKEL_EUR,
  erstquote,
  festePruefsaetze,
  prozent,
  renderKommentar,
  stichprobe,
  vergleiche,
  type Messung,
} from "../src/lib/quality/regression";
import { assertWithinRunCap, recordRunCost } from "../src/lib/quality/run-ledger";

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const lies = (pfad: string | undefined): Messung => JSON.parse(readFileSync(pfad ?? "", "utf8")) as Messung;

async function messen(): Promise<void> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.error("STOP: OPENAI_API_KEY fehlt (nur Name gemeldet)");
    process.exit(2);
  }
  const items = MAF_GOLDSET_ITEMS;
  const fehler = festePruefsaetze(items, "maf", generatorSystemText(), ELEKTRO_HINWEIS);
  const judged = await liveJudgeWithUsage(key, items.map((q) => ({ ...q, safety: q.expected.safetyFlag })));
  const ledger = addOpenAIUsage(emptyLedger(), judged.usage.prompt_tokens, judged.usage.completion_tokens);
  assertWithinRunCap(ledger.eurEstimate, GOLDSET_DECKEL_EUR);
  const check = checkGoldset(items, judged.questions);
  const m: Messung = {
    erstquote: erstquote(stichprobe(items), judged.questions),
    uebereinstimmung: prozent(check.agree / Math.max(1, check.judged)),
    fehler,
    costUsd: ledger.usdEstimate,
  };
  writeFileSync(opt("out") ?? "goldset-messung.json", JSON.stringify(m, null, 2) + "\n");
  console.log(JSON.stringify(m));

  if (argv.includes("--ledger")) {
    const runId = process.env.GITHUB_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, "-");
    await recordRunCost({ runId, courseId: "goldset-regression", kind: "goldset-regression", ledger });
    await recordEvaluationTrace({
      name: `Goldset-Prüfung ${process.env.GITHUB_HEAD_REF ?? "lokal"}`,
      courseId: "goldset-regression",
      passed: fehler.length === 0,
      scores: { erstquote: m.erstquote, uebereinstimmung: m.uebereinstimmung, pruefsatzFehler: fehler.length },
      metadata: { kind: "goldset-regression", judgeModel: JUDGE_MODEL, judgePromptVersion: JUDGE_PROMPT_VERSION, runId },
    });
  }
}

function vergleichen(): void {
  const basis = lies(opt("basis"));
  const pr = lies(opt("pr"));
  const v = vergleiche(basis, pr);
  const kostenEur = Math.round((basis.costUsd + pr.costUsd) * (20 / 21.5) * 100) / 100;
  assertWithinRunCap(kostenEur, GOLDSET_DECKEL_EUR);
  writeFileSync(opt("out") ?? "goldset-kommentar.md", renderKommentar(basis, pr, v, kostenEur));
  console.log(v.ok ? "grün" : `rot: ${v.gruende.join("; ")}`);
  if (!v.ok) process.exitCode = 1;
}

(argv[0] === "vergleichen" ? Promise.resolve(vergleichen()) : argv[0] === "messen" ? messen() : Promise.reject(new Error("messen oder vergleichen")))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => shutdownLangfuseOtel().catch(() => undefined));
