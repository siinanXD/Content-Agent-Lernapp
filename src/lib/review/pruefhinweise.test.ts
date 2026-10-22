import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";
import { generatorSystemText, buildDidaktikKeywordPrompt } from "@/lib/generate/didaktik-prompts";
import { mitKiKennzeichnung, pruefeVeroeffentlichung } from "./content-guard";
import {
  ELEKTRO_HINWEIS,
  PRUEFHINWEIS_MUSTER,
  bereinigeLernfeld,
  entfernePruefhinweise,
  geaenderteEinheiten,
} from "./pruefhinweise";

const quelle = { title: "AO", url: "https://www.gesetze-im-internet.de/maschf_ausbv/", fetchedAt: "2026-10-02T00:00:00.000Z" };

describe("Prüfhinweise und Elektro-Hinweis (SIN-620)", () => {
  it("geänderte Einheiten: Einheiten plus Einheiten geänderter Fragen, ohne Doppel (SIN-885)", () => {
    const bericht = { einheiten: ["LF1-u1"], fragen: ["LF1-u1/q1", "LF2-u3/q2", "LF2-u3/q5"], elektro: ["LF1-u1"], manuell: ["Antwort LF9-u1/q1"] };
    assert.deepEqual(geaenderteEinheiten(bericht), ["LF1-u1", "LF2-u3"]);
    assert.deepEqual(geaenderteEinheiten({ einheiten: [], fragen: [], elektro: [], manuell: ["x"] }), []);
  });

  it("Fachsprache „Stichprobe“ und „Abgleich mit dem Werkzeugplan“ ist kein Prüfhinweis (SIN-885)", () => {
    for (const t of [
      "Variable Prüfung mit Messwertaufzeichnung je Stichprobe",
      "Maschine stillsetzen und Stichprobenteile entnehmen",
      "Das Werkzeug wird ohne Abgleich mit dem Werkzeugplan eingesetzt.",
    ]) assert.doesNotMatch(t, PRUEFHINWEIS_MUSTER);
    for (const t of ["Bei der Stichprobe gegenzuprüfen.", "Abgleich mit Stichprobe.", "Quelle: KMK-Rahmenlehrplan.", "Eine menschliche Stichprobe prüft das."]) assert.match(t, PRUEFHINWEIS_MUSTER);
  });

  it("entfernt nur den Hinweissatz", () => {
    const text = "Das Ventil sperrt den Fluss. Die Zahlenwerte sind Fachwerte und bei der Stichprobe gegenzuprüfen. Dann öffnet es.";
    assert.equal(entfernePruefhinweise(text), "Das Ventil sperrt den Fluss. Dann öffnet es.");
    assert.equal(entfernePruefhinweise("Quelle: KMK-Rahmenlehrplan, Abgleich mit Stichprobe"), "");
    assert.equal(entfernePruefhinweise("Sauberer Text."), "Sauberer Text.");
  });

  it("bereinigt Einheit und Frage, ergänzt den Elektro-Hinweis einmal und lässt den Rest gleich", () => {
    const lf = {
      units: [
        {
          id: "LF6-4-u6",
          explanation: "Magnetventil tauschen: erst spannungsfrei schalten, dann verdrahten. Abgleich mit Stichprobe.",
          questions: [
            { id: "q1", prompt: "Was zuerst?", explanation: "Spannungsfrei. Quelle: KMK-Rahmenlehrplan.", choices: ["a", "b"] },
            { id: "q2", prompt: "Wer sagt es?", explanation: "Bei der Stichprobe gegenzuprüfen!", choices: ["Abgleich mit der Stichprobe"] },
          ],
        },
      ],
    };
    const { generated, bericht } = bereinigeLernfeld(lf);
    const u = generated.units[0];
    assert.equal(u.explanation, `Magnetventil tauschen: erst spannungsfrei schalten, dann verdrahten. ${ELEKTRO_HINWEIS}`);
    assert.equal(u.questions[0].explanation, "Spannungsfrei.");
    assert.equal(u.questions[0].prompt, "Was zuerst?");
    assert.deepEqual(bericht.fragen, ["LF6-4-u6/q1"]);
    assert.deepEqual(bericht.elektro, ["LF6-4-u6"]);
    assert.deepEqual(bericht.manuell, ["Frage LF6-4-u6/q2", "Antwort LF6-4-u6/q2"]);
    assert.equal(lf.units[0].questions[0].explanation, "Spannungsfrei. Quelle: KMK-Rahmenlehrplan.", "Eingabe bleibt unverändert");
    // zweiter Lauf ändert nichts mehr
    assert.deepEqual(bereinigeLernfeld(generated).bericht.elektro, []);
  });

  it("Wächter blockiert Prüfhinweise in Einheit und Frage", () => {
    const lf = structuredClone(mitKiKennzeichnung(mafSeedLernfeldSicherheit()));
    assert.deepEqual(pruefeVeroeffentlichung({ sources: [quelle], generated: lf }), []);
    lf.units[0].explanation += " Bei der Stichprobe gegenzuprüfen.";
    lf.units[0].questions[0].explanation = "Quelle: KMK-Rahmenlehrplan.";
    const orte = pruefeVeroeffentlichung({ sources: [quelle], generated: lf }).filter((v) => v.regel === "pruefhinweis");
    assert.equal(orte.length, 2);
  });

  it("Generator-Prompt verbietet Prüfhinweise, nennt den Elektro-Satz und enthält selbst keinen", () => {
    const system = generatorSystemText();
    assert.match(system, /Keine internen Prüfhinweise/);
    assert.ok(system.includes(ELEKTRO_HINWEIS));
    assert.match(buildDidaktikKeywordPrompt("Maschinen- und Anlagenführer"), /Keine IHK/);
    // Beispiele in der Regel dürfen vorkommen, die Variantenregeln nicht (Modell kopierte „menschliche Stichprobe“).
    assert.doesNotMatch(system.replace(/Regeln für jeden Text[\s\S]*?\n\n?(?=Regeln für Fragetyp|$)/, ""), PRUEFHINWEIS_MUSTER);
  });
});
