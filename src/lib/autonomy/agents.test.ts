import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { agentOf, loadAgents } from "../../../scripts/autonomy/agents.mjs";
import { STEPS, buildEvent } from "../../../scripts/autonomy/leitstand.mjs";

const agents = loadAgents() as { id: string; workflows: string[] }[];

test("Register: alle 9 Rollen mit Pflichtfeldern", () => {
  assert.deepEqual(
    agents.map((a) => a.id),
    ["research", "planer", "design", "coding", "pruefen", "betrieb", "content", "video"],
  );
  for (const a of agents as unknown as Record<string, unknown>[]) {
    for (const k of ["id", "name", "auftrag", "ausloeser", "workflows", "modell", "budget", "eingabe", "ausgabe"]) assert.ok(k in a, `${a.id}: ${k} fehlt`);
    assert.ok(typeof a.auftrag === "string" && a.auftrag.length > 0);
  }
});

test("jeder Workflow in .github/workflows/ gehört genau einem Agenten", () => {
  const files = readdirSync(".github/workflows")
    .filter((f) => f.endsWith(".yml"))
    .map((f) => f.replace(/\.yml$/, ""));
  for (const w of files) {
    const owners = agents.filter((a) => a.workflows.includes(w));
    assert.equal(owners.length, 1, `Workflow ${w}: ${owners.length} Agenten (genau 1 nötig, docs/autonomy/agents.json)`);
  }
  const known = new Set(files);
  for (const a of agents) for (const w of a.workflows) assert.ok(known.has(w), `${a.id}: Workflow ${w} existiert nicht`);
});

test("Ereignis trägt agent, abgeleitet aus dem Schritt", () => {
  const env = { GITHUB_REPOSITORY: "o/p", NODE_ENV: "test" as const };
  assert.equal(buildEvent({ schritt: "worker", status: "ok" }, env).agent, "coding");
  assert.equal(buildEvent({ schritt: "planner", status: "ok" }, env).agent, "planer");
  for (const s of STEPS) assert.ok(agentOf(s), `Schritt ${s} ohne Agent`);
});
