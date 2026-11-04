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
  choice: "auswahl",
  choices: "auswahl",
  true_false: "auswahl",
  zuordnen: "zuordnen",
  matching: "zuordnen",
  match: "zuordnen",
  pairs: "zuordnen",
  lueckentext: "lueckentext",
  fill: "lueckentext",
  fill_blank: "lueckentext",
  fill_in_blank: "lueckentext",
  fill_in_blanks: "lueckentext",
  blank: "lueckentext",
  blanks: "lueckentext",
  cloze: "lueckentext",
  reihenfolge: "reihenfolge",
  ordering: "reihenfolge",
  order: "reihenfolge",
  steps: "reihenfolge",
  rechnen: "rechnen",
  numeric: "rechnen",
  numeric_input: "rechnen",
};

/**
 * SIN-1532: Die Tabelle `questions` kennt nur `choices` und `correct`. Bei den Schreibweisen oben stehen
 * Paare, Schritte und Lösungslisten in `correct`. Für die fünf Typnamen selbst bleibt es beim bisherigen Lesen.
 */
const WAHR_FALSCH = ["Wahr", "Falsch"];
const GAP_MARK = /_{2,}/g;

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

/** Mehrere Lösungen ohne `blanks`: nur eindeutig, wenn der Text genauso viele Lücken (`____`) hat. */
function gapsFromAnswers(prompt: string, answers: string[]): Gaps | null {
  if ((prompt.match(GAP_MARK) ?? []).length !== answers.length) return null;
  return answers.map((a, i) => ({ id: String(i + 1), options: [], accepted: [a] }));
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
  const rawType = String(raw.type ?? "").trim().toLowerCase();
  const type = TYPE_ALIASES[rawType];
  if (!type) return `unbekannter Typ ${String(raw.type)}`;
  const aliased = type !== rawType;
  const correctShape = normalizeCorrect(raw.correct);
  // SIN-477: Zuordnen nutzt nur `pairs`. `correct` kommt dort oft als Paarliste und wird nicht gebraucht.
  if (correctShape === null && type !== "zuordnen") return "unbekannte Form von correct";
  let correct = correctShape ?? "";
  let choices = raw.choices === undefined ? undefined : strList(raw.choices);
  if (choices === null) return "unbekannte Form von choices";
  if (rawType === "true_false") {
    // Ohne choices gelten Wahr/Falsch; die Antwort wird auf die Schreibweise der Auswahl gebracht.
    choices ??= WAHR_FALSCH;
    const hit = choices.find((c) => typeof correct === "string" && normalizeAnswer(c) === normalizeAnswer(correct));
    if (!hit) return "true_false: correct passt zu keiner Auswahl";
    correct = hit;
  }

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
    const pairs = normalizePairs(raw.pairs ?? (aliased ? raw.correct : undefined));
    if (!pairs?.length) return "unbekannte Form von pairs";
    out.pairs = pairs;
  }
  if (type === "reihenfolge") {
    const steps = strList(raw.steps ?? (aliased ? raw.correct : undefined));
    if (!steps?.length) return "unbekannte Form von steps";
    out.steps = steps;
  }
  if (type === "lueckentext") {
    const mehrere = aliased && raw.blanks === undefined && Array.isArray(correct) && correct.length > 1;
    const gaps = Array.isArray(correct) && mehrere ? gapsFromAnswers(prompt, correct) : normalizeGaps(raw.blanks, correct);
    if (!gaps) return "unbekannte Form von blanks";
    out.gaps = gaps;
    if (mehrere) {
      let n = 0;
      out.prompt = prompt.replace(GAP_MARK, () => `[Lücke ${++n}]`);
      return out;
    }
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
