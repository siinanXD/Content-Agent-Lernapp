import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const wf = (n: string) => readFileSync(`.github/workflows/${n}.yml`, "utf8");

test("Anstoß (SIN-334): Merge → genau ein Dispatch-Aufruf in post-merge", () => {
  const s = wf("post-merge");
  assert.equal((s.match(/workflow_id: "dispatch\.yml"/g) ?? []).length, 1);
  assert.match(s, /AGENT_WORKFLOW_TOKEN/);
});

test("Anstoß (SIN-334): Worker ohne PR stößt den Dispatcher an", () => {
  const s = wf("worker");
  assert.match(s, /name: Dispatcher anstoßen \(Platz frei\)[\s\S]*?gh workflow run dispatch\.yml/);
});

test("Anstoß (SIN-334): Gruppe dispatch ohne Abbruch verhindert Doppelstarts, Zeitplan bleibt", () => {
  const s = wf("dispatch");
  assert.match(s, /group: dispatch\n\s+cancel-in-progress: false/);
  assert.match(s, /cron: "\*\/30 \* \* \* \*"/);
});
