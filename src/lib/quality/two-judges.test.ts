import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allCandidates, estimateCandidate, ALLE_BUDGET_USD, renderAlleMarkdown, type AlleReport } from "./ab-alle";
import { claudeJudgeChunk } from "./claude-judge";
import { combineJudges, judgeMeans, meanOfJudges } from "./two-judges";
import { scoresPass, type QuestionEval } from "./schemas";
import type { EvalItem } from "./evaluate-agent";

const ev = (id: string, o: Partial<QuestionEval["scores"]> = {}, unitId = "u1"): QuestionEval => {
  const scores = { sourceFidelity: 1 as const, uniqueness: 1 as const, niveau: 4, language: 4, safetyFlag: false, ...o };
  return { questionId: id, unitId, scores, passed: scoresPass(scores), reasons: [] };
};

describe("Zwei-Richter-Auswertung (SIN-437)", () => {
  it("besteht nur, wenn beide Richter bestehen", () => {
    const { combined, disagreement } = combineJudges(
      [ev("a"), ev("b"), ev("c", { niveau: 3 })],
      [ev("a"), ev("b", { uniqueness: 0 }), ev("c", { niveau: 3 })],
    );
    assert.deepEqual(combined.map((e) => e.passed), [true, false, false]);
    assert.deepEqual(disagreement.questionIds, ["b"]);
    assert.equal(disagreement.count, 1);
    assert.equal(disagreement.rate, 0.333);
  });

  it("Skalen sind der Mittelwert, Quelle/Eindeutigkeit der strengere Wert", () => {
    const { combined, disagreement } = combineJudges([ev("a", { niveau: 5, language: 5 })], [ev("a", { niveau: 3, language: 4, sourceFidelity: 0 })]);
    assert.equal(combined[0]!.scores.niveau, 4);
    assert.equal(combined[0]!.scores.language, 4.5);
    assert.equal(combined[0]!.scores.sourceFidelity, 0);
    assert.equal(disagreement.meanAbsNiveauDiff, 2);
    assert.ok(combined[0]!.reasons.length === 0);
  });

  it("Frage ohne Bewertung des Claude-Richters gilt als nicht bestanden und als Abweichung", () => {
    const { combined, disagreement } = combineJudges([ev("a"), ev("b")], [ev("a"), ev("x")]);
    assert.equal(combined[1]!.passed, false);
    assert.ok(combined[1]!.reasons.includes("claude_richter_ohne_bewertung"));
    assert.deepEqual(disagreement.questionIds, ["x"]);
  });

  it("Richter-Schnitte und Mittelwert", () => {
    const o = judgeMeans([ev("a", { niveau: 5 }), ev("b", { niveau: 3 })]);
    const c = judgeMeans([ev("a"), ev("b")]);
    assert.equal(o.niveau, 4);
    assert.equal(o.passRate, 0.5);
    assert.equal(c.passRate, 1);
    assert.equal(meanOfJudges(o, c).passRate, 0.75);
  });
});

describe("Claude-Richter und Bericht (SIN-437)", () => {
  const item: EvalItem = { id: "i1", unitId: "u1", prompt: "P?", correct: "A", explanation: "E", sourceUrl: "https://x.de" };

  it("liest dieselbe JSON-Antwort wie der OpenAI-Richter und zählt Token", async () => {
    const text = '{"items":[{"id":"i1","sourceFidelity":1,"uniqueness":1,"niveau":4,"language":5,"safetyFlag":false,"reasons":["ok"]}]}';
    let sent: { model?: string; system?: string } = {};
    const r = await claudeJudgeChunk([item], "claude-haiku-5-5", async (path, init) => {
      assert.equal(path, "/v1/messages");
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ content: [{ type: "text", text: `Hier: ${text}` }], usage: { input_tokens: 10, output_tokens: 5 } }));
    });
    assert.equal(sent.model, "claude-haiku-5-5");
    assert.match(sent.system ?? "", /Richter für Lernfragen/);
    assert.equal(r.questions[0]!.passed, true);
    assert.deepEqual(r.usage, { prompt_tokens: 10, completion_tokens: 5 });
  });

  it("Fehlerfall: HTTP-Status im Text", async () => {
    await assert.rejects(() => claudeJudgeChunk([item], "claude-haiku-5-5", async () => new Response("überlastet", { status: 529 })), /Anthropic 529/);
  });

  it("Kostenschätzung aller Kandidaten liegt unter dem Deckel von 6 €", () => {
    const cands = allCandidates();
    assert.deepEqual(cands.map((c) => c.id), ["claude-haiku-5-5", "claude-sonnet-5-5", "gpt-6-luna", "gpt-6.1-sol", "chat-latest"]);
    const total = cands.reduce((s, c) => s + estimateCandidate(c, 20).totalUsd, 0);
    assert.ok(total > 0 && total < ALLE_BUDGET_USD, `Schätzung ${total}`);
  });

  it("Bericht nennt beide Richter, Abweichung, Kosten und Volltext-Beispiele", () => {
    const meansOf = judgeMeans([ev("a")]);
    const report: AlleReport = {
      runId: "2026-10-10",
      judges: { openai: "gpt-5.4-mini", claude: "claude-haiku-5-5" },
      unitTarget: 20,
      totalUsd: 4,
      totalEur: 3.72,
      priceNotes: [],
      published: false,
      models: [
        {
          model: "gpt-6-luna",
          provider: "openai",
          units: 20,
          failedChunks: [],
          questions: 140,
          judges: { openai: meansOf, claude: meansOf, mean: meansOf },
          disagreement: { count: 40, rate: 0.29, questionIds: [], meanAbsNiveauDiff: 0.5, meanAbsLanguageDiff: 0.4 },
          questionPassRate: 0.8,
          unitPassRate: 0.5,
          unitsPublishable: 18,
          unitsDiscarded: 2,
          costUsd: { generation: 0.1, repair: 0.02, judgeOpenai: 0.3, judgeClaude: 0.05, total: 0.47 },
          usdPerUnit: 0.0235,
          eurPerUnit: 0.0219,
          examples: [
            { id: "LF3-1-u1", title: "Titel eins", minutes: 7, explanation: "x", sourceUrl: "https://x.de", sourceFetchedAt: "2026-10-03", sections: { einstieg: "Ein", kern: "Kern", beispiel: "Bsp", merksatz: "Merk" }, questions: [{ id: "q1", type: "auswahl", prompt: "Frage?", choices: ["a", "b"], correct: "a", explanation: "Weil", sourceUrl: "https://x.de" }] },
          ] as never,
        },
      ],
    };
    const md = renderAlleMarkdown(report);
    assert.match(md, /gpt-5\.4-mini.*claude-haiku-5-5/);
    assert.match(md, /Richter uneinig/);
    assert.match(md, /18 von|2 von 20/);
    assert.match(md, /Frage\?/);
    assert.match(md, /Merk/);
    assert.match(md, /Wahl trifft Sinan/);
  });
});
