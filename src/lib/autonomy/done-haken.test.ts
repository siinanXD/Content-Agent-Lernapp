import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDone, offenKommentar, pruefeHaken, reconcile } from "../../../scripts/autonomy/linear.mjs";

const desc = "## Fertig-Kriterien\n- [ ] Alpha\n- [ ] Beta\n- [ ] Gamma";
const issue = (description?: string) => ({ id: "i1", identifier: "SIN-7", description, team: { id: "t" }, state: { name: "In Progress" } });
const pr = (body?: string) => ({ title: "feat: x (SIN-7)", head: "claude/sin-7", state: "closed", merged: true, body });

test("Part-of-PR gemergt ohne Belege: Issue bleibt offen (SIN-779)", () => {
  const [a] = reconcile([issue(desc)], [pr("Part of SIN-7\n\n## Was ändert sich\nx")]);
  assert.equal(a.to, "Offen");
  assert.equal(a.offen?.length, 3);
});

test("3 Haken, 1 belegt: bleibt offen, Kommentar nennt 2 offene", () => {
  const [a] = reconcile([issue(desc)], [pr("Part of SIN-7\n- [x] alpha")]);
  assert.equal(a.to, "Offen");
  assert.deepEqual(a.offen, ["Beta", "Gamma"]);
  assert.match(a.description, /- \[x\] Alpha\n- \[ \] Beta/);
  assert.match(offenKommentar(a.offen), /2 von den Fertig-Kriterien[^]*- Beta\n- Gamma/);
});

test("alle Haken belegt oder keine Haken: Done", () => {
  assert.equal(reconcile([issue(desc)], [pr("- [x] Alpha\n- [x] Beta\n- [X] Gamma")])[0].to, "Done");
  assert.equal(reconcile([issue("ohne Liste")], [pr("Part of SIN-7")])[0].to, "Done");
  assert.equal(reconcile([issue(undefined)], [pr()])[0].to, "Done");
});

test("pruefeHaken: bereits gesetzte Haken bleiben, Beleg nur aus dem PR-Text", () => {
  const r = pruefeHaken("- [x] A\n- [ ] B", ["- [ ] B"]);
  assert.deepEqual(r.offen, ["B"]);
  assert.equal(r.description, "- [x] A\n- [ ] B");
});

test("applyDone: offen → nur Kommentar (einmal), Done → Status", async () => {
  const calls: string[] = [];
  const call = async (q: string) => {
    calls.push(q.includes("commentCreate") ? "comment" : q.includes("issueUpdate") ? (q.includes("stateId") ? "state" : "desc") : q.includes("comments(") ? "read" : "states");
    if (q.includes("states")) return { team: { states: { nodes: [{ id: "s", name: "Done" }] } } };
    if (q.includes("comments(")) return { issue: { comments: { nodes: [] } } };
    return {};
  };
  const offen = { issue: issue(desc), offen: ["Beta"], description: "- [x] Alpha" };
  assert.equal(await applyDone(offen, { call }), false);
  assert.deepEqual(calls, ["desc", "read", "comment"]);
  calls.length = 0;
  assert.equal(await applyDone({ issue: issue("x"), offen: [], description: "x" }, { call }), true);
  assert.deepEqual(calls, ["states", "state"]);
});
