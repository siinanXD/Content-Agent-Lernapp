import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FAQ, faqSchema, organisationSchema } from "./startseite";

test("FAQ-Schema: eine Frage mit Antwort je FAQ-Eintrag", () => {
  const s = faqSchema();
  assert.equal(s["@type"], "FAQPage");
  assert.equal(s.mainEntity.length, FAQ.length);
  for (const q of s.mainEntity) {
    assert.ok(q.name.endsWith("?"));
    assert.ok(q.acceptedAnswer.text.length > 20);
  }
});

test("Organisation-Schema: Name und Sprache, keine erfundene Adresse", () => {
  const o = organisationSchema();
  assert.equal(o["@type"], "Organization");
  assert.equal(o.name, "Lernpfad MAF");
  assert.equal("address" in o, false);
});

test("llms.txt: Titel, Zusammenfassung und Links auf vorhandene Seiten", () => {
  const txt = readFileSync("public/llms.txt", "utf8");
  assert.match(txt, /^# Lernpfad MAF\n\n> /);
  for (const pfad of ["/demo", "/anmelden", "/impressum", "/datenschutz", "/ki-hinweis"]) {
    assert.ok(txt.includes(`](${pfad})`), pfad);
  }
});
