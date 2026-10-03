import {
  collectBatchUnits,
  mergePhaseLernfeld,
  missingChunkTargets,
} from "../src/lib/generate/batch-generate";
import { getStorage } from "../src/lib/storage";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const batchId = process.argv[2] || "msgbatch_01U7QY6f9Jdi8P6DWx3pHV4H";
const courseId = process.argv[3] || "e22073de-7020-4380-9002-c70d46c25e25";

async function main() {
  const collected = await collectBatchUnits(batchId);
  const lf = mergePhaseLernfeld(collected.units);
  console.log(
    JSON.stringify({
      units: lf.units.length,
      failedChunks: collected.failedCustomIds.length,
      eur: collected.ledger.eurEstimate,
      missingChunks: missingChunkTargets(new Set(lf.units.map((u) => u.id))).length,
      sample: lf.units[0]
        ? {
            id: lf.units[0].id,
            sourceUrl: lf.units[0].sourceUrl,
            questions: lf.units[0].questions.length,
          }
        : null,
    }),
  );

  const storage = getStorage();
  console.log("storage", storage.backend);
  await storage.setGenerated(courseId, lf);
  mkdirSync(join("docs/ops/ap15-runs"), { recursive: true });
  writeFileSync(
    join("docs/ops/ap15-runs/salvage.json"),
    JSON.stringify(
      {
        batchId,
        courseId,
        units: lf.units.length,
        failed: collected.failedCustomIds,
        ledger: collected.ledger,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
