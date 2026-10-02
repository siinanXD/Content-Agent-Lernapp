import { MAF_GOLDSET_ITEMS } from "../src/lib/quality/maf-goldset";
import { ensureGoldsetDataset } from "../src/lib/quality/langfuse-client";

async function main() {
  const result = await ensureGoldsetDataset(MAF_GOLDSET_ITEMS);
  if (!result) {
    throw new Error("LANGFUSE_* missing or dataset upsert failed");
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
