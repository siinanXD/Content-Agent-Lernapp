import goldsetJson from "../../../docs/quality/maf-goldset-70.json";
import type { GoldQuestion } from "./maf-goldset-fixture";

export type GoldsetFile = {
  name: string;
  description: string;
  retrievedAt: string;
  itemCount: number;
  sources: string[];
  items: GoldQuestion[];
};

export const MAF_GOLDSET_70 = goldsetJson as GoldsetFile;

export const MAF_GOLDSET_ITEMS: GoldQuestion[] = MAF_GOLDSET_70.items;

export const LANGFUSE_DATASET_NAME = "maf-goldset-70";

export function passableGoldset(items: GoldQuestion[] = MAF_GOLDSET_ITEMS): GoldQuestion[] {
  return items.filter(
    (q) => q.expected.sourceFidelity === 1 && q.expected.uniqueness === 1,
  );
}

export function goldsetAverages(items: GoldQuestion[] = MAF_GOLDSET_ITEMS) {
  const passable = passableGoldset(items);
  const n = passable.length || 1;
  return {
    sampleSize: items.length,
    passableCount: passable.length,
    niveau:
      Math.round(
        (passable.reduce((s, q) => s + q.expected.niveau, 0) / n) * 10,
      ) / 10,
    language:
      Math.round(
        (passable.reduce((s, q) => s + q.expected.language, 0) / n) * 10,
      ) / 10,
  };
}
