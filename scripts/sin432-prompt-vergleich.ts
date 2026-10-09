/**
 * SIN-432: Vorher/nachher-Vergleich der auswahl/reihenfolge-Regeln im Generator-Prompt.
 * Gleiche Blöcke (LF1, LF2, M0, PA aus maf-metall), gleiches Modell, gleicher Richter; einmal mit
 * PROMPT_AUSWAHL_REGELN=aus (alter Prompt), einmal ohne. Meldet die Verwerfungsquote je Fragetyp.
 * Veröffentlicht nichts. Ohne Schlüssel: Abbruch mit Exit 2 (nur PRESENT/MISSING).
 *
 *   npm run quality:prompt-vergleich
 *   npm run quality:prompt-vergleich -- --dry-run
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectBatchUnits,
  pollBatchUntilDone,
  submitChunkTargets,
  UNITS_PER_CHUNK,
  type BatchChunkTarget,
} from "../src/lib/generate/batch-generate";
import { generatorSystemText } from "../src/lib/generate/didaktik-prompts";
import { loadMafCurriculum } from "../src/lib/content/curriculum";
import { GENERATOR_MODEL } from "../src/lib/anthropic/client";
import { addOpenAIUsage, claudeBatchUsd, emptyLedger } from "../src/lib/quality/cost-guard";
import { JUDGE_MODEL, liveJudgeWithUsage, type EvalItem } from "../src/lib/quality/evaluate-agent";

const OUT_DIR = join(process.cwd(), "docs", "ops", "sin432-runs");
const KEYWORD = "Maschinen- und Anlagenführer";
const MODULES = ["LF1", "LF2", "M0", "PA"];
const UNITS_PER_MODULE = 6;
const BUDGET_USD = 3.2;
const TYPES = ["auswahl", "reihenfolge"] as const;

function targets(): BatchChunkTarget[] {
  const c = loadMafCurriculum();
  const out: BatchChunkTarget[] = [];
  for (const id of MODULES) {
    const mod = c.modules.find((m) => m.id === id);
    if (!mod) throw new Error(`Modul ${id} fehlt`);
    let left = UNITS_PER_MODULE;
    for (const block of mod.blocks) {
      for (let off = 0; off < block.units && left > 0; off += UNITS_PER_CHUNK) {
        const unitCount = Math.min(UNITS_PER_CHUNK, block.units - off, left);
        out.push({ customId: `v-${block.id}-u${off}-${off + unitCount - 1}`, module: mod, block, unitOffset: off, unitCount });
        left -= unitCount;
      }
    }
  }
  return out;
}

async function lauf(label: "vorher" | "nachher", key: string) {
  if (label === "vorher") process.env.PROMPT_AUSWAHL_REGELN = "aus";
  else delete process.env.PROMPT_AUSWAHL_REGELN;
  const system = [{ type: "text" as const, text: generatorSystemText(), cache_control: { type: "ephemeral" as const } }];
  const sub = await submitChunkTargets({ keyword: KEYWORD, targets: targets(), model: GENERATOR_MODEL, system });
  await pollBatchUntilDone(sub.batchId, { intervalMs: 20_000 });
  const got = await collectBatchUnits(sub.batchId);
  const c = loadMafCurriculum();
  const typeOf = new Map<string, string>();
  const items: EvalItem[] = got.units.flatMap((u) => {
    const mod = c.modules.find((m) => m.id === u.moduleId);
    return u.questions.map((q) => {
      typeOf.set(`${u.id}-${q.id}`, q.type);
      return {
        id: `${u.id}-${q.id}`, unitId: u.id, prompt: q.prompt, correct: q.correct, explanation: q.explanation,
        sourceUrl: q.sourceUrl, moduleId: u.moduleId, blockId: u.blockId, year: mod?.year,
        niveauHint: u.niveau ?? mod?.niveau, safety: u.safetyFlag ?? mod?.safety,
      };
    });
  });
  const judged = await liveJudgeWithUsage(key, items);
  const usd =
    claudeBatchUsd(GENERATOR_MODEL, got.ledger) +
    addOpenAIUsage(emptyLedger(), judged.usage.prompt_tokens, judged.usage.completion_tokens).usdEstimate;
  const jeTyp: Record<string, { fragen: number; verworfen: number; quote: number }> = {};
  for (const t of [...TYPES, "alle"]) {
    const qs = judged.questions.filter((q) => t === "alle" || typeOf.get(q.questionId) === t);
    const v = qs.filter((q) => !q.passed).length;
    jeTyp[t] = { fragen: qs.length, verworfen: v, quote: Number((v / Math.max(1, qs.length)).toFixed(3)) };
  }
  return { label, batchId: sub.batchId, failedChunks: got.failedCustomIds, jeTyp, usd };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const secrets = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() ? "PRESENT" : "MISSING",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() ? "PRESENT" : "MISSING",
  };
  console.log("secrets", secrets, `chunks=${targets().length} modelle=${GENERATOR_MODEL}/${JUDGE_MODEL}`);
  if (process.argv.includes("--dry-run")) return console.log("dry-run ok");
  if (Object.values(secrets).includes("MISSING")) {
    console.error("STOP: Secrets fehlen");
    process.exit(2);
  }
  const key = process.env.OPENAI_API_KEY!.trim();
  const runs = [await lauf("vorher", key)];
  if (runs[0]!.usd < BUDGET_USD) runs.push(await lauf("nachher", key));
  const totalUsd = runs.reduce((s, r) => s + r.usd, 0);
  const out = { runId: new Date().toISOString(), module: MODULES, totalUsd: Number(totalUsd.toFixed(4)), runs, published: false };
  writeFileSync(join(OUT_DIR, `${out.runId.replace(/[:.]/g, "-")}-vergleich.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
