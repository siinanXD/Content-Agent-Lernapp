import assert from "node:assert/strict";
import { test } from "node:test";
import { einsortieren, main as einsortierenMain, parseFertigListe } from "../../../scripts/autonomy/einsortieren.mjs";
import { buildSnapshot } from "../../../scripts/autonomy/leitstand.mjs";
import { classifyNew, fetchProgress, ideaSlotFree, isIdea, pickMany, progressOf, startOrder } from "../../../scripts/autonomy/linear.mjs";
import { validatePlan } from "../../../scripts/autonomy/planner.mjs";

const mk = (identifier: string, over: Record<string, unknown> = {}, labels: string[] = [], milestone?: string) => ({
  id: identifier,
  identifier,
  title: identifier,
  priority: 3,
  state: { name: "Todo", type: "unstarted" },
  inverseRelations: { nodes: [] },
  labels: { nodes: labels.map((name) => ({ name })) },
  ...(milestone ? { projectMilestone: { name: milestone } } : {}),
  ...over,
});
const ids = (list: { identifier: string }[]) => list.map((i) => i.identifier);

test("Dispatcher: dringend vor v1 vor Idee, dringend überspringt alles", () => {
  const issues = [
    mk("SIN-1", {}, ["backend"], "v2 Ideen"),
    mk("SIN-2", {}, ["backend"], "v1 Grundgerüst"),
    mk("SIN-3", { priority: 4 }, ["backend", "dringend"], "v2 Ideen"),
    mk("SIN-4", {}, ["backend", "idee"]),
  ];
  assert.deepEqual(ids(startOrder(issues)), ["SIN-3", "SIN-2", "SIN-1"]);
});

test("Dispatcher: Ideen erst nach v1, älteste zuerst, höchstens eine", () => {
  const issues = [mk("SIN-9", {}, ["idee"]), mk("SIN-5", {}, ["idee"]), mk("SIN-7", {}, ["backend"])];
  assert.deepEqual(ids(pickMany(issues, 2).issues), ["SIN-7", "SIN-5"]);
  // Ohne v1 nur eine Idee, auch bei zwei freien Plätzen.
  assert.deepEqual(ids(pickMany([issues[0], issues[1]], 2).issues), ["SIN-5"]);
});

test("Dispatcher: eine Idee je Woche (Slot belegt → keine Idee, v1 läuft weiter)", () => {
  const issues = [mk("SIN-5", {}, ["idee"]), mk("SIN-7", {}, ["backend"])];
  assert.deepEqual(ids(startOrder(issues, () => true, { ideaSlot: false })), ["SIN-7"]);
  assert.deepEqual(ids(pickMany([issues[0]], 2, () => true, new Set(), { ideaSlot: false }).issues), []);
  const now = new Date("2026-10-14T12:00:00Z");
  assert.equal(ideaSlotFree(["2026-10-10T12:00:00Z"], now), false);
  assert.equal(ideaSlotFree(["2026-10-06T12:00:00Z"], now), true);
  assert.equal(ideaSlotFree([], now), true);
});

test("Dispatcher: Idee im Backlog ist Kandidat, v1 im Backlog nicht", () => {
  const backlog = { state: { name: "Backlog", type: "backlog" } };
  assert.deepEqual(ids(startOrder([mk("SIN-5", backlog, ["idee"]), mk("SIN-6", backlog, ["backend"])])), ["SIN-5"]);
});

test("Idee-Erkennung: Label oder Meilenstein v2", () => {
  assert.equal(isIdea(mk("SIN-1", {}, ["idee"])), true);
  assert.equal(isIdea(mk("SIN-1", {}, [], "v2 Ideen")), true);
  assert.equal(isIdea(mk("SIN-1", {}, [], "v1 Grundgerüst")), false);
  assert.equal(isIdea(mk("SIN-1")), false);
});

test("Neue Issues: Ideen → Backlog, v2, Label idee; dringend bleibt v1", () => {
  assert.deepEqual(classifyNew({ idee: true, labels: ["backend"] }), { labels: ["backend", "idee"], state: "Backlog", milestone: "v2 Ideen" });
  assert.deepEqual(classifyNew({ labels: ["backend"] }), { labels: ["backend"], state: "Todo", milestone: "v1 Grundgerüst" });
  assert.deepEqual(classifyNew({ idee: true, labels: ["dringend"] }), { labels: ["dringend"], state: "Todo", milestone: "v1 Grundgerüst" });
});

test("Planer: Ideen kommen am Ende, zählen nicht gegen die Spuren", () => {
  const entry = (title: string, over = {}) => ({ lane: "backend", title, description: "x", acceptance: ["a"], priority: 2, size: "mittel", ...over });
  const plan = [entry("A"), entry("B"), entry("C"), entry("D"), entry("Idee 1", { idee: true }), entry("Idee 2", { idee: true, lane: "frontend" })];
  const out = validatePlan(plan);
  assert.deepEqual(out.map((i: { title: string }) => i.title), ["A", "B", "C", "Idee 1", "Idee 2"]);
  assert.deepEqual(out[3].labels, ["backend", "idee"]);
  assert.equal(out[3].idee, true);
  assert.equal(out[0].idee, undefined);
});

