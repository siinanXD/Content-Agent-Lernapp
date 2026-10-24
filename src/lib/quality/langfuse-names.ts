/**
 * SIN-299 — Lesbare Langfuse-Daten: Trace-Namen, Session je Kurslauf, Tags, Prüfpunkte.
 * Reine Logik ohne Netz. Nur Kennungen und Zahlen, keine Prompts und keine Personendaten.
 */
import type { QuestionEval } from "./schemas";

/** Schritte eines Kurslaufs in der Reihenfolge der Pipeline. */
export const KURSLAUF_SCHRITTE = {
  recherche: "Quellen prüfen",
  plan: "Plan erstellen",
  erzeugen: "Fragen erzeugen",
  pruefen: "Fragen prüfen",
  veroeffentlichen: "Veröffentlichen",
  kosten: "Kosten",
  stichprobe: "Sicherheits-Stichprobe",
} as const;
export type KurslaufSchritt = keyof typeof KURSLAUF_SCHRITTE;

export type TraceKontext = {
  /** Beruf, z. B. "MAF Metall". */
  beruf?: string;
  /** Schwerpunkt, z. B. "Metall". */
  schwerpunkt?: string;
  /** Lernfeld oder Modul, z. B. "LF3" oder "M0". */
  modul?: string;
  schritt: KurslaufSchritt;
  modell?: string;
  promptVersion?: string;
  umgebung?: string;
  /** SIN-383: Art des Laufs, Tag `lauf:…`. */
  laufArt?: LaufArt;
};

/** SIN-383: Lauf-Art als Tag, damit Dashboards Grundbestand, Reparatur und neue Module trennen. */
export const LAUF_ARTEN = {
  grundbestand: "Grundbestand",
  reparatur: "Reparatur",
  neuesModul: "neues Modul",
  /** SIN-448: Modellvergleich, nichts davon geht live. */
  vergleich: "Modellvergleich",
} as const;
export type LaufArt = keyof typeof LAUF_ARTEN;

export const DEFAULT_BERUF = "MAF Metall";

/** Session-ID eines Kurslaufs; alle Schritte teilen sie (Langfuse: höchstens 200 Zeichen). */
export function kurslaufSessionId(runId: string): string {
  return `kurslauf-${runId}`.slice(0, 200);
}

/** `Kurslauf MAF Metall · LF3 · Fragen erzeugen` statt Funktionsnamen. */
export function traceTitel(k: Pick<TraceKontext, "beruf" | "modul" | "schritt">): string {
  const teile = [`Kurslauf ${k.beruf ?? DEFAULT_BERUF}`];
  if (k.modul) teile.push(k.modul);
  teile.push(KURSLAUF_SCHRITTE[k.schritt]);
  return teile.join(" · ").slice(0, 200);
}

/** SIN-383: Titel eines Einheiten-Traces, z. B. `M3 · 02 Spannmittel` (Nummer aus `…-u2`). */
export function einheitTitel(u: { id: string; title: string; moduleId?: string }, modul?: string): string {
  const nr = /-u(\d+)$/.exec(u.id)?.[1];
  const teile = [u.moduleId ?? modul, nr ? `${nr.padStart(2, "0")} ${u.title}` : u.title].filter(Boolean);
  return teile.join(" · ").slice(0, 200);
}

/** Umgebung als Langfuse-Environment (klein, ohne Leerzeichen, nicht mit "langfuse" beginnend). */
export function umgebungsName(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.LANGFUSE_TRACING_ENVIRONMENT || env.VERCEL_ENV || env.NODE_ENV || "development")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 40);
  return raw.startsWith("langfuse") || raw === "" ? "development" : raw;
}

const tag = (key: string, value?: string) => (value ? `${key}:${value}`.slice(0, 200) : null);

/** Tags zum Filtern: Beruf, Schwerpunkt, Modul, Schritt, Modell, Prompt-Version, Umgebung. */
export function traceTags(k: TraceKontext): string[] {
  return [
    tag("beruf", k.beruf ?? DEFAULT_BERUF),
    tag("schwerpunkt", k.schwerpunkt),
    tag("modul", k.modul),
    tag("schritt", k.schritt),
    tag("lauf", k.laufArt ? LAUF_ARTEN[k.laufArt] : undefined),
    tag("modell", k.modell),
    tag("prompt", k.promptVersion),
    tag("umgebung", k.umgebung ?? umgebungsName()),
  ].filter((t): t is string => t !== null);
}

/** Metadaten mit denselben Dimensionen (Strings; Auswertung im Dashboard). */
export function traceMetadata(k: TraceKontext): Record<string, string> {
  const out: Record<string, string> = {
    beruf: k.beruf ?? DEFAULT_BERUF,
    schritt: k.schritt,
    umgebung: k.umgebung ?? umgebungsName(),
  };
  if (k.schwerpunkt) out.schwerpunkt = k.schwerpunkt;
  if (k.modul) out.modul = k.modul;
  if (k.laufArt) out.laufArt = LAUF_ARTEN[k.laufArt];
  if (k.modell) out.modell = k.modell;
  if (k.promptVersion) out.promptVersion = k.promptVersion;
  return out;
}

