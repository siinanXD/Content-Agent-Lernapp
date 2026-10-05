/**
 * AP-15: Message Batches for Phase A — chunk large blocks, poll results, merge units.
 * Model: claude-sonnet-5-5 (D-06). One logical block may become several custom_ids when units > CHUNK.
 */

import {
  blockSources,
  loadMafCurriculum,
  modulesForPhase,
  type Curriculum,
  type CurriculumBlock,
  type CurriculumModule,
} from "@/lib/content/curriculum";
import { variantFromBlock } from "@/lib/content/didaktik";
import { modulesToGenerate } from "@/lib/content/shared-modules";
import { anthropicFetch, GENERATOR_MODEL } from "@/lib/anthropic/client";
import { buildDidaktikBlockPrompt } from "./didaktik-prompts";
import type { GeneratedLernfeld, GeneratedUnit } from "./maf-lernfeld-seed";
import {
  addClaudeMeasuredUsage,
  type ClaudeUsage,
  type CostLedger,
  emptyLedger,
} from "@/lib/quality/cost-guard";

/** Units per Batch request — 2 keeps Didaktik JSON under typical output size. */
export const UNITS_PER_CHUNK = 2;
/** claude-sonnet-5-5 supports up to 128k; 64k leaves headroom for 2 full units. */
export const MAX_OUTPUT_TOKENS = 64000;

export type BatchChunkTarget = {
  customId: string;
  module: CurriculumModule;
  block: CurriculumBlock;
  unitOffset: number;
  unitCount: number;
};

export type BatchSubmitResult = {
  batchId: string;
  customIds: string[];
  chunkCount: number;
  unitTarget: number;
};

export type BatchPollResult = {
  batchId: string;
  status: string;
  units: GeneratedUnit[];
  failedCustomIds: string[];
  ledger: CostLedger;
  rawResultsPath?: string;
};

/**
 * `publishedShared`: Module-IDs gemeinsamer Module (AP-20), die schon veröffentlicht
 * sind. Sie werden nicht erneut erzeugt, sondern per Verknüpfung genutzt.
 */
export function phaseAChunks(
  phaseId = "A",
  c: Curriculum = loadMafCurriculum(),
  publishedShared: ReadonlySet<string> = new Set(),
): { targets: BatchChunkTarget[]; unitTarget: number } {
  const mods = modulesToGenerate(modulesForPhase(c, phaseId), publishedShared).generate;
  const targets: BatchChunkTarget[] = [];
  let unitTarget = 0;
  for (const mod of mods) {
    for (const block of mod.blocks) {
      unitTarget += block.units;
      for (let offset = 0; offset < block.units; offset += UNITS_PER_CHUNK) {
        const unitCount = Math.min(UNITS_PER_CHUNK, block.units - offset);
        targets.push({
          customId: `maf-${block.id}-u${offset}-${offset + unitCount - 1}`,
          module: mod,
          block,
          unitOffset: offset,
          unitCount,
        });
      }
    }
  }
  return { targets, unitTarget };
}

export function chunkPrompt(
  c: Curriculum,
  module: CurriculumModule,
  block: CurriculumBlock,
  unitOffset: number,
  unitCount: number,
  keyword: string,
): string {
  const base = buildDidaktikBlockPrompt(c, module, block);
  return `${base}

WICHTIG — Teilauftrag: Erzeuge genau ${unitCount} Einheiten (Index ${unitOffset + 1} bis ${unitOffset + unitCount} von ${block.units} im Block).
Unit-IDs: "${block.id}-u${unitOffset + 1}" … "${block.id}-u${unitOffset + unitCount}".
Keine anderen Einheiten. (Kurs-Stichwort: ${keyword})`;
}

