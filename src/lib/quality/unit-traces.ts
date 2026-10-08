/**
 * SIN-383 — Ein Trace je Einheit, darin jede Frage mit Bewertung.
 * Aufbau in Langfuse:
 *   Trace „M3 · 02 Spannmittel“ (Session = Kurslauf)
 *     ├─ Generation „Erzeugen“ (Modell, Tokens, Kosten, Prompt-Auszug, erzeugte Fragen)
 *     ├─ Evaluator „Prüfen · Frage n“ je Frage (Text, richtige Antwort, Begründung, Scores)
 *     └─ Event „Ergebnis“ (veröffentlicht oder verworfen, mit Grund)
 * Lerninhalte sind keine Personendaten und dürfen hinein; Personendaten bleiben verboten.
 * Dieses Modul kennt keine Zugangsdaten: ohne Tracer-Anbieter schreibt es nichts (siehe langfuse-client).
 */
import { propagateAttributes, startActiveObservation } from "@langfuse/tracing";
import type { Span } from "@opentelemetry/api";
import type { GeneratedQuestion, GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import {
  BESTANDEN_SCORE,
  PRUEFPUNKTE,
  SICHERHEIT_SCORE,
  einheitTitel,
  traceMetadata,
  traceTags,
  umgebungsName,
  type TraceKontext,
} from "./langfuse-names";
import type { QuestionEval } from "./schemas";

export type ScoreFn = (
  span: Span,
  score: { name: string; value: number; dataType: "NUMERIC" | "BOOLEAN"; comment?: string },
) => void;

export type ErzeugenInfo = {
  modell: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  costEur: number;
  prompt?: { name: string; version: number } | null;
};

export type EinheitTraceInput = {
  courseId: string;
  sessionId: string;
  kontext: TraceKontext;
  einheit: GeneratedUnit;
  evals: QuestionEval[];
  erzeugen: ErzeugenInfo;
  /** Mindestzahl bestandener Fragen, ab der die Einheit live geht. */
  minBestanden: number;
  /** Richter-Modell, nur für die Metadaten der Prüfung. */
  richterModell: string;
  score?: ScoreFn;
};

const text = (v: string | string[]) => (Array.isArray(v) ? v.join(" | ") : v);

/** Fragetext inkl. Antwortmöglichkeiten, wie die Lernenden ihn sehen. */
function frageText(q: GeneratedQuestion): string {
  const teile = [q.prompt];
  if (q.choices?.length) teile.push(...q.choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`));
  if (q.pairs?.length) teile.push(...q.pairs.map(([a, b]) => `${a} → ${b}`));
  if (q.steps?.length) teile.push(...q.steps.map((s, i) => `${i + 1}. ${s}`));
  if (q.blanks?.length) teile.push(`Wortbank: ${q.blanks.join(", ")}`);
  return teile.join("\n");
}

/** Prompt-Auszug: Thema, Quelle, Lernziel (Merksatz der Einheit). Kein vollständiger Prompt. */
export function promptAuszug(u: GeneratedUnit, modul?: string): string {
  return [
    `Thema: ${u.title}`,
    `Modul: ${u.moduleId ?? modul ?? "-"}`,
    `Quelle: ${u.sourceUrl} (abgerufen ${u.sourceFetchedAt})`,
    `Lernziel: ${u.sections?.merksatz ?? "-"}`,
  ].join("\n");
}

/** Entscheidung je Einheit: gleiche Regel wie keepPassing im Kurslauf. */
export function einheitErgebnis(evals: QuestionEval[], minBestanden: number): { veroeffentlicht: boolean; grund: string } {
  const bestanden = evals.filter((e) => e.passed).length;
  if (bestanden >= minBestanden) {
    return { veroeffentlicht: true, grund: `${bestanden} von ${evals.length} Fragen bestanden (mindestens ${minBestanden})` };
  }
  const erster = evals.find((e) => !e.passed)?.reasons[0];
  return {
    veroeffentlicht: false,
    grund: `nur ${bestanden} von ${evals.length} Fragen bestanden (mindestens ${minBestanden})${erster ? `; z. B. ${erster}` : ""}`,
  };
}

/** Schreibt einen Einheiten-Trace und liefert seine Trace-ID. Wirft nicht nach außen, wenn kein Tracer läuft. */
export async function schreibeEinheitTrace(p: EinheitTraceInput): Promise<string | null> {
  const titel = einheitTitel(p.einheit, p.kontext.modul);
  const ergebnis = einheitErgebnis(p.evals, p.minBestanden);
  const kontext: TraceKontext = { ...p.kontext, schritt: "pruefen", modell: p.erzeugen.modell };
  const fragen = new Map(p.einheit.questions.map((q) => [q.id, q]));
  const e = p.erzeugen;
  let traceId: string | null = null;

  await propagateAttributes(
    {
      traceName: titel,
      sessionId: p.sessionId,
      environment: p.kontext.umgebung ?? umgebungsName(),
      tags: traceTags(kontext),
      metadata: {
        ...traceMetadata(kontext),
        courseId: p.courseId,
        unitId: p.einheit.id,
        ergebnis: ergebnis.veroeffentlicht ? "veröffentlicht" : "verworfen",
      },
    },
    async () => {
      await startActiveObservation(titel, async (root) => {
        traceId = root.traceId;
        root.update({
          input: { einheit: p.einheit.id, thema: p.einheit.title, quelle: p.einheit.sourceUrl },
          output: { ergebnis: ergebnis.veroeffentlicht ? "veröffentlicht" : "verworfen", grund: ergebnis.grund },
        });

        const gen = root.startObservation(
          "Erzeugen",
          {
            model: e.modell,
            input: promptAuszug(p.einheit, p.kontext.modul),
            output: p.einheit.questions.map((q, i) => `${i + 1}. ${frageText(q)}\nRichtig: ${text(q.correct)}`).join("\n\n"),
            usageDetails: {
              input: e.inputTokens,
              output: e.outputTokens,
              ...(e.cacheCreationTokens ? { cache_creation_input_tokens: e.cacheCreationTokens } : {}),
              ...(e.cacheReadTokens ? { cache_read_input_tokens: e.cacheReadTokens } : {}),
            },
            costDetails: { total: e.costEur },
            ...(e.prompt ? { prompt: { ...e.prompt, isFallback: false } } : {}),
          },
          { asType: "generation" },
        );
        gen.end();

        p.evals.forEach((ev, i) => {
          const q = fragen.get(ev.questionId);
          const pos = p.einheit.questions.findIndex((x) => x.id === ev.questionId);
          const obs = root.startObservation(
            `Prüfen · Frage ${(pos >= 0 ? pos : i) + 1}`,
            {
              input: q ? frageText(q) : `Frage ${ev.questionId}`,
              output: {
                richtigeAntwort: q ? text(q.correct) : null,
                begruendung: ev.reasons.length ? ev.reasons.join("; ") : "Richter nennt keinen Mangel",
                bestanden: ev.passed,
              },
              metadata: {
                questionId: ev.questionId,
                richter: p.richterModell,
                [PRUEFPUNKTE.sourceFidelity]: ev.scores.sourceFidelity,
                [PRUEFPUNKTE.uniqueness]: ev.scores.uniqueness,
                [PRUEFPUNKTE.niveau]: ev.scores.niveau,
                [PRUEFPUNKTE.language]: ev.scores.language,
                [SICHERHEIT_SCORE]: ev.scores.safetyFlag,
              },
              level: ev.passed ? "DEFAULT" : "WARNING",
            },
            { asType: "evaluator" },
          );
          const grund = ev.reasons.join("; ").slice(0, 500) || undefined;
          const s = (name: string, value: number, dataType: "NUMERIC" | "BOOLEAN" = "NUMERIC") =>
            p.score?.(obs.otelSpan, { name, value, dataType, comment: grund });
          s(PRUEFPUNKTE.sourceFidelity, ev.scores.sourceFidelity);
          s(PRUEFPUNKTE.uniqueness, ev.scores.uniqueness);
          s(PRUEFPUNKTE.niveau, ev.scores.niveau);
          s(PRUEFPUNKTE.language, ev.scores.language);
          s(SICHERHEIT_SCORE, ev.scores.safetyFlag ? 1 : 0);
          s(BESTANDEN_SCORE, ev.passed ? 1 : 0, "BOOLEAN");
          obs.end();
        });

        root.startObservation(
          "Ergebnis",
          {
            output: { ergebnis: ergebnis.veroeffentlicht ? "veröffentlicht" : "verworfen", grund: ergebnis.grund },
            level: ergebnis.veroeffentlicht ? "DEFAULT" : "WARNING",
            statusMessage: ergebnis.grund,
          },
          { asType: "event" },
        );
      });
    },
  );
  return traceId;
}
