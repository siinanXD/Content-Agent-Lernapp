import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fertigIssues, fertigKriterien, offeneFertigPunkte, parseFertig } from "../../../scripts/autonomy/fertig.mjs";
import { contentPunkteOffen } from "../../../scripts/autonomy/fabrik-anstoss.mjs";

const md = readFileSync("docs/FERTIG.md", "utf8");

test("SIN-1244: FERTIG.md hat 7 Punkte, offen sind nur PR-Crawler und Ausbilder-Seite", () => {
  assert.equal(parseFertig(md).length, 7);
  assert.deepEqual(offeneFertigPunkte(md).map((p) => p.text), ["PR-Crawler prüft geänderte Seiten auf der Vorschau ohne Fund", "Seite „So funktioniert's\" für Ausbilder"]);
});

test("SIN-1244: jeder abgehakte Punkt nennt einen Beleg", () => {
  for (const p of parseFertig(md).filter((x) => !x.offen)) assert.match(p.text, / — Beleg/, p.text);
});

test("SIN-1244: ohne offene Content-Punkte stößt die Fabrik nichts mehr an", () => {
  assert.equal(contentPunkteOffen(md), false);
});

test("SIN-1244: Crawler-Punkt wird als Issue mit PR-Crawler-Kriterien angelegt", () => {
  const issue = fertigIssues(md).find((i: { title: string }) => /^PR-Crawler/.test(i.title));
  assert.ok(issue);
  assert.match(fertigKriterien(issue.title).join("\n"), /pr-crawler\.yml/);
  assert.doesNotMatch(fertigKriterien(issue.title).join("\n"), /täglich/);
});
