import assert from "node:assert/strict";
import { test } from "node:test";
import { findDuplicate, splitDuplicates, titleSimilarity } from "../../../scripts/autonomy/duplicates.mjs";
import { validatePlan } from "../../../scripts/autonomy/planner.mjs";
import { STUFE, checkMarker, evaluateReadiness, renderReadiness } from "../../../scripts/autonomy/readiness.mjs";

const now = new Date("2026-10-06T08:00:00Z");
const day = (n: number) => new Date(now.getTime() - n * 24 * 3600 * 1000).toISOString();

const built = {
  "betrieb-kosten": { datum: "2026-10-05", beleg: "SIN-258 Ledger", issues: ["SIN-258", "SIN-268"], lauf: "content-grow mit Secrets" },
};
const readiness = evaluateReadiness({ metrics: {}, issues: [], built });
const stufe = (id: string) => readiness.find((r) => r.id === id)?.stufe;

const done = (identifier: string, title: string, daysAgo: number, description = "") => ({
  id: identifier,
  identifier,
  title,
  description,
  completedAt: day(daysAgo),
  state: { type: "completed" },
});
const open = (identifier: string, title: string, description = "") => ({ id: identifier, identifier, title, description, state: { type: "unstarted" } });

const bauEintrag = {
  lane: "backend",
  title: "Kosten pro Kurslauf messen: Tabelle pipeline_run_costs und Deckel",
  description: "Neu bauen",
  acceptance: ["Tabelle existiert"],
  priority: 2,
  check: "betrieb-kosten",
};

test("Stufen: fehlt, gebaut nicht gelaufen, unter Ziel, erfüllt", () => {
  assert.equal(stufe("betrieb-kosten"), STUFE.GEBAUT);
  assert.equal(stufe("recht-impressum"), STUFE.FEHLT);
  const ran = evaluateReadiness({ metrics: {}, issues: [], built, ran: { "betrieb-kosten": { datum: "2026-10-06", beleg: "Lauf 1", ergebnis: "25 € je Lauf" } } });
  assert.equal(ran.find((r) => r.id === "betrieb-kosten")?.stufe, STUFE.UNTER_ZIEL);
  const ok = evaluateReadiness({ metrics: {}, issues: [], built, confirmations: { "betrieb-kosten": { datum: "2026-10-06", beleg: "Lauf 1" } } });
  assert.equal(ok.find((r) => r.id === "betrieb-kosten")?.stufe, STUFE.ERFUELLT);
  // Gemessen und unter Ziel zählt als gelaufen.
  const quote = evaluateReadiness({ metrics: { bestehensquote_pct: 50 }, issues: [] }).find((r) => r.id === "content-quote");
  assert.equal(quote?.stufe, STUFE.UNTER_ZIEL);
  assert.match(renderReadiness(readiness), /\| gebaut, nicht gelaufen \|/);
});

test("gebautes, nie gelaufenes Werkzeug: Lauf-Auftrag statt Bau-Issue", () => {
  const [item] = validatePlan([bauEintrag], [], { readiness, built });
  assert.match(item.title, /^Lauf: /);
  assert.ok(item.labels.includes("lauf"));
  assert.match(item.description, /nie mit echten Daten gelaufen/);
  assert.match(item.description, /content-grow mit Secrets/);
  assert.match(item.description, /20 €/);
  assert.match(item.description, new RegExp(checkMarker("betrieb-kosten")));
  assert.doesNotMatch(item.description, /Neu bauen/);
});

test("Eintrag zu einem fehlenden Punkt bleibt ein normales Bau-Issue", () => {
  const [item] = validatePlan([{ ...bauEintrag, check: "recht-impressum", title: "Impressum anlegen" }], [], { readiness, built });
  assert.equal(item.title, "Impressum anlegen");
  assert.ok(!item.labels.includes("lauf"));
});

test("Duplikat-Schutz: Bau-Issue wie SIN-285 wird zum Lauf-Auftrag, nicht zum Kommentar am gebauten SIN-258", () => {
  const recent = [done("SIN-258", "Kosten pro Kurslauf messen: Ledger und Langfuse anbinden", 3)];
  const { fresh, duplicates } = splitDuplicates([bauEintrag], recent, { built, readiness, now });
  assert.equal(duplicates.length, 0);
  assert.match(fresh[0].title, /^Lauf: /);
});

test("Duplikat-Schutz: zweiter Lauf-Auftrag zum selben Punkt wird Kommentar am ersten", () => {
  const first = validatePlan([bauEintrag], [], { readiness, built })[0];
  const issues = [open("SIN-300", first.title, first.description)];
  const { fresh, duplicates } = splitDuplicates([bauEintrag], issues, { built, readiness, now });
  assert.equal(fresh.length, 0);
  assert.equal(duplicates[0].issue.identifier, "SIN-300");
  assert.match(duplicates[0].grund, /betrieb-kosten/);
});

test("Duplikat-Schutz: offen und in den letzten 14 Tagen erledigt zählt, älter nicht", () => {
  const entry = { lane: "backend", title: "Offline-Nutzung: Einheiten und Wiederholung ohne Netz", acceptance: ["x"], priority: 2 };
  const recent = findDuplicate(entry, [done("SIN-256", "Offline-Nutzung: Einheiten und Wiederholung ohne Netz", 10)], { now });
  assert.equal(recent?.issue.identifier, "SIN-256");
  assert.equal(findDuplicate(entry, [done("SIN-256", "Offline-Nutzung: Einheiten und Wiederholung ohne Netz", 20)], { now }), null);
  assert.equal(findDuplicate(entry, [open("SIN-9", "Offline-Nutzung: Einheiten und Wiederholung ohne Netz")], { now })?.issue.identifier, "SIN-9");
});

test("Duplikat-Schutz: ähnlicher Titel trifft, anderes Thema nicht", () => {
  assert.ok(titleSimilarity("Lighthouse und axe: Messung aller Screens", "Lighthouse und axe Messung aller Screens und Beleg") >= 0.6);
  assert.ok(titleSimilarity("Impressum anlegen", "Kosten pro Kurslauf messen") < 0.2);
  const issues = [done("SIN-257", "Lighthouse und axe Messung aller Screens und Beleg der Produktreife", 5)];
  const hit = findDuplicate({ lane: "frontend", title: "Lighthouse und axe: Messung aller Screens", acceptance: ["x"], priority: 2 }, issues, { now });
  assert.equal(hit?.issue.identifier, "SIN-257");
  assert.equal(findDuplicate({ lane: "frontend", title: "Impressum anlegen", acceptance: ["x"], priority: 2 }, issues, { now }), null);
});
