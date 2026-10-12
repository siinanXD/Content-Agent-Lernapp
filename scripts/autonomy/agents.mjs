/**
 * Agenten-Register (SIN-481): `docs/autonomy/agents.json` ist die einzige Quelle. Ein Agent ist eine Rolle,
 * unter der bestehende Workflows gebündelt sind. Der Leitstand-Schreiber leitet daraus das Feld `agent` ab.
 */
import { readFileSync } from "node:fs";

const REGISTER = new URL("../../docs/autonomy/agents.json", import.meta.url);

export function loadAgents(file = REGISTER) {
  return JSON.parse(readFileSync(file, "utf8")).agents;
}

/** Workflow-Name (Dateiname ohne .yml) → Agent-ID; `null`, wenn keiner zugeordnet ist. */
export function agentOf(workflow, agents = loadAgents()) {
  return agents.find((a) => a.workflows.includes(workflow))?.id ?? null;
}
