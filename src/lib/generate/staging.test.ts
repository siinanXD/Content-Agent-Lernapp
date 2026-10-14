import assert from "node:assert/strict";
import test from "node:test";
import { dropDiscardedQuestions } from "@/lib/learner/discarded";
import type { GeneratedUnit } from "./maf-lernfeld-seed";
import { freigabe, istVeroeffentlicht, nurVeroeffentlicht, probenGruen } from "./staging";

const frage = (id: string, prompt = "Wie groß ist 2 + 2?") =>
  ({
    id,
    type: "auswahl",
    prompt,
    choices: ["3", "4"],
    correct: "4",
    explanation: "Summe.",
    sourceUrl: "https://example.org",
    level: "erinnern",
    examAreas: ["Teil 1"],
  }) as never;
const einheit = (id: string, extra: Partial<GeneratedUnit> = {}): GeneratedUnit =>
  ({
    id,
    title: id,
    minutes: 5,
    explanation: "x",
    sourceUrl: "https://example.org",
    sourceFetchedAt: "2026-10-01",
    questions: [frage("q1"), frage("q2")],
    ...extra,
  }) as GeneratedUnit;

test("Bestand ohne Status gilt als veröffentlicht", () => {
  assert.equal(istVeroeffentlicht(einheit("a")), true);
  assert.equal(nurVeroeffentlicht([einheit("a")]).length, 1);
});

test("Entwürfe und geprüfte Einheiten sind für Lernende unsichtbar, auch ohne Bewertungen", () => {
  const units = [
    einheit("a"),
    einheit("b", { status: "entwurf" }),
    einheit("c", { status: "geprueft" }),
    einheit("d", { status: "veroeffentlicht" }),
  ];
  assert.deepEqual(dropDiscardedQuestions(units, []).map((u) => u.id), ["a", "d"]);
});

test("Freigabe nur mit Richter und Proben", () => {
  assert.equal(freigabe(einheit("a"), true, true).status, "veroeffentlicht");
  assert.equal(freigabe(einheit("a"), true, false).status, "geprueft");
  assert.equal(freigabe(einheit("a"), false, true).status, "entwurf");
});

test("absichtlich schlechte Frage: Schema verletzt → Proben rot → bleibt unsichtbar", () => {
  const schlecht = einheit("b", { questions: [frage("q1"), { id: "q2", type: "auswahl", prompt: "" } as never] });
  assert.equal(probenGruen(schlecht, 2), false);
  const staged = freigabe(schlecht, true, probenGruen(schlecht, 2));
  assert.deepEqual(dropDiscardedQuestions([staged], []), []);
});

test("interner Prüfhinweis im Text lässt die Proben rot werden", () => {
  assert.equal(probenGruen(einheit("a", { explanation: "Stichprobe vor publish" }), 2), false);
});

test("saubere Einheit besteht die Proben", () => {
  assert.equal(probenGruen(einheit("a"), 2), true);
});
