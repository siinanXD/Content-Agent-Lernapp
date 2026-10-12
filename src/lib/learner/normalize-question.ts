/**
 * SIN-384: Erzeugte Fragen kommen in mehreren Formen aus Supabase (Paare als Objekt, Lücken als
 * Objekte, `correct` als `{ value, unit }`, andere Typnamen). Hier wird beim Lesen vereinheitlicht,
 * die Daten selbst bleiben unverändert. Unbekannte Form: `null`, die Frage wird übersprungen.
 */
import type { PathQuestion } from "@/lib/learner/playable-path";
import type { QuestionType } from "@/lib/generate/maf-lernfeld-seed";
import type { QuestionLevel } from "@/lib/content/didaktik";

const TYPE_ALIASES: Record<string, QuestionType> = {
  auswahl: "auswahl",
  single: "auswahl",
  single_choice: "auswahl",
  multiple_choice: "auswahl",
  zuordnen: "zuordnen",
  matching: "zuordnen",
  match: "zuordnen",
  lueckentext: "lueckentext",
  fill: "lueckentext",
  fill_blank: "lueckentext",
  reihenfolge: "reihenfolge",
  ordering: "reihenfolge",
  order: "reihenfolge",
  rechnen: "rechnen",
  numeric: "rechnen",
};

/** Normalisierter Vergleich für Lücken: ohne Groß/Klein und Leerzeichen am Rand. */
export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase();
}

export function gapMatches(gap: { accepted: string[] }, value: string): boolean {
  const v = normalizeAnswer(value);
  return v !== "" && gap.accepted.some((a) => normalizeAnswer(a) === v);
}

type Rec = Record<string, unknown>;
type Gaps = NonNullable<PathQuestion["gaps"]>;

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : null;

function strList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v) {
    const s = str(x);
    if (s === null) return null;
    out.push(s);
  }
  return out;
}

/** `{ value, unit }` wird zu "value unit"; Text bleibt Text. */
export function answerText(v: unknown): string | null {
  const s = str(v);
  if (s !== null) return s;
  if (isRec(v)) {
    const value = str(v.value);
    if (value === null) return null;
    const unit = str(v.unit);
    return unit ? `${value} ${unit}` : value;
  }
  return null;
}

function normalizeCorrect(v: unknown): string | string[] | null {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) {
    const out = v.map(answerText);
    return out.every((x): x is string => x !== null) ? (out as string[]) : null;
  }
  return answerText(v);
}

function normalizePairs(v: unknown): Array<[string, string]> | null {
  if (!Array.isArray(v)) return null;
  const out: Array<[string, string]> = [];
  for (const p of v) {
    let l: string | null;
    let r: string | null;
    if (Array.isArray(p) && p.length >= 2) {
      l = str(p[0]);
      r = str(p[1]);
    } else if (isRec(p)) {
      l = str(p.left);
      r = str(p.right);
    } else {
      return null;
    }
    if (l === null || r === null) return null;
    out.push([l, r]);
  }
  return out;
}

function normalizeGaps(blanks: unknown, correct: string | string[]): Gaps | null {
  const correctList = Array.isArray(correct) ? correct : correct ? [correct] : [];
  // Alte Form: Wortliste als Auswahl für eine Lücke.
  const bank = blanks === undefined ? [] : strList(blanks);
  if (bank) {
    const accepted = correctList.slice(0, 1);
    return accepted.length ? [{ id: "1", options: bank, accepted }] : null;
  }
  if (!Array.isArray(blanks) || !blanks.length) return null;
  const gaps: Gaps = [];
  for (let i = 0; i < blanks.length; i++) {
    const b: unknown = blanks[i];
    if (!isRec(b)) return null;
    const options = b.options === undefined ? [] : strList(b.options);
    const given = b.accepted === undefined ? [] : strList(b.accepted);
    if (options === null || given === null) return null;
    const fallback = correctList[i];
    const accepted = given.length ? given : fallback ? [fallback] : [];
    if (!accepted.length) return null;
    gaps.push({ id: str(b.id) ?? String(i + 1), options, accepted });
  }
  return gaps;
}