test("Fortschritt: v1 fertig/gesamt, offene Ideen", () => {
  const done = { state: { type: "completed" } };
  const issues = [mk("SIN-1", done, [], "v1 Grundgerüst"), mk("SIN-2"), mk("SIN-3", {}, ["idee"]), mk("SIN-4", done, ["idee"])];
  assert.deepEqual(progressOf(issues), { fertig_v1: 1, gesamt_v1: 2, ideen_offen: 1 });
});

test("Fortschritt: Abfrage liefert die drei Zahlen", async () => {
  const call = async () => ({ issues: { nodes: [mk("SIN-1", { state: { type: "completed" } }), mk("SIN-2", {}, ["idee"])] } });
  assert.deepEqual(await fetchProgress(call as never), { fertig_v1: 1, gesamt_v1: 1, ideen_offen: 1 });
});

test("loop_snapshot enthält die drei Zahlen je Projekt", () => {
  const env = { GITHUB_REPOSITORY: "siinanXD/Content-Agent-Lernapp", NODE_ENV: "test" as const };
  const snap = buildSnapshot({ progress: { fertig_v1: 4, gesamt_v1: 19, ideen_offen: 7 } }, env, new Date("2026-10-13T10:00:00Z"));
  assert.equal(snap.fertig_v1, 4);
  assert.equal(snap.gesamt_v1, 19);
  assert.equal(snap.ideen_offen, 7);
  // Ohne Fortschritt bleiben die Spalten unberührt (kein Überschreiben mit null).
  assert.equal("fertig_v1" in buildSnapshot({}, env), false);
});

test("Einsortieren Lern-App: Prüfungen und Labels → v1, sonst v2", () => {
  const t = (title: string, labels: string[] = [], over = {}) => mk("SIN-1", { title, ...over }, labels);
  assert.equal(einsortieren(t("Impressum ergänzen")).ziel, "v1");
  assert.equal(einsortieren(t("Offline-Hinweis")).ziel, "v1");
  assert.equal(einsortieren(t("Etwas kaputt", ["bug"])).ziel, "v1");
  assert.equal(einsortieren(t("Streak-Animation", ["frontend"])).ziel, "v2");
});

test("Einsortieren Leitstand: Kennung oder zwei Schlagwörter der Fertig-Liste", () => {
  const fertig = parseFertigListe("1. Übersicht „einfach“ inkl. Live-Kette\n6. Anmeldung Handy (Kopplung, [SIN-525](https://x))\n7. Push-Mitteilungen abonnieren");
  assert.equal(einsortieren(mk("SIN-525"), { fertig }).ziel, "v1");
  assert.equal(einsortieren(mk("SIN-1", { title: "Push-Mitteilungen abonnieren: Service-Worker" }), { fertig }).ziel, "v1");
  assert.equal(einsortieren(mk("SIN-2", { title: "Dunkler Modus" }), { fertig }).ziel, "v2");
});

test("Einsortieren: Trockenlauf ändert nichts, echter Lauf setzt Meilenstein und Label", async () => {
  const open = [
    { ...mk("SIN-1", { title: "Impressum", team: { id: "t" }, project: { id: "p" } }) },
    { ...mk("SIN-2", { title: "Nette Idee", team: { id: "t" }, project: { id: "p" } }) },
    { ...mk("SIN-3", { title: "Schon sortiert", team: { id: "t" }, project: { id: "p" } }, [], "v1 Grundgerüst") },
  ];
  const calls: string[] = [];
  const call = async (q: string) => {
    calls.push(q);
    if (q.includes("issues(first")) return { issues: { nodes: open } };
    if (q.includes("projectMilestones")) return { project: { projectMilestones: { nodes: [{ id: "m1", name: "v1 Grundgerüst" }, { id: "m2", name: "v2 Ideen" }] } } };
    if (q.includes("issueLabels")) return { issueLabels: { nodes: [{ id: "l" }] } };
    return {};
  };
  const quiet = console.log;
  console.log = () => {};
  try {
    await einsortierenMain(["--projekt", "P"], call as never);
    assert.equal(calls.filter((q) => q.includes("mutation")).length, 0);
    const rows = await einsortierenMain(["--projekt", "P", "--apply"], call as never);
    assert.deepEqual(rows.map((r: { ziel: string }) => r.ziel), ["v1", "v2"]);
    assert.equal(calls.filter((q) => q.includes("issueUpdate")).length, 2);
    assert.equal(calls.filter((q) => q.includes("issueAddLabel")).length, 1);
  } finally {
    console.log = quiet;
  }
});
