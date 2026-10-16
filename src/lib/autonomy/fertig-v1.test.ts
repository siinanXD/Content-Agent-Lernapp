import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fertigIssues, fertigKriterien, offeneFertigPunkte, parseFertig } from "../../../scripts/autonomy/fertig.mjs";
import { validatePlan } from "../../../scripts/autonomy/planner.mjs";
import { classifyNew } from "../../../scripts/autonomy/linear.mjs";

const FERTIG = readFileSync("docs/FERTIG.md", "utf8");

test("FERTIG.md: 7 Punkte, 1 erledigt, 6 offen (Wortlaut Sinan)", () => {
  assert.equal(parseFertig(FERTIG).length, 7);
  assert.equal(offeneFertigPunkte(FERTIG).length, 6);
  assert.equal(parseFertig(FERTIG)[0].offen, false);
  assert.match(FERTIG.split("\n")[0], /^# Fertig-Liste Lern-App v1 \(Sinan, 16\.10\.2026\)$/);
});

test("Fertig-Issues: je offener Punkt genau ein Issue, Titel = Punkt, Prio High, Label claude, Fertig-Kriterien", () => {
  const items = fertigIssues(FERTIG);
  assert.equal(items.length, 6);
  assert.equal(items[0].title, "Industriemechaniker veröffentlichen (485 Einheiten, 3.149 Fragen liegen belegt in Supabase)");
  for (const it of items) {
    assert.equal(it.priority, 2);
    assert.deepEqual(it.labels, ["claude"]);
    assert.match(it.description, /## Fertig-Kriterien\n- \[ \] /);
    assert.match(it.description, /Done heißt live/);
  }
  // Erledigte Punkte nie als Issue
  assert.ok(!items.some((i) => i.title.startsWith("MAF Metall")));
});

test("Fertig-Issues: keine Dubletten gegen offene und kürzlich erledigte Titel (ohne Groß-/Kleinschreibung)", () => {
  const taken = ["impressum, datenschutz, ki-hinweis live; stripe-abo im testmodus durchspielbar", "Seite „So funktioniert's\" für Ausbilder"];
  const titles = fertigIssues(FERTIG, taken).map((i) => i.title);
  assert.equal(titles.length, 4);
  assert.ok(!titles.some((t) => t.startsWith("Impressum")));
  assert.ok(!titles.some((t) => t.startsWith("Seite")));
  // zweiter Lauf mit allen Titeln (neu angelegt und schon offen) legt nichts an
  assert.equal(fertigIssues(FERTIG, [...titles, ...taken]).length, 0);
});

test("Fertig-Kriterien: bekannter Punkt bekommt eigene Kriterien, unbekannter den Standard", () => {
  assert.ok(fertigKriterien("Impressum live").some((k: string) => /Stripe-Abo/.test(k)));
  assert.ok(fertigKriterien("Etwas ganz anderes").some((k: string) => /Sinan bestätigt/.test(k)));
});

test("Planer-Sperre: offene Fertig-Liste verwirft Ideen und lässt nur Bugs durch", () => {
  const mk = (title: string, lane: string, extra: Record<string, unknown> = {}) => ({ lane, title, acceptance: ["ok"], priority: 2, ...extra });
  const plan = [
    mk("Bug: Lernpfad lädt nicht", "backend"),
    mk("Frontend-Idee", "frontend"),
    mk("Content-Idee", "content", { idee: true, thema: "content-x" }),
    mk("Bug: Export bricht ab", "backend"),
  ];
  const offen = validatePlan(plan, [], { fertigOffen: true }) as { title: string; labels: string[] }[];
  assert.deepEqual(offen.map((r) => r.title), ["Bug: Lernpfad lädt nicht", "Bug: Export bricht ab"]);
  assert.ok(offen.every((r) => r.labels.includes("bug")));
  // Ohne offene Fertig-Liste bleibt die Idee erhalten
  const frei = validatePlan(plan, [], { fertigOffen: false }) as { title: string; idee?: boolean }[];
  assert.ok(frei.some((r) => r.title === "Content-Idee" && r.idee === true));
});

test("Fertig-Issues landen als Todo in v1 Grundgerüst", () => {
  const cls = classifyNew({ idee: false, labels: ["claude"] });
  assert.equal(cls.state, "Todo");
  assert.equal(cls.milestone, "v1 Grundgerüst");
});