function reportSkipped(raw: unknown, reason: string): void {
  // Dynamisch, damit Pipeline-Skripte (ohne Next.js) das Modul ohne Sentry-Browser-Code laden.
  void import("@sentry/nextjs")
    .then((Sentry) =>
      Sentry.captureMessage(`Frage übersprungen: ${reason}`, {
        level: "warning",
        tags: { area: "normalize-question" },
        extra: {
          questionId: isRec(raw) ? str(raw.id) : null,
          type: isRec(raw) ? str(raw.type) : null,
        },
      }),
    )
    .catch(() => undefined);
}

/** Gibt die Frage im einheitlichen Format zurück oder `null` (dann gemeldet und zu überspringen). */
export function normalizeQuestion(raw: unknown): PathQuestion | null {
  const q = build(raw);
  if (typeof q === "string") {
    reportSkipped(raw, q);
    return null;
  }
  return q;
}

/** Wie `normalizeQuestion` für eine Liste; übersprungene Fragen fehlen im Ergebnis. */
export function normalizeQuestions(raw: unknown): PathQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const q = normalizeQuestion(r);
    return q ? [q] : [];
  });
}

/** Frage oder Grund (Text), warum sie nicht spielbar ist. */
function build(raw: unknown): PathQuestion | string {
  if (!isRec(raw)) return "keine Frage";
  const id = str(raw.id);
  const prompt = str(raw.prompt);
  if (!id || prompt === null) return "Id oder Fragetext fehlt";
  const type = TYPE_ALIASES[String(raw.type ?? "").trim().toLowerCase()];
  if (!type) return `unbekannter Typ ${String(raw.type)}`;
  const correctShape = normalizeCorrect(raw.correct);
  // SIN-477: Zuordnen nutzt nur `pairs`. `correct` kommt dort oft als Paarliste und wird nicht gebraucht.
  if (correctShape === null && type !== "zuordnen") return "unbekannte Form von correct";
  const correct = correctShape ?? "";
  const choices = raw.choices === undefined ? undefined : strList(raw.choices);
  if (choices === null) return "unbekannte Form von choices";

  const out: PathQuestion = {
    id,
    type,
    level: (str(raw.level) as QuestionLevel | null) ?? "verstehen",
    prompt,
    choices,
    correct,
    explanation: str(raw.explanation) ?? "",
    sourceUrl: str(raw.sourceUrl) ?? "",
    examAreas: strList(raw.examAreas) ?? [],
    image: raw.image as PathQuestion["image"],
    sampleSolution: str(raw.sampleSolution) ?? undefined,
    sampleChecklist: strList(raw.sampleChecklist) ?? undefined,
  };

  if (type === "auswahl" && !choices?.length) return "Auswahl ohne choices";
  if (type === "zuordnen") {
    const pairs = normalizePairs(raw.pairs);
    if (!pairs?.length) return "unbekannte Form von pairs";
    out.pairs = pairs;
  }
  if (type === "reihenfolge") {
    const steps = strList(raw.steps);
    if (!steps?.length) return "unbekannte Form von steps";
    out.steps = steps;
  }
  if (type === "lueckentext") {
    const gaps = normalizeGaps(raw.blanks, correct);
    if (!gaps) return "unbekannte Form von blanks";
    out.gaps = gaps;
    // `{{id}}` im Fragetext wird zu "[Lücke n]".
    out.prompt = prompt.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m: string, key: string) => {
      const i = gaps.findIndex((g) => g.id === key);
      return i >= 0 ? `[Lücke ${i + 1}]` : m;
    });
  }
  if (type === "rechnen" && !choices?.length && !out.sampleSolution) {
    const text = Array.isArray(correct) ? correct.join(", ") : correct;
    if (!text) return "rechnen ohne Lösung";
    out.sampleSolution = text;
  }
  return out;
}
