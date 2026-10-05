import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { mapGeneratedToPathUnits, setPhaseAPathUnits } from "./phase-a-path";

const q = (id: string) => ({
  id,
  type: "single" as const,
  prompt: "Frage?",
  choices: ["a", "b"],
  correct: "a",
  explanation: "Weil.",
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/",
});

/** So kommen ältere Supabase-Zeilen an: ohne sourceUrl, level, Didaktik-Felder. */
const legacy = {
  id: "M0-1-u1",
  title: "Berufsbildung",
  questions: [{ ...q("M0-1-u1-q1"), sourceUrl: undefined, explanation: undefined }],
} as unknown as GeneratedUnit;

test("mapGeneratedToPathUnits übersteht fehlende Felder aus Supabase (SIN-249)", () => {
  const units = mapGeneratedToPathUnits([legacy]);
  assert.equal(units.length, 1);
  assert.equal(units[0]!.minutes, 5);
  assert.equal(units[0]!.questions[0]!.sourceUrl, "");
  assert.equal(units[0]!.moduleId, "M0");
});

test("mapGeneratedToPathUnits lässt Einheiten ohne Fragen aus", () => {
  const empty = { ...legacy, id: "x", questions: [] } as GeneratedUnit;
  const noId = { ...legacy, id: "" } as GeneratedUnit;
  assert.deepEqual(mapGeneratedToPathUnits([empty, noId]), []);
});

test("setPhaseAPathUnits überschreibt den Cache nicht mit einer leeren Liste", () => {
  setPhaseAPathUnits([legacy]);
  assert.equal(setPhaseAPathUnits([]).length, 0);
  assert.equal(setPhaseAPathUnits([legacy]).length, 1);
});
