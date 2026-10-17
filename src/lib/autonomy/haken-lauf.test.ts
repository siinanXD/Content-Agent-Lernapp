import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPrompt, hakenStartKommentar, hakenStreak, MAX_HAKEN_STARTS } from "../../../scripts/autonomy/linear.mjs";
import { withoutStalledHaken } from "../../../scripts/autonomy/dispatch.mjs";
import { liveText } from "../../../scripts/autonomy/live.mjs";

const issue = { identifier: "SIN-768", title: "t", description: "## Fertig, wenn\n- [x] A erledigt\n- [ ] B offen\n- [ ] C offen" };

test("Prompt nennt genau die offenen Haken und verbietet den Verweis auf alte PRs (SIN-795)", () => {
  const p = buildPrompt(issue);
  assert.match(p, /Offene Haken \(SIN-795\)/);
  assert.match(p, /- \[ \] B offen\n- \[ \] C offen\n/);
  assert.match(p, /kein Ergebnis und kein Beleg/);
  assert.match(p, /live\.mjs blockiert SIN-768/);
});

test("Prompt ohne offene Haken hat keinen Haken-Abschnitt", () => {
  assert.doesNotMatch(buildPrompt({ ...issue, description: "- [x] A" }), /Offene Haken/);
});

test("blockiert: Kommentar „blockiert: Grund“, ohne Grund keiner", () => {
  assert.equal(liveText("blockiert", { text: "Secret fehlt" }), "blockiert: Secret fehlt");
  assert.equal(liveText("blockiert"), "");
  assert.equal(liveText("wieder-offen", { text: "Haken ohne Beleg" }), "Wieder geöffnet: Haken ohne Beleg");
  assert.equal(liveText("wieder-offen"), "");
});

test("Derselbe Haken-Stand: nach MAX_HAKEN_STARTS Starts Pause, neuer Stand zählt neu", () => {
  const offen = ["B offen", "C offen"];
  const start = (o: string[], at: string) => ({ body: hakenStartKommentar(o), createdAt: at });
  assert.equal(MAX_HAKEN_STARTS, 2);
  assert.equal(hakenStreak([], offen), 0);
  assert.equal(hakenStreak([start(offen, "2026-10-16T10:00:00Z")], offen), 1);
  assert.equal(hakenStreak([start(offen, "2026-10-16T10:00:00Z"), start(offen, "2026-10-16T12:00:00Z")], offen), 2);
  // Fortschritt dazwischen (anderer Stand) unterbricht die Folge
  assert.equal(hakenStreak([start(offen, "2026-10-16T10:00:00Z"), start(["B offen"], "2026-10-16T11:00:00Z")], ["B offen"]), 1);
  assert.equal(hakenStreak([start(["B offen"], "2026-10-16T10:00:00Z"), start(offen, "2026-10-16T11:00:00Z")], offen), 1);
});

test("Angehaltene Issues vorn lassen die freien nachrücken (SIN-818)", async () => {
  const offen = ["B offen"];
  const stall = (id: string) => ({ identifier: id, id, description: "- [ ] B offen" });
  const frei = (id: string) => ({ identifier: id, id, description: "- [x] fertig" });
  const queue = [stall("SIN-1"), stall("SIN-2"), frei("SIN-3"), frei("SIN-4"), frei("SIN-5")];
  const lese = async () => Array.from({ length: MAX_HAKEN_STARTS }, (_, i) => ({ body: hakenStartKommentar(offen), createdAt: `2026-10-16T1${i}:00:00Z` }));
  const { go, skipped } = await withoutStalledHaken(queue, 2, true, lese);
  assert.deepEqual(go.map((i) => i.identifier), ["SIN-3", "SIN-4"]);
  assert.deepEqual(skipped, ["SIN-1", "SIN-2"]);
});

test("Worker zählt nur offene oder neue PRs als Ergebnis, nicht alte gemergte vom selben Branch", () => {
  const w = readFileSync(".github/workflows/worker.yml", "utf8");
  assert.doesNotMatch(w, /--state all --json (number|url) --jq/);
  assert.match(w, /LAUF_START=/);
  assert.equal(w.split('select(.state==\\"OPEN\\" or .createdAt >= \\"$LAUF_START\\")').length - 1, 4);
});
