import assert from "node:assert/strict";
import test from "node:test";
import { anzeigeKopfzeile, anzeigeText } from "./anzeige";
import { mapGeneratedToPathUnits } from "./phase-a-path";

test("anzeigeText: entfernt Sätze mit internem Prüfhinweis, Fachtext bleibt (SIN-1515)", () => {
  assert.equal(
    anzeigeText("Der Not-Aus stoppt die Anlage. Vor Publikation fachlich prüfen. Danach Sicherung lösen."),
    "Der Not-Aus stoppt die Anlage. Danach Sicherung lösen.",
  );
  assert.equal(anzeigeText("Die Stichprobe zeigt die Streuung der Maße."), "Die Stichprobe zeigt die Streuung der Maße.");
});

test("anzeigeKopfzeile: keine Platzhalter, Typnamen oder Kennungen (SIN-1515)", () => {
  assert.equal(anzeigeKopfzeile(["Modul", "Block"]), "");
  assert.equal(anzeigeKopfzeile(["LF1-1-u12", "lueckentext"]), "");
  assert.equal(anzeigeKopfzeile(["Querschnitt", "Block"]), "Querschnitt");
  assert.equal(anzeigeKopfzeile(["Querschnitt", "Sicherheit"]), "Querschnitt · Sicherheit");
});

test("Lernpfad-Einheit: Prüfhinweise stehen weder in Erklärung noch in Frage (SIN-1515)", () => {
  const [u] = mapGeneratedToPathUnits([
    {
      id: "LF1-1-u12",
      title: "Sicherheit",
      explanation: "Kurz erklärt. Vor Publikation fachlich prüfen.",
      questions: [
        { id: "q1", type: "single", prompt: "Was gilt? Vor Publikation fachlich prüfen.", choices: ["a", "b"], correct: "a", explanation: "Weil a. Vor Publikation fachlich prüfen." },
      ],
    },
  ] as never);
  assert.equal(u.explanation, "Kurz erklärt.");
  assert.equal(u.questions[0].prompt, "Was gilt?");
  assert.equal(u.questions[0].explanation, "Weil a.");
});
