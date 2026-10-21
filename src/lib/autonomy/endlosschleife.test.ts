import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_NO_PR, noPrComment, noPrStreak, summarizeExecution } from "../../../scripts/autonomy/diagnose.mjs";
import { reconcile } from "../../../scripts/autonomy/linear.mjs";

const issue = (description: string, state = "Todo") => ({ identifier: "SIN-899", description, state: { name: state } });
const gemergt = (body: string) => ({ title: "fix: x (SIN-899)", head: "claude/sin-899", state: "closed", merged: true, body });

test("SIN-933: Todo mit gemergtem PR wird nicht neu gestartet, sondern Done", () => {
  const [a] = reconcile([issue("- [ ] alpha")], [gemergt("Part of SIN-899\n- [x] alpha")]);
  assert.equal(a.to, "Done");
});

test("SIN-933: nur [nach Aktivierung]-Haken offen → In Review, nie Todo", () => {
  const d = "- [x] Code\n- [ ] Läuft live [nach Aktivierung]";
  for (const state of ["Todo", "In Progress"]) {
    const [a] = reconcile([issue(d, state)], [gemergt("Part of SIN-899\n- [x] Code")]);
    assert.equal(a.to, "In Review");
  }
});

test("SIN-933: Todo mit echtem offenem Haken und Todo ohne gemergten PR bleiben unangetastet", () => {
  assert.deepEqual(reconcile([issue("- [ ] alpha")], [gemergt("Part of SIN-899")]), []);
  assert.deepEqual(reconcile([issue("- [ ] alpha")], [{ title: "x (SIN-899)", state: "closed", merged: false }]), []);
});

test("SIN-933: zweimal kein Diff stoppt (needs-human), auch bei langem Kommentarverlauf", () => {
  const s = summarizeExecution("");
  const kein = (t: string) => ({ body: noPrComment("SIN-899", s), createdAt: t });
  assert.equal(MAX_NO_PR, 2);
  const alt = Array.from({ length: 60 }, (_, i) => ({ body: "Haken-Start abc: 1 offen", createdAt: `2026-10-0${1 + (i % 9)}T00:00:00Z` }));
  assert.ok(noPrStreak([...alt, kein("2026-10-20T01:00:00Z"), kein("2026-10-20T02:00:00Z")]) >= MAX_NO_PR);
});
