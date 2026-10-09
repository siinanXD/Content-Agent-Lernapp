import assert from "node:assert/strict";
import { test } from "node:test";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { traceTags } from "./langfuse-names";
import { scoresPass, type QuestionEval } from "./schemas";
import { traceVergleich, vergleichErzeugen, vergleichSessionId } from "./vergleich-traces";

const unit = (id: string) => ({ id, title: `Titel ${id}`, minutes: 7, explanation: "x", sourceUrl: "https://x.de", sourceFetchedAt: "2026-10-03", questions: [] }) as unknown as GeneratedUnit;
const ev = (q: string, unitId: string, niveau = 4): QuestionEval => {
  const scores = { sourceFidelity: 1 as const, uniqueness: 1 as const, niveau, language: 4, safetyFlag: false };
  return { questionId: q, unitId, scores, passed: scoresPass(scores), reasons: [] };
};

test("SIN-448: ein Trace je bewerteter Einheit, Session und Lauf-Art Vergleich", async () => {
  const calls: Parameters<NonNullable<Parameters<typeof traceVergleich>[0]["write"]>>[0][] = [];
  const n = await traceVergleich({
    runId: "2026-10-10T07-00",
    modell: "gpt-6-luna",
    modul: "LF3",
    units: [unit("LF3-1-u1"), unit("LF3-1-u2"), unit("LF3-1-u3")],
    evals: [ev("q1", "LF3-1-u1"), ev("q2", "LF3-1-u1", 2), ev("q1", "LF3-1-u2")],
    usage: { inputTokens: 3000, outputTokens: 9000, costEur: 0.3 },
    richterModell: "gpt-5.4-mini + claude-haiku-5-5",
    minBestanden: 5,
    write: async (p) => {
      calls.push(p);
      return `trace-${calls.length}`;
    },
  });
  assert.equal(n, 2); // die dritte Einheit hat keine Bewertung
  assert.deepEqual(calls.map((c) => c.einheit.id), ["LF3-1-u1", "LF3-1-u2"]);
  assert.equal(calls[0]!.evals.length, 2);
  assert.equal(calls[0]!.sessionId, vergleichSessionId("2026-10-10T07-00"));
  assert.equal(calls[0]!.kontext.laufArt, "vergleich");
  assert.ok(traceTags(calls[0]!.kontext).includes("lauf:Modellvergleich"));
  assert.ok(traceTags(calls[0]!.kontext).includes("modell:gpt-6-luna"));
  // Kosten und Tokens gleichmäßig auf 3 Einheiten verteilt.
  assert.deepEqual(calls[0]!.erzeugen, { modell: "gpt-6-luna", inputTokens: 1000, outputTokens: 3000, costEur: 0.1 });
});

test("SIN-448: Fehler beim Schreiben brechen den Vergleich nicht ab", async () => {
  const n = await traceVergleich({
    runId: "r",
    modell: "claude-haiku-5-5",
    modul: "LF3",
    units: [unit("a")],
    evals: [ev("q", "a")],
    usage: { inputTokens: 1, outputTokens: 1, costEur: 0 },
    richterModell: "gpt-5.4-mini",
    minBestanden: 5,
    write: async () => {
      throw new Error("Langfuse weg");
    },
  });
  assert.equal(n, 0);
  assert.deepEqual(vergleichErzeugen("m", { inputTokens: 10, outputTokens: 10, cacheReadTokens: 4, costEur: 1 }, 0).cacheReadTokens, 4);
});
