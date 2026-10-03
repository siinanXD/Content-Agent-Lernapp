import {
  loadMafCurriculum,
  modulesForPhase,
  type Curriculum,
  type CurriculumBlock,
  type CurriculumModule,
} from "@/lib/content/curriculum";
import { variantFromBlock } from "@/lib/content/didaktik";
import { anthropicHeaders } from "@/lib/anthropic/headers";
import {
  buildDidaktikBlockPrompt,
  buildDidaktikKeywordPrompt,
} from "./didaktik-prompts";
import {
  lernfeldIsComplete,
  mafSeedLernfeldSicherheit,
  type GeneratedLernfeld,
} from "./maf-lernfeld-seed";

export type GenerateAgentResult = {
  lernfeld: GeneratedLernfeld;
  mode: "live" | "seed" | "batch-pending";
  modelId?: string;
  batchId?: string;
  warning?: string;
  /** Present when a Message Batch was submitted (one request per block). */
  batchBlockIds?: string[];
};

const GENERATOR_MODEL = "claude-sonnet-5-5";

/**
 * Generate content for one curriculum block (Didaktik sections + 5–8 questions).
 * Seed path meets AP-05/AP-14/AP-18 without API key (M0-3 Sicherheit).
 * Live uses Messages; Batch API submits one request per block (D-06 / D-17 / D-31 / D-32).
 */
export async function runGenerateAgent(opts: {
  keyword: string;
  useBatch?: boolean;
  /** Default M0-3 (Sicherheit seed). */
  blockId?: string;
  /** When useBatch and no blockId: batch all blocks in this phase (default A). */
  phaseId?: string;
}): Promise<GenerateAgentResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const lernfeld = mafSeedLernfeldSicherheit();
    return {
      lernfeld,
      mode: "seed",
      warning: lernfeldIsComplete(lernfeld)
        ? "ANTHROPIC_API_KEY missing — seed block M0-3 'Sicherheit' (Didaktik). Set key for live/Batch generate from maf-metall.json."
        : "Seed Lernfeld incomplete.",
    };
  }

  if (opts.useBatch) {
    try {
      return await submitBatchGenerate(key, opts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        lernfeld: mafSeedLernfeldSicherheit(),
        mode: "seed",
        modelId: GENERATOR_MODEL,
        warning: `Batch submit failed: ${msg.slice(0, 200)}. Seed fallback.`,
      };
    }
  }

  try {
    const live = await runLiveGenerate(key, opts.keyword, opts.blockId ?? "M0-3");
    if (lernfeldIsComplete(live.lernfeld)) return live;
    return {
      lernfeld: mafSeedLernfeldSicherheit(),
      mode: "seed",
      modelId: GENERATOR_MODEL,
      warning: live.warning ?? "Live generate incomplete; seed fallback.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      lernfeld: mafSeedLernfeldSicherheit(),
      mode: "seed",
      modelId: GENERATOR_MODEL,
      warning: `Live generate failed: ${msg.slice(0, 200)}. Seed fallback.`,
    };
  }
}

export function findCurriculumBlock(
  blockId: string,
  c: Curriculum = loadMafCurriculum(),
): { module: CurriculumModule; block: CurriculumBlock } | null {
  for (const mod of c.modules) {
    const block = mod.blocks.find((b) => b.id === blockId);
    if (block) return { module: mod, block };
  }
  return null;
}

/**
 * AP-14 block prompt via AP-18 Didaktik helpers.
 * Prefer this over ad-hoc skeletons so variants/sections stay in sync with D-31.
 */
export function buildBlockGeneratePrompt(
  c: Curriculum,
  mod: CurriculumModule,
  block: CurriculumBlock,
): string {
  return buildDidaktikBlockPrompt(c, mod, block);
}

async function runLiveGenerate(
  key: string,
  keyword: string,
  blockId: string,
): Promise<GenerateAgentResult> {
  const c = loadMafCurriculum();
  const found = findCurriculumBlock(blockId, c);
  const prompt = found
    ? buildDidaktikBlockPrompt(c, found.module, found.block)
    : buildDidaktikKeywordPrompt(keyword, "sicherheit");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: anthropicHeaders({ apiKey: key }),
    body: JSON.stringify({
      model: GENERATOR_MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: `${prompt}\n(Kurs-Stichwort: ${keyword})` }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return {
      lernfeld: mafSeedLernfeldSicherheit(),
      mode: "live",
      modelId: GENERATOR_MODEL,
      warning: `Claude API ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") ?? "";
  const lernfeld = annotateCurriculumIds(
    parseLernfeldJson(text) ?? mafSeedLernfeldSicherheit(),
    found?.module.id ?? "M0",
    found?.block.id ?? "M0-3",
    found?.module.niveau,
    Boolean(found?.block.safety || found?.module.safety),
    found
      ? variantFromBlock({
          rechnen: found.block.rechnen,
          safety: found.block.safety || found.module.safety,
          topics: found.block.topics,
        })
      : "sicherheit",
  );
  return { lernfeld, mode: "live", modelId: GENERATOR_MODEL };
}

/** Submit Message Batch — one custom_id / request per curriculum block. */
async function submitBatchGenerate(
  key: string,
  opts: { keyword: string; blockId?: string; phaseId?: string },
): Promise<GenerateAgentResult> {
  const c = loadMafCurriculum();
  const targets: Array<{ module: CurriculumModule; block: CurriculumBlock }> = [];

  if (opts.blockId) {
    const found = findCurriculumBlock(opts.blockId, c);
    if (found) targets.push(found);
  } else {
    const mods = modulesForPhase(c, opts.phaseId ?? "A");
    for (const mod of mods) {
      for (const block of mod.blocks) targets.push({ module: mod, block });
    }
  }

  if (targets.length === 0) {
    throw new Error("No curriculum blocks to batch");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages/batches", {
    method: "POST",
    headers: anthropicHeaders({ apiKey: key }),
    body: JSON.stringify({
      requests: targets.map(({ module, block }) => ({
        custom_id: `maf-${block.id}`,
        params: {
          model: GENERATOR_MODEL,
          max_tokens: 8192,
          messages: [
            {
              role: "user",
              content: `${buildDidaktikBlockPrompt(c, module, block)}\n(Kurs-Stichwort: ${opts.keyword})`,
            },
          ],
        },
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { id?: string };
  return {
    lernfeld: mafSeedLernfeldSicherheit(),
    mode: "batch-pending",
    modelId: GENERATOR_MODEL,
    batchId: data.id,
    batchBlockIds: targets.map((t) => t.block.id),
    warning:
      "Batch submitted (one Didaktik request per curriculum block); returning seed M0-3 until results are polled (AP-14; full phase gen = AP-15).",
  };
}

function annotateCurriculumIds(
  lf: GeneratedLernfeld,
  moduleId: string,
  blockId: string,
  niveau?: string,
  safetyFlag?: boolean,
  variant?: GeneratedLernfeld["units"][number]["variant"],
): GeneratedLernfeld {
  return {
    ...lf,
    moduleId: lf.moduleId || moduleId,
    blockId: lf.blockId || blockId,
    units: lf.units.map((u) => ({
      ...u,
      moduleId: u.moduleId || moduleId,
      blockId: u.blockId || blockId,
      niveau: u.niveau || niveau,
      safetyFlag: u.safetyFlag ?? safetyFlag,
      variant: u.variant || variant,
    })),
  };
}

function parseLernfeldJson(text: string): GeneratedLernfeld | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as GeneratedLernfeld;
    if (!obj?.units?.length) return null;
    return obj;
  } catch {
    return null;
  }
}
