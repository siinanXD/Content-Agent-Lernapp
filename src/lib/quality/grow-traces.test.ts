import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { addClaudeMeasuredUsage, emptyLedger } from "./cost-guard";
import { createGrowTracer } from "./grow-traces";
import { schreibeEinheitTrace, type EinheitTraceInput, type ScoreFn } from "./unit-traces";
import { einheitTitel } from "./langfuse-names";
import type { QuestionEval } from "./schemas";

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

before(() => {
  trace.setGlobalTracerProvider(provider);
});
after(async () => {
  await provider.shutdown();
});

const frage = (id: string, correct = "B") => ({
  id,
  type: "auswahl" as const,
  prompt: `Frage ${id}?`,
  choices: ["a", "b", "c"],
  correct,
  explanation: "weil",
  sourceUrl: "https://example.org/q",
});
const einheit = (id: string, n: number): GeneratedUnit =>
  ({
    id,
    title: "Spannmittel",
    minutes: 5,
    explanation: "x",
    sections: { einstieg: "e", kern: "k", beispiel: "b", merksatz: "Spannmittel sichern das Werkstück" },
    questions: Array.from({ length: n }, (_, i) => frage(`${id}-q${i + 1}`)),
    sourceUrl: "https://example.org/quelle",
    sourceFetchedAt: "2026-10-08",
    moduleId: "M3",
  }) as GeneratedUnit;
const bewertung = (unitId: string, i: number, passed: boolean): QuestionEval => ({
  questionId: `${unitId}-q${i}`,
  unitId,
  passed,
  reasons: passed ? [] : ["Antwort steht nicht in der Quelle"],
  scores: { sourceFidelity: passed ? 1 : 0, uniqueness: 1, niveau: 4, language: 5, safetyFlag: false },
});

describe("Einheiten-Traces (SIN-383)", () => {
  it("einheitTitel: Modul · Nummer Titel", () => {
    assert.equal(einheitTitel({ id: "m3-b1-u2", title: "Spannmittel", moduleId: "M3" }), "M3 · 02 Spannmittel");
  });

  it("Probelauf mit Mock-Daten: ein Trace je Einheit, darin Erzeugen, je Frage Prüfen und Ergebnis", async () => {
    exporter.reset();
    const scores: Array<{ name: string; value: number }> = [];
    const score: ScoreFn = (_span, s) => scores.push({ name: s.name, value: s.value });
    const einheiten = [einheit("m3-b1-u1", 3), einheit("m3-b1-u2", 4)];
    const evals = [
      ...[1, 2, 3].map((i) => bewertung("m3-b1-u1", i, true)),
      ...[1, 2, 3, 4].map((i) => bewertung("m3-b1-u2", i, i === 1)),
    ];
    const ids = new Map<string, string>();
    const ledger = addClaudeMeasuredUsage(emptyLedger(), { input_tokens: 1000, output_tokens: 2000 });
    const tracer = createGrowTracer({
      runId: "r1",
      courseId: "c1",
      common: { beruf: "MAF Metall", modul: "M3" },
      generatorModel: "gen",
      judgeModel: "judge",
      minBestanden: 3,
      flush: async () => undefined,
      write: async (p) => {
        // Session und Tags setzt propagateAttributes; der LangfuseSpanProcessor überträgt sie auf die Spans.
        assert.equal(p.sessionId, "kurslauf-r1");
        assert.equal(p.kontext.laufArt, "neuesModul");
        const id = await schreibeEinheitTrace({ ...(p as EinheitTraceInput), score });
        if (id) ids.set(p.einheit.id, id);
        return id;
      },
    });
    tracer.batchFertig(einheiten, ledger, "neuesModul");
    const traceIds = await tracer.einheiten(einheiten, evals);

    const spans = exporter.getFinishedSpans();
    const traces = new Set(spans.map((s) => s.spanContext().traceId));
    assert.equal(traces.size, 2, "genau ein Trace je Einheit");
    assert.deepEqual([...traceIds.keys()].sort(), ["m3-b1-u1", "m3-b1-u2"]);

    const roots = spans.filter((s) => !s.parentSpanContext);
    assert.deepEqual(roots.map((s) => s.name).sort(), ["M3 · 01 Spannmittel", "M3 · 02 Spannmittel"]);
    assert.equal(spans.length, 2 + 2 + 7 + 2, "2 Wurzeln, 2 Erzeugen, 7 Prüfen, 2 Ergebnis");

    for (const root of roots) {
      const kinder = spans.filter((s) => s.parentSpanContext?.spanId === root.spanContext().spanId);
      assert.equal(kinder.filter((s) => s.name === "Erzeugen").length, 1);
      assert.equal(kinder.filter((s) => s.name === "Ergebnis").length, 1);
      const pruefen = kinder.filter((s) => s.name.startsWith("Prüfen · Frage"));
      assert.equal(pruefen.length, root.name.includes("01") ? 3 : 4);
      assert.equal(kinder.length, 2 + pruefen.length, "alles direkt unter dem Trace");
    }

    const gen = spans.find((s) => s.name === "Erzeugen")!;
    assert.equal(gen.attributes["langfuse.observation.type"], "generation");
    assert.equal(gen.attributes["langfuse.observation.model.name"], "gen");
    assert.match(String(gen.attributes["langfuse.observation.input"]), /Thema: Spannmittel/);
    assert.match(String(gen.attributes["langfuse.observation.output"]), /Frage m3-b1-u1-q1\?/);

    const durchgefallen = spans.find((s) => s.name === "Prüfen · Frage 2" && String(s.attributes["langfuse.observation.output"]).includes('"bestanden":false'))!;
    assert.match(String(durchgefallen.attributes["langfuse.observation.output"]), /Antwort steht nicht in der Quelle/);
    assert.match(String(durchgefallen.attributes["langfuse.observation.output"]), /richtigeAntwort":"B"/);

    const ergebnisse = spans.filter((s) => s.name === "Ergebnis").map((s) => String(s.attributes["langfuse.observation.output"]));
    assert.ok(ergebnisse.some((o) => o.includes("veröffentlicht")));
    assert.ok(ergebnisse.some((o) => o.includes("verworfen") && o.includes("nur 1 von 4")));

    // 6 Scores je Frage: 4 Prüfpunkte, Sicherheit, bestanden
    assert.equal(scores.length, 7 * 6);
    assert.equal(scores.filter((s) => s.name === "bestanden" && s.value === 1).length, 4);
  });

  it("Einheit ohne Bewertung oder ohne Erzeugen-Info bekommt keinen Trace; Schreibfehler werfen nicht", async () => {
    const tracer = createGrowTracer({
      runId: "r2",
      courseId: "c1",
      common: {},
      generatorModel: "gen",
      judgeModel: "judge",
      minBestanden: 3,
      flush: async () => {
        throw new Error("offline");
      },
      write: async () => {
        throw new Error("offline");
      },
    });
    const u = einheit("m3-b1-u1", 3);
    assert.equal((await tracer.einheiten([u], [bewertung(u.id, 1, true)])).size, 0);
    tracer.batchFertig([u], emptyLedger(), "reparatur");
    assert.equal((await tracer.einheiten([u], [bewertung(u.id, 1, true)])).size, 0);
  });
});
