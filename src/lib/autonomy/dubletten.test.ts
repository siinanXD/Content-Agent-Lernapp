import assert from "node:assert/strict";
import { test } from "node:test";
import { blockVon, dubletten, renderBericht, tabellenText, verhaeltnis } from "../../../scripts/autonomy/dubletten.mjs";

const e = (id: string, title: string, explanation = `Erklärung ${id}`) => ({ id, title, explanation });

test("Verhältnis wie Python SequenceMatcher (SIN-1540)", () => {
  assert.equal(verhaeltnis("abcd", "bcde"), 0.75);
  assert.equal(verhaeltnis("abab", "baba"), 0.75);
  assert.ok(Math.abs(verhaeltnis("apfel", "apfelsaft") - 0.714286) < 1e-6);
  assert.equal(verhaeltnis("", ""), 1);
  assert.equal(verhaeltnis("abc", "xyz"), 0);
  assert.equal(blockVon("M0-1-u14"), "M0-1");
});

const berichtsheft = "Berichtsheft als Ausbildungsnachweis (§ 7)";
const maf = [
  e("M0-1-u3", berichtsheft),
  e("M0-1-u4", berichtsheft),
  e("M0-1-u14", `  ${berichtsheft.toUpperCase()} `),
  e("M0-1-u5", "Arbeitszeit und Pausen"),
  e("ZP-2-u3", "Arbeitsmittel sicher auswählen und prüfen"),
  e("ZP-2-u5", "Arbeitsmittel sicher auswählen und prüfen"),
  e("LF1-1-u1", "Zeichnungen lesen"),
];

test("Die drei Berichtsheft-Einheiten und die ZP-Paare stehen im Bericht", () => {
  const d = dubletten(maf);
  assert.deepEqual([d.gleich.gruppen, d.gleich.ueberzaehlig], [2, 3]);
  assert.deepEqual([d.aehnlich.paare, d.aehnlich.einheiten], [4, 5]);
  const md = renderBericht([{ name: "Maschinen- und Anlagenführer", units: maf }], "2026-11-05");
  for (const id of ["M0-1-u3", "M0-1-u4", "M0-1-u14", "ZP-2-u3", "ZP-2-u5"]) assert.match(md, new RegExp(id));
  assert.match(md, /### Block M0-1 \(3 Paare\)/);
  assert.ok(md.indexOf("### Block M0-1") < md.indexOf("### Block ZP-2"), "größte Blöcke zuerst");
  assert.match(md, /\| Maschinen- und Anlagenführer \| 7 \| 2 \/ 3 \| 4 \/ 5 \|/);
  assert.doesNotMatch(md, /LF1-1-u1/);
});

test("Erklärungen werden nach 200 Zeichen gekürzt und Tabellenzeichen entschärft", () => {
  const lang = "x".repeat(300) + "|";
  const md = renderBericht([{ name: "K", units: [e("A-1-u1", "Gleich", lang), e("A-1-u2", "Gleich", "a|b")] }], "2026-11-05");
  assert.ok(md.includes("x".repeat(200)) && !md.includes("x".repeat(201)));
  assert.ok(md.includes("a\\|b"));
});

test("Tabellentext: Pipe wird wirklich entschärft, Objekte bleiben lesbar (Belegprüfung #722)", () => {
  assert.equal(tabellenText("a|b"), "a\\|b");
  assert.equal(tabellenText(["x", "y"]), "x → y");
  assert.equal(tabellenText({ links: "A|B" }), '{"links":"A\\|B"}');
  assert.equal(tabellenText([{ a: 1 }]), '[{"a":1}]');
  assert.equal(tabellenText(null), "");
  assert.equal(tabellenText("a\\|b"), "a\\\\\\|b");
  const md = renderBericht([{ name: "K", units: [e("A-1-u1", "Gleich", "c\\|d"), e("A-1-u2", "Gleich", "x")] }], "2026-11-05");
  assert.ok(md.includes("c\\\\\\|d"));
});