/** Sinans Prüfpunkte (deutsche Score-Namen, höchstens 35 Zeichen). */
export const PRUEFPUNKTE = {
  sourceFidelity: "Quellentreue",
  uniqueness: "Eindeutigkeit",
  niveau: "Niveau",
  language: "Sprache",
} as const;
/** SIN-383: Scores je Frage für Sicherheit (1 = Sicherheitsthema, Stichprobe nötig) und das Gesamturteil. */
export const SICHERHEIT_SCORE = "Sicherheit";
export const BESTANDEN_SCORE = "bestanden";
export type PruefpunktSchluessel = keyof typeof PRUEFPUNKTE;

export type PruefpunktScore = { name: string; value: number; comment: string };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * Prüfpunkte eines Richter-Laufs als Scores mit Begründung des Richter-Modells.
 * Quellentreue und Eindeutigkeit = Anteil bestandener Fragen (0–1), Niveau und Sprache = Mittel (1–5).
 * Die Begründung nennt die Fragen, die den Punkt verfehlen, mit dem Satz des Richters.
 */
export function pruefpunktScores(questions: QuestionEval[]): PruefpunktScore[] {
  if (questions.length === 0) return [];
  const n = questions.length;
  const mean = (f: (q: QuestionEval) => number) => questions.reduce((s, q) => s + f(q), 0) / n;
  const round = (x: number) => Math.round(x * 100) / 100;
  const grund = (fails: QuestionEval[], fallback: string) =>
    fails.length === 0
      ? fallback
      : fails
          .slice(0, 3)
          .map((q) => `${q.questionId}: ${q.reasons[0] ?? "ohne Begründung"}`)
          .join("; ")
          .slice(0, 500);
  const low = (key: "niveau" | "language") => questions.filter((q) => q.scores[key] < 4);
  return [
    {
      name: PRUEFPUNKTE.sourceFidelity,
      value: round(mean((q) => q.scores.sourceFidelity)),
      comment: grund(questions.filter((q) => q.scores.sourceFidelity < 1), `Alle ${n} Fragen folgen aus der Quelle.`),
    },
    {
      name: PRUEFPUNKTE.uniqueness,
      value: round(mean((q) => q.scores.uniqueness)),
      comment: grund(questions.filter((q) => q.scores.uniqueness < 1), `Alle ${n} Fragen haben genau eine richtige Antwort.`),
    },
    {
      name: PRUEFPUNKTE.niveau,
      value: round(mean((q) => q.scores.niveau)),
      comment: grund(low("niveau"), `Alle ${n} Fragen mindestens Niveau 4 (Median ${median(questions.map((q) => q.scores.niveau))}).`),
    },
    {
      name: PRUEFPUNKTE.language,
      value: round(mean((q) => q.scores.language)),
      comment: grund(low("language"), `Alle ${n} Fragen mindestens Sprache 4 (Median ${median(questions.map((q) => q.scores.language))}).`),
    },
  ];
}

/** Langfuse erlaubt in Score-Namen nur Buchstaben, Ziffern, _ Leerzeichen . ( ) - und höchstens 35 Zeichen. */
export function scoreNamesValid(names: string[]): boolean {
  return names.every((n) => n.length > 0 && n.length <= 35 && /^[\p{L}\p{N}_ .()-]+$/u.test(n));
}

/** Prüf-Warteschlange (Sicherheits-Stichprobe) und ihre Urteile. */
export const QUEUE_NAME = "Sicherheits-Stichprobe";
export const STICHPROBE_SCORE = "Stichprobe Sicherheit";
export const STICHPROBE_URTEILE = [
  { label: "passt", value: 1 },
  { label: "unklar", value: 0 },
  { label: "falsch", value: -1 },
] as const;

/** Namen der Prompts in Langfuse Prompt Management. */
export const PROMPT_NAMEN = {
  richter: "richter-maf",
  erzeuger: "erzeuger-maf",
} as const;

/** SIN-1048: Massenläufe (Grundbestand, neues Modul) werden gesampelt; Reparatur und Vergleich nie. */
const MASSENLAEUFE: readonly LaufArt[] = ["grundbestand", "neuesModul"];

/** `LANGFUSE_SAMPLE_RATE` (0 bis 1); fehlt oder ungültig → 1 (alles schreiben). */
export function sampleRate(env: Record<string, string | undefined> = process.env): number {
  const raw = env.LANGFUSE_SAMPLE_RATE?.trim();
  const r = Number(raw);
  return raw && Number.isFinite(r) && r >= 0 && r <= 1 ? r : 1;
}

/**
 * Schreibt diese Einheit einen Langfuse-Trace? Stabil je Einheit (FNV-1a), nur für Massenläufe.
 * Richter-Scores bleiben in question_evaluations vollständig; das Qualitäts-Tor liest dort, nicht aus Langfuse.
 */
export function traceStichprobe(unitId: string, laufArt: LaufArt | undefined, rate: number = sampleRate()): boolean {
  if (rate >= 1 || !laufArt || !MASSENLAEUFE.includes(laufArt)) return true;
  let h = 0x811c9dc5;
  for (const c of unitId) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h / 0x100000000 < rate;
}
