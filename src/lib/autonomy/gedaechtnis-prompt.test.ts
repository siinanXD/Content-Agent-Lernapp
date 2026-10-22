import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Worker liest das Gedächtnis als Lesekopie und bekommt kein gh api (SIN-615)", () => {
  const workflow = readFileSync(".github/workflows/claude.yml", "utf8");
  const tools = workflow.match(/--allowedTools "([^"]+)"/)?.[1].split(",") ?? [];
  // gh api als Präfix-Freigabe erlaubt auch -X PUT/DELETE: deshalb keine Freigabe, sondern eine Kopie vor dem Start.
  assert.deepEqual(tools.filter((t) => t.includes("gh api")), []);
  const kopie = workflow.indexOf("Gedächtnis bereitlegen (nur lesen)");
  assert.ok(kopie > 0 && kopie < workflow.indexOf("uses: anthropics/claude-code-action"), "Kopie vor dem Worker-Start");
  assert.match(workflow, /\.gedaechtnis\/" >> \.git\/info\/exclude/);
  assert.match(workflow, /Gedächtnis \(SIN-615\): Lies vor der Arbeit \.gedaechtnis\/index\.md/);
});
