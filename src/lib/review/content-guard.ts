/**
 * SIN-297 — Recht-und-Inhalt-Wächter. Läuft in `handlePublish` vor dem Veröffentlichen; jeder Verstoß
 * blockiert `publish` (HTTP 422). Reine Funktionen, kein Netz, keine Personendaten im Ergebnis
 * (Verstöße nennen Ort und Art, nie den gefundenen Wert).
 */
import type { Course } from "@/lib/storage/types";

export type Verstoss = {
  regel: "quelle" | "abrufdatum" | "ki-kennzeichnung" | "personendaten" | "ihk-aehnlichkeit" | "inhalt";
  ort: string;
  hinweis: string;
};

/** Kennzeichnung, die `handleGenerate` an jedes KI-erzeugte Lernfeld hängt. */
export type KiKennzeichnung = { text: string; model: string };

export const KI_KENNZEICHNUNG_TEXT = "Dieser Inhalt wurde mit KI erstellt und von einem Menschen freigegeben.";

/** Hängt die KI-Kennzeichnung an ein erzeugtes Lernfeld (eine vorhandene bleibt). Beide Speicher rufen das beim Ablegen. */
export function mitKiKennzeichnung<T>(generated: T): T {
  if (!generated || typeof generated !== "object" || Array.isArray(generated)) return generated;
  const lf = generated as T & { aiDisclosure?: Partial<KiKennzeichnung> };
  if (lf.aiDisclosure?.text?.trim()) return generated;
  return { ...lf, aiDisclosure: { text: KI_KENNZEICHNUNG_TEXT, model: "Claude (Anthropic)" } };
}

const PII_MUSTER: Array<[string, RegExp]> = [
  ["E-Mail-Adresse", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ["IBAN", /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/],
  ["Telefonnummer", /(?:\+49|\b0049|\b0)\s?\(?\d{2,5}\)?[\s/-]?\d{3,}[\s/-]?\d{2,}/],
];

const IHK_MARKER =
  /\b(IHK|Industrie-\s*und\s*Handelskammer)[\w\s-]{0,30}(Prüfungsaufgabe|Originalaufgabe|Aufgabensatz|Prüfungsfrage)|\b(Originalaufgabe|Originalprüfung)\b.{0,40}\bIHK\b/i;

/** Wortfolgen (Shingles) eines Textes, normalisiert: klein, ohne Satzzeichen. */
export function shingles(text: string, n = 5): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

/** Anteil der Wortfolgen von `text`, die auch im Referenztext vorkommen (0..1). */
export function aehnlichkeit(text: string, referenz: string, n = 5): number {
  const a = shingles(text, n);
  if (a.size === 0) return 0;
  const b = shingles(referenz, n);
  let treffer = 0;
  for (const s of a) if (b.has(s)) treffer++;
  return treffer / a.size;
}

export const IHK_SCHWELLE = 0.4;

type Einheit = {
  id?: string;
  title?: string;
  explanation?: string;
  sourceUrl?: string;
  sourceFetchedAt?: string;
  questions?: Array<{ id?: string; prompt?: string; explanation?: string; choices?: string[] }>;
};

type Lernfeld = { units?: Einheit[]; aiDisclosure?: Partial<KiKennzeichnung> };

function gueltigesDatum(s: unknown): boolean {
  return typeof s === "string" && s.trim() !== "" && !Number.isNaN(Date.parse(s));
}

function gueltigeUrl(s: unknown): boolean {
  if (typeof s !== "string") return false;
  try {
    const p = new URL(s).protocol;
    return p === "https:" || p === "http:";
  } catch {
    return false;
  }
}

function texte(lf: Lernfeld): Array<{ ort: string; text: string }> {
  const out: Array<{ ort: string; text: string }> = [];
  for (const u of lf.units ?? []) {
    const uid = u.id ?? "?";
    if (u.title) out.push({ ort: `Einheit ${uid}`, text: u.title });
    if (u.explanation) out.push({ ort: `Einheit ${uid}`, text: u.explanation });
    for (const q of u.questions ?? []) {
      const ort = `Frage ${uid}/${q.id ?? "?"}`;
      if (q.prompt) out.push({ ort, text: q.prompt });
      if (q.explanation) out.push({ ort, text: q.explanation });
      for (const c of q.choices ?? []) out.push({ ort, text: c });
    }
  }
  return out;
}

/**
 * Prüft einen Kurs vor dem Veröffentlichen. `ihkReferenz` sind optionale Vergleichstexte (nie ins Repo
 * kopierte Originale: der Aufrufer reicht sie nur zur Laufzeit herein); ohne sie greift nur der Marker.
 * Leere Liste = freigabefähig.
 */
export function pruefeVeroeffentlichung(
  course: Pick<Course, "sources" | "generated">,
  opts: { ihkReferenz?: string[] } = {},
): Verstoss[] {
  const v: Verstoss[] = [];
  const lf = (course.generated ?? {}) as Lernfeld;

  if (!lf.units?.length) {
    v.push({ regel: "inhalt", ort: "Kurs", hinweis: "Kein erzeugter Inhalt zum Veröffentlichen." });
    return v;
  }

  // Quelle und Abrufdatum: am Kurs und an jeder Einheit.
  const quellen = course.sources ?? [];
  if (quellen.length === 0) v.push({ regel: "quelle", ort: "Kurs", hinweis: "Keine amtliche Quelle am Kurs." });
  quellen.forEach((q, i) => {
    if (!gueltigeUrl(q.url)) v.push({ regel: "quelle", ort: `Quelle ${i + 1}`, hinweis: "Quelle ohne gültige URL." });
    if (!gueltigesDatum(q.fetchedAt)) {
      v.push({ regel: "abrufdatum", ort: `Quelle ${i + 1}`, hinweis: "Abrufdatum fehlt oder ist ungültig." });
    }
  });
  for (const u of lf.units) {
    const ort = `Einheit ${u.id ?? "?"}`;
    if (!gueltigeUrl(u.sourceUrl)) v.push({ regel: "quelle", ort, hinweis: "Einheit ohne Quelle." });
    if (!gueltigesDatum(u.sourceFetchedAt)) v.push({ regel: "abrufdatum", ort, hinweis: "Einheit ohne Abrufdatum." });
  }

  if (!lf.aiDisclosure?.text?.trim()) {
    v.push({ regel: "ki-kennzeichnung", ort: "Kurs", hinweis: "KI-Kennzeichnung fehlt." });
  }

  for (const { ort, text } of texte(lf)) {
    for (const [art, muster] of PII_MUSTER) {
      if (muster.test(text)) v.push({ regel: "personendaten", ort, hinweis: `${art} im Text.` });
    }
    if (IHK_MARKER.test(text)) {
      v.push({ regel: "ihk-aehnlichkeit", ort, hinweis: "Text nennt eine IHK-Prüfungsaufgabe als Vorlage." });
    }
    for (const ref of opts.ihkReferenz ?? []) {
      if (aehnlichkeit(text, ref) >= IHK_SCHWELLE) {
        v.push({ regel: "ihk-aehnlichkeit", ort, hinweis: "Zu große Ähnlichkeit zu einer Referenzaufgabe." });
        break;
      }
    }
  }
  return v;
}
