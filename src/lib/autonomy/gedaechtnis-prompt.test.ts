import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Worker liest das Gedächtnis und darf genau das per gh api (SIN-615)", () => {
  const workflow = readFileSync(".github/workflows/claude.yml", "utf8");
  const tools = workflow.match(/--allowedTools "([^"]+)"/)?.[1].split(",") ?? [];
  assert.deepEqual(tools.filter((t) => t.startsWith("Bash(gh api")), ["Bash(gh api repos/siinanXD/gedaechtnis/contents:*)"]);
  assert.match(workflow, /gh api repos\/siinanXD\/gedaechtnis\/contents\/index\.md/);
  // Jeder gh-api-Aufruf im Prompt muss von der Freigabe gedeckt sein, sonst verweigert der Headless-Lauf ihn still.
  for (const m of workflow.matchAll(/gh api (\S+)/g)) assert.ok(m[1].startsWith("repos/siinanXD/gedaechtnis/contents"), m[1]);
});
