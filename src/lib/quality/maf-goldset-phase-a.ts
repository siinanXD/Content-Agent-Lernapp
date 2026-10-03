import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import moduleTargetsJson from "../../../docs/quality/module-targets-phase-a.json";
import type { GoldQuestion } from "./maf-goldset-fixture";

export type PhaseAGoldItem = GoldQuestion & {
  moduleId?: string;
};

export type PhaseAGoldsetFile = {
  name: string;
  description: string;
  retrievedAt: string;
  itemCount: number;
  sources?: string[];
  phaseAModules?: string[];
  phaseAItemsPerModule?: number;
  items: PhaseAGoldItem[];
};

/** Inflate docs/quality/_restore/maf-goldset-phase-a.json.zlib.b64 (canonical 90-item SoT). */
function loadPhaseAGoldset(): PhaseAGoldsetFile {
  const b64Path = join(
    __dirname,
    "../../../docs/quality/_restore/maf-goldset-phase-a.json.zlib.b64",
  );
  const b64 = readFileSync(b64Path, "utf8").trim();
  const raw = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
  return JSON.parse(raw) as PhaseAGoldsetFile;
}

export const MAF_GOLDSET_PHASE_A = loadPhaseAGoldset();
export const MAF_GOLDSET_PHASE_A_ITEMS: PhaseAGoldItem[] = MAF_GOLDSET_PHASE_A.items;
export const LANGFUSE_PHASE_A_DATASET = "maf-goldset-phase-a";

export const MODULE_TARGETS_PHASE_A = moduleTargetsJson as {
  calibratedAt: string;
  modelId: string;
  note: string;
  modules: Record<
    string,
    {
      sampleSize: number;
      sourceFidelity: number;
      uniqueness: number;
      niveau: number;
      language: number;
      unitsTarget: number;
    }
  >;
};

export function phaseAItemsByModule(moduleId: string): PhaseAGoldItem[] {
  return MAF_GOLDSET_PHASE_A_ITEMS.filter((i) => i.moduleId === moduleId);
}

export function assertPhaseAGoldsetCoverage(minPerModule = 5): void {
  for (const mid of ["M0", "LF1", "LF2", "PA"] as const) {
    const n = phaseAItemsByModule(mid).length;
    if (n < minPerModule) {
      throw new Error(`Goldset module ${mid}: ${n} < ${minPerModule}`);
    }
  }
}
