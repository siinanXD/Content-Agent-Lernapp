import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  kurslaufSessionId,
  pruefpunktScores,
  scoreNamesValid,
  traceMetadata,
  traceTags,
  traceTitel,
  umgebungsName,
} from "./langfuse-names";
import { readFileSync } from "node:fs";
import { dashboardWidgetSpecs, scoreConfigSpecs } from "./langfuse-verwaltung";
import type { QuestionEval } from "./schemas";

const q = (id: string, s: Partial<QuestionEval["scores"]>, reasons: string[] = []): QuestionEval => ({
  questionId: id,
  unitId: "u1",
  passed: true,
  reasons,
  scores: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: false, ...s },
});

describe("Langfuse lesbar (SIN-299)", () => {
  it("benennt Traces fachlich", () => {
    assert.equal(
      traceTitel({ beruf: "MAF Metall", modul: "LF3", schritt: "erzeugen" }),
      "Kurslauf MAF Metall · LF3 · Fragen erzeugen",
    );
    assert.equal(traceTitel({ schritt: "kosten" }), "Kurslauf MAF Metall · Kosten");
  });

  it("gibt allen Schritten eines Kurslaufs dieselbe Session", () => {
    assert.equal(kurslaufSessionId("2026-10-07T01-00-00-000Z"), "kurslauf-2026-10-07T01-00-00-000Z");
    assert.ok(kurslaufSessionId("x".repeat(300)).length <= 200);
  });

  it("setzt Tags und Metadaten für Beruf, Schwerpunkt, Modul, Schritt, Modell, Prompt, Umgebung", () => {
    const k = {
      schwerpunkt: "Metall",
      modul: "M0",
      schritt: "pruefen" as const,
      modell: "gpt-5.4-mini",
      promptVersion: "v2",
      umgebung: "production",
    };
    assert.deepEqual(traceTags(k), [
      "beruf:MAF Metall",
      "schwerpunkt:Metall",
      "modul:M0",
      "schritt:pruefen",
      "modell:gpt-5.4-mini",
      "prompt:v2",
      "umgebung:production",
    ]);
    assert.equal(traceMetadata(k).modell, "gpt-5.4-mini");
    assert.equal(traceMetadata(k).promptVersion, "v2");
  });

  it("macht die Umgebung zu einem gültigen Langfuse-Environment", () => {
    assert.equal(umgebungsName({ VERCEL_ENV: "Production" }), "production");
    assert.equal(umgebungsName({ LANGFUSE_TRACING_ENVIRONMENT: "langfuse-x" }), "development");
  });

  it("bildet die Prüfpunkte mit Begründung des Richters", () => {
    const scores = pruefpunktScores([
      q("a", {}),
      q("b", { sourceFidelity: 0, niveau: 3 }, ["Antwort steht nicht in der Quelle"]),
    ]);
    assert.deepEqual(scores.map((s) => s.name), ["Quellentreue", "Eindeutigkeit", "Niveau", "Sprache"]);
    assert.equal(scores[0]!.value, 0.5);
    assert.match(scores[0]!.comment, /b: Antwort steht nicht in der Quelle/);
    assert.equal(scores[2]!.value, 3.5);
    assert.equal(scores[1]!.comment.startsWith("Alle 2 Fragen"), true);
    assert.deepEqual(pruefpunktScores([]), []);
  });

  it("hat 4 Kacheln, die auf Scores zeigen, die der Kurslauf schreibt", () => {
    const widgets = dashboardWidgetSpecs();
    assert.equal(widgets.length, 4);
    const src = readFileSync("scripts/content-grow.ts", "utf8");
    const names = widgets.flatMap((w) =>
      (w.filters ?? []).flatMap((f) => (Array.isArray(f.value) ? (f.value as string[]) : [])),
    );
    for (const n of names) assert.ok(src.includes(n) || ["costEur", "capEur"].includes(n), `Score fehlt: ${n}`);
  });

  it("legt für jeden Prüfpunkt und die Stichprobe eine Score-Config an (Name ≤ 35 Zeichen)", () => {
    const specs = scoreConfigSpecs();
    assert.deepEqual(
      specs.map((s) => s.name),
      ["Quellentreue", "Eindeutigkeit", "Niveau", "Sprache", "Stichprobe Sicherheit"],
    );
    assert.ok(scoreNamesValid(specs.map((s) => s.name)));
    const stich = specs.at(-1)!;
    assert.deepEqual(
      "categories" in stich ? stich.categories.map((c) => c.label) : [],
      ["passt", "unklar", "falsch"],
    );
  });
});
