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

test("SIN-1533: Fragezahlen in FERTIG.md und product-readiness.json stimmen überein", () => {
  const { kurse } = JSON.parse(readFileSync("docs/product-readiness.json", "utf8")).fragenzahlen;
  const de = (n: number) => n.toLocaleString("de-DE");
  const zeilen = parseFertig(md).map((p) => p.text);
  const einAnteil = { "Maschinen- und Anlagenführer": /^MAF Metall/, Industriemechaniker: /^Industriemechaniker/, Industriekaufmann: /^Industriekaufmann/ } as Record<string, RegExp>;
  for (const [kurs, re] of Object.entries(einAnteil)) {
    const zeile = zeilen.find((t) => re.test(t));
    assert.ok(zeile, kurs);
    assert.ok(zeile.includes(`${de(kurse[kurs].einheiten)} Einheiten, ${de(kurse[kurs].fragen)} Fragen`), `${kurs}: ${zeile}`);
  }
  assert.match(md, new RegExp(`Summe ${de(Object.values<{ fragen: number }>(kurse).reduce((s, k) => s + k.fragen, 0))}`));
});
