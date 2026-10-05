import assert from "node:assert/strict";
import { test } from "node:test";
import { correctAnswerText } from "./feedback";
import type { PathQuestion } from "./playable-path";

const base = {
  id: "q",
  level: "verstehen",
  prompt: "?",
  explanation: "",
  sourceUrl: "",
  examAreas: [],
} as const;

test("correctAnswerText: alle 5 Fragetypen", () => {
  const q = (p: Partial<PathQuestion>) => ({ ...base, ...p }) as PathQuestion;
  assert.equal(
    correctAnswerText(q({ type: "auswahl", correct: "A" })),
    "A",
  );
  assert.equal(
    correctAnswerText(q({ type: "lueckentext", correct: ["Spannung"] })),
    "Spannung",
  );
  assert.equal(
    correctAnswerText(
      q({ type: "zuordnen", correct: "x", pairs: [["a", "1"], ["b", "2"]] }),
    ),
    "a → 1; b → 2",
  );
  assert.equal(
    correctAnswerText(
      q({ type: "reihenfolge", correct: "x", steps: ["erst", "dann"] }),
    ),
    "1. erst 2. dann",
  );
  assert.equal(
    correctAnswerText(q({ type: "rechnen", correct: "42 mm" })),
    "42 mm",
  );
});
