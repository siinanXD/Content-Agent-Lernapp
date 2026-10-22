import assert from "node:assert/strict";
import { test } from "node:test";
import { addLabel } from "../../../scripts/autonomy/linear.mjs";

test("SIN-818: addLabel findet auch Workspace-Labels (needs-human hat kein Team)", async () => {
  const calls: { q: string; v: unknown }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- linear.mjs ist untypisiert
  const call = async (q: string, v: unknown = {}): Promise<any> => {
    calls.push({ q, v });
    return q.startsWith("query") ? { issueLabels: { nodes: [{ id: "L1" }] } } : { issueAddLabel: { success: true } };
  };
  await addLabel({ id: "I1", team: { id: "T1" } }, "needs-human", call);
  assert.match(calls[0].q, /team: \{ null: true \}/);
  assert.deepEqual(calls[1].v, { id: "I1", l: "L1" });
});