export async function submitChunkTargets(opts: {
  keyword: string;
  targets: BatchChunkTarget[];
  /** Default: GENERATOR_MODEL (Config). */
  model?: string;
  /** Gemeinsamer Präfix, optional mit cache_control (Prompt Caching). */
  system?: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>;
}): Promise<BatchSubmitResult> {
  const c = loadMafCurriculum();
  if (opts.targets.length === 0) throw new Error("No chunks to submit");
  const unitTarget = opts.targets.reduce((s, t) => s + t.unitCount, 0);

  const res = await anthropicFetch("/v1/messages/batches", {
    method: "POST",
    body: JSON.stringify({
      requests: opts.targets.map((t) => ({
        custom_id: t.customId,
        params: {
          model: opts.model ?? GENERATOR_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          ...(opts.system ? { system: opts.system } : {}),
          messages: [
            {
              role: "user",
              content: chunkPrompt(
                c,
                t.module,
                t.block,
                t.unitOffset,
                t.unitCount,
                opts.keyword,
              ),
            },
          ],
        },
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch submit ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Batch submit missing id");
  return {
    batchId: data.id,
    customIds: opts.targets.map((t) => t.customId),
    chunkCount: opts.targets.length,
    unitTarget,
  };
}

export async function submitPhaseBatch(opts: {
  keyword: string;
  phaseId?: string;
  publishedShared?: ReadonlySet<string>;
}): Promise<BatchSubmitResult> {
  const c = loadMafCurriculum();
  const { targets } = phaseAChunks(opts.phaseId ?? "A", c, opts.publishedShared);
  return submitChunkTargets({ keyword: opts.keyword, targets });
}

/** Rebuild chunk targets for unit slots still missing after a partial batch. */
export function missingChunkTargets(
  haveUnitIds: Set<string>,
  phaseId = "A",
  c: Curriculum = loadMafCurriculum(),
): BatchChunkTarget[] {
  const { targets } = phaseAChunks(phaseId, c);
  return targets.filter((t) => {
    for (let i = 0; i < t.unitCount; i++) {
      const id = `${t.block.id}-u${t.unitOffset + i + 1}`;
      if (!haveUnitIds.has(id)) return true;
    }
    return false;
  });
}

export async function submitRegenBatch(opts: {
  keyword: string;
  unitSpecs: Array<{ moduleId: string; blockId: string; unitId: string; titleHint?: string }>;
}): Promise<BatchSubmitResult> {
  const c = loadMafCurriculum();
  const requests = [];
  for (const spec of opts.unitSpecs) {
    const mod = c.modules.find((m) => m.id === spec.moduleId);
    const block = mod?.blocks.find((b) => b.id === spec.blockId);
    if (!mod || !block) continue;
    const offsetMatch = spec.unitId.match(/u(\d+)$/i);
    const unitOffset = offsetMatch ? Math.max(0, Number(offsetMatch[1]) - 1) : 0;
    requests.push({
      custom_id: `regen-${spec.unitId}`,
      params: {
        model: GENERATOR_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          {
            role: "user",
            content: `${chunkPrompt(c, mod, block, unitOffset, 1, opts.keyword)}
Nachbesserung: vorherige Version fiel durch die Qualitäts-Schranke. Eine korrekte Quelle, eine richtige Antwort, Niveau ${mod.niveau}. Titel-Hinweis: ${spec.titleHint ?? spec.unitId}.`,
          },
        ],
      },
    });
  }
  if (requests.length === 0) throw new Error("No regen targets");

  const res = await anthropicFetch("/v1/messages/batches", {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Regen batch ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Regen batch missing id");
  return {
    batchId: data.id,
    customIds: requests.map((r) => r.custom_id as string),
    chunkCount: requests.length,
    unitTarget: requests.length,
  };
}

type BatchStatus = {
  id: string;
  processing_status: string;
  request_counts?: { processing?: number; succeeded?: number; errored?: number; canceled?: number; expired?: number };
  results_url?: string | null;
};

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  const res = await anthropicFetch(`/v1/messages/batches/${batchId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch status ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as BatchStatus;
}

export async function pollBatchUntilDone(
  batchId: string,
  opts?: { intervalMs?: number; timeoutMs?: number; onTick?: (s: BatchStatus) => void },
): Promise<BatchStatus> {
  const interval = opts?.intervalMs ?? 15_000;
  const timeout = opts?.timeoutMs ?? 6 * 60 * 60 * 1000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = await getBatchStatus(batchId);
    opts?.onTick?.(status);
    if (status.processing_status === "ended") return status;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Batch ${batchId} timed out after ${timeout}ms`);
}

export async function collectBatchUnits(batchId: string): Promise<BatchPollResult> {
  const status = await getBatchStatus(batchId);
  if (status.processing_status !== "ended") {
    throw new Error(`Batch not ended: ${status.processing_status}`);
  }
  const resultsUrl = status.results_url;
  if (!resultsUrl) throw new Error("Batch missing results_url");

  // results_url is absolute; use raw fetch with anthropic headers
  const { anthropicHeaders } = await import("@/lib/anthropic/client");
  const res = await fetch(resultsUrl, { headers: anthropicHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Results fetch ${res.status}: ${text.slice(0, 200)}`);
  }
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());
  const c = loadMafCurriculum();
  const units: GeneratedUnit[] = [];
  const failedCustomIds: string[] = [];
  let ledger = emptyLedger();

  for (const line of lines) {
    let row: {
      custom_id?: string;
      result?: {
        type?: string;
        message?: {
          content?: Array<{ type: string; text?: string }>;
          usage?: ClaudeUsage;
        };
        error?: { message?: string };
      };
    };
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const customId = row.custom_id ?? "";
    const usage = row.result?.message?.usage;
    if (usage) {
      ledger = addClaudeMeasuredUsage(ledger, usage);
    }
    if (row.result?.type !== "succeeded" || !row.result.message) {
      failedCustomIds.push(customId);
      continue;
    }
    const body =
      row.result.message.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n") ?? "";
    const parsed = parseLernfeldJson(body);
    if (!parsed?.units?.length) {
      failedCustomIds.push(customId);
      continue;
    }
    const meta = resolveCustomId(customId, c);
    for (const u of parsed.units) {
      units.push(annotateUnit(u, meta));
    }
  }

  return {
    batchId,
    status: status.processing_status,
    units,
    failedCustomIds,
    ledger,
  };
}

function resolveCustomId(
  customId: string,
  c: Curriculum,
): { module: CurriculumModule; block: CurriculumBlock } | null {
  const m = customId.match(/^(?:maf|regen)-([A-Z0-9]+-\d+)/i);
  const blockId = m?.[1];
  if (!blockId) return null;
  for (const mod of c.modules) {
    const block = mod.blocks.find((b) => b.id === blockId);
    if (block) return { module: mod, block };
  }
  return null;
}

function annotateUnit(
  u: GeneratedUnit,
  meta: { module: CurriculumModule; block: CurriculumBlock } | null,
): GeneratedUnit {
  const c = loadMafCurriculum();
  const defaultUrl =
    (meta ? blockSources(c, meta.block)[0]?.url : undefined) ??
    c.sources[0]?.url ??
    "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
  const fetched =
    (meta ? blockSources(c, meta.block)[0]?.fetchedAt : undefined) ??
    c.version ??
    "2026-10-03";
  const variant = meta
    ? variantFromBlock({
        rechnen: meta.block.rechnen,
        safety: meta.block.safety || meta.module.safety,
        topics: meta.block.topics,
      })
    : u.variant;
  const raw = u as GeneratedUnit & { source_url?: string; source_fetched_at?: string };
  const sourceUrl = u.sourceUrl || raw.source_url || defaultUrl;
  const sourceFetchedAt = u.sourceFetchedAt || raw.source_fetched_at || fetched;
  const minutes =
    typeof u.minutes === "number" && u.minutes > 0 ? u.minutes : 8;
  const questions = (u.questions ?? []).map((q, i) => ({
    ...q,
    id: q.id || `q${i + 1}`,
    type: q.type || "auswahl",
    prompt: q.prompt || "",
    correct: q.correct ?? "",
    explanation: q.explanation || "",
    sourceUrl: q.sourceUrl || sourceUrl,
  }));
  return {
    ...u,
    id: u.id || `${meta?.block.id ?? "u"}-u1`,
    title: u.title || meta?.block.title || "Einheit",
    minutes,
    explanation: u.explanation || u.sections?.kern || "",
    sourceUrl,
    sourceFetchedAt,
    moduleId: u.moduleId || meta?.module.id,
    blockId: u.blockId || meta?.block.id,
    niveau: u.niveau || meta?.module.niveau,
    safetyFlag: u.safetyFlag ?? Boolean(meta?.block.safety || meta?.module.safety),
    variant: u.variant || variant,
    questions,
  };
}

export function mergePhaseLernfeld(units: GeneratedUnit[]): GeneratedLernfeld {
  const sorted = [...units].sort((a, b) => a.id.localeCompare(b.id, "de"));
  // Dedupe by id — regen wins if appended later
  const byId = new Map<string, GeneratedUnit>();
  for (const u of sorted) byId.set(u.id, u);
  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "de"));
  return {
    id: "phase-a-maf-metall",
    title: "Phase A — M0, LF1, LF2, PA",
    focus: "Pilot-Kern: Querschnitt, Fertigen von Hand und mit Maschinen, Produktionsanlagen",
    moduleId: "PHASE-A",
    blockId: "PHASE-A",
    units: merged,
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
