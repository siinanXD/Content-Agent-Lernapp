import { test } from "node:test";
import assert from "node:assert/strict";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";
import { quellenName } from "./quellen-name";

test("SIN-1581: bekannte amtliche Quelle bekommt ihren Namen, ohne Adresse und ohne Formatangabe", () => {
  const name = quellenName("https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html");
  assert.match(name, /^MaschFüAusbV/);
  assert.doesNotMatch(name, /https?:|\(HTML\)/);
});

test("SIN-1581: unbekannte Quelle zeigt den Anbieter, nie die rohe Adresse", () => {
  assert.equal(quellenName("https://www.beispiel-amt.example/pfad/datei.pdf?x=1"), "Quelle bei beispiel-amt.example");
  assert.equal(quellenName("kein link"), "Amtliche Quelle");
});

test("SIN-1581: keine Einheit auf /quellen zeigt eine Adresse als Namen", () => {
  for (const u of mafSeedLernfeldSicherheit().units) assert.doesNotMatch(quellenName(u.sourceUrl), /https?:\/\//);
});
