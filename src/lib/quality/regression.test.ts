import assert from "node:assert/strict";
import { test } from "node:test";
import { ELEKTRO_HINWEIS } from "@/lib/review/pruefhinweise";
import { generatorSystemText } from "@/lib/generate/didaktik-prompts";
import { MAF_GOLDSET_ITEMS } from "./maf-goldset";
import { erstquote, festePruefsaetze, renderKommentar, stichprobe, vergleiche, type Messung } from "./regression";

const messung = (o: Partial<Messung> = {}): Messung => ({ erstquote: 90, uebereinstimmung: 90, fehler: [], costUsd: 0.01, ...o });
const pruefe = (items: typeof MAF_GOLDSET_ITEMS, prompt = generatorSystemText()) => festePruefsaetze(items, "maf", prompt, ELEKTRO_HINWEIS);

test("Goldset und aktueller Generator-Prompt erfüllen die festen Prüfsätze", () => {
  assert.deepEqual(pruefe(MAF_GOLDSET_ITEMS), []);
});

test("feste Prüfsätze: fremder Beruf, interner Hinweis, fehlender Elektro-Hinweis, verschlechterter Prompt", () => {
  const q = MAF_GOLDSET_ITEMS[0]!;
  assert.equal(pruefe([{ ...q, sourceUrl: "https://www.gesetze-im-internet.de/industriemechaniker/" }]).length, 1);
  assert.equal(pruefe([{ ...q, explanation: "Bei der Stichprobe gegenzuprüfen." }]).length, 1);
  assert.equal(pruefe([{ ...q, unitId: "x", prompt: "Anlage spannungsfrei schalten und verdrahten" }]).length, 1);
  const schlecht = generatorSystemText().replace(ELEKTRO_HINWEIS, "").replace(/Prüfhinweise/g, "Hinweise");
  assert.equal(pruefe([], schlecht).length, 2);
});

test("Vergleich: mehr als 3 Prozentpunkte schlechter = rot, genau 3 = grün", () => {
  assert.equal(vergleiche(messung(), messung({ erstquote: 87 })).ok, true);
  const rot = vergleiche(messung(), messung({ erstquote: 86.7 }));
  assert.equal(rot.ok, false);
  assert.match(rot.gruende[0]!, /Erstquote/);
  assert.equal(vergleiche(messung(), messung({ uebereinstimmung: 80 })).ok, false);
  assert.equal(vergleiche(messung(), messung({ erstquote: 99 })).ok, true);
});

test("Vergleich: Prüfsatz-Verstoß ist auch ohne Basis rot", () => {
  assert.equal(vergleiche(null, messung({ fehler: ["x"] })).ok, false);
  assert.equal(vergleiche(null, messung()).ok, true);
});

test("Stichprobe ist fest und die Erstquote zählt bestandene Einträge", () => {
  const s = stichprobe(MAF_GOLDSET_ITEMS);
  assert.equal(s.length, 30);
  assert.deepEqual(s, stichprobe([...MAF_GOLDSET_ITEMS].reverse()));
  const judged = s.slice(0, 27).map((q) => ({ questionId: q.id, passed: true }));
  assert.equal(erstquote(s, judged), 90);
});

test("Kommentar nennt Ergebnis und Kosten", () => {
  const pr = messung({ erstquote: 80 });
  const text = renderKommentar(messung(), pr, vergleiche(messung(), pr), 0.03);
  assert.match(text, /\*\*rot\*\*/);
  assert.match(text, /0,03 €/);
});
