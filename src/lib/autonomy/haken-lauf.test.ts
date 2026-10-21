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

test("Schlange [angehalten, angehalten, frei, frei] mit 2 Plätzen: die beiden freien starten (SIN-818)", async () => {
  const stall = (id: string) => ({ identifier: id, id, description: "- [ ] B offen" });
  const frei = (id: string) => ({ identifier: id, id, description: "- [x] fertig" });
  const lese = async () => Array.from({ length: MAX_HAKEN_STARTS }, (_, i) => ({ body: hakenStartKommentar(["B offen"]), createdAt: `2026-10-16T1${i}:00:00Z` }));
  const { go, skipped } = await withoutStalledHaken([stall("SIN-1"), stall("SIN-2"), frei("SIN-3"), frei("SIN-4")], 2, true, lese);
  assert.deepEqual(go.map((i) => i.identifier), ["SIN-3", "SIN-4"]);
  assert.deepEqual(skipped, ["SIN-1", "SIN-2"]);
});

test("Zweiter Lauf mit gleichem Stand: 0 neue Kommentare, 1 bearbeiteter (SIN-892)", async () => {
  const offen = ["B offen"];
  const iss = { identifier: "SIN-9", id: "i9", description: "- [ ] B offen" };
  const comments: { id: string; body: string; createdAt: string }[] = Array.from({ length: MAX_HAKEN_STARTS }, (_, i) => ({ id: `s${i}`, body: hakenStartKommentar(offen), createdAt: `2026-10-16T1${i}:00:00Z` }));
  const neu: string[] = [];
  const bearbeitet: string[] = [];
  let labelOk = true;
  const io = {
    comment: async (_: string, body: string) => void (neu.push(body), comments.push({ id: `p${neu.length}`, body, createdAt: "2026-10-16T20:00:00Z" })),
    updateComment: async (id: string, body: string) => void bearbeitet.push(`${id}|${body}`),
    addLabel: async () => {
      if (!labelOk) throw new Error("fehlt");
    },
  };
  const lauf = () => withoutStalledHaken([iss], 1, false, async () => comments, io);
  await lauf();
  assert.equal(neu.length, 1);
  assert.match(neu[0], /needs-human`; nach der Klärung/);
  await lauf();
  assert.equal(neu.length, 1);
  assert.equal(bearbeitet.length, 1);
  assert.ok(bearbeitet[0].startsWith("p1|"));
  labelOk = false;
  await lauf();
  assert.match(bearbeitet[1], /konnte nicht gesetzt werden/);
  assert.doesNotMatch(bearbeitet[1], /nach der Klärung entfernen/);
});

test("Worker zählt nur offene oder neue PRs als Ergebnis, nicht alte gemergte vom selben Branch", () => {
  const w = readFileSync(".github/workflows/worker.yml", "utf8");
  assert.doesNotMatch(w, /--state all --json (number|url) --jq/);
  assert.match(w, /LAUF_START=/);
  assert.equal(w.split('select(.state==\\"OPEN\\" or .createdAt >= \\"$LAUF_START\\")').length - 1, 4);
});
