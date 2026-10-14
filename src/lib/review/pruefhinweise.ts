/**
 * SIN-620 — Interne Prüfhinweise („bei der Stichprobe gegenzuprüfen“, „Quelle: KMK …, Abgleich mit …“) gehören
 * nicht in Lerntext oder Fragen (Quelle nur in `sourceUrl`), und bei elektrischen Eingriffen steht die Zuständigkeit
 * der Elektrofachkraft im Text. Reine Funktionen: der Wächter (content-guard.ts), der Generator-Prompt und das
 * Bereinigungsskript (scripts/sin620-bereinigen.ts) nutzen dieselben Muster.
 */

export const PRUEFHINWEIS_MUSTER = /stichprobe|gegenzuprüfen|abgleich mit|Quelle: KMK/i;

export const ELEKTRO_MUSTER = /spannungsfrei|verdrahte|anklemm/i;
const ELEKTRO_VORHANDEN = /Elektrofachkr(?:aft|äfte)|elektrotechnisch unterwiesen/i;

export const ELEKTRO_HINWEIS =
  "Arbeiten an elektrischen Anlagen führen nur Elektrofachkräfte oder elektrotechnisch unterwiesene Personen im erlaubten Umfang aus.";

/** Entfernt jeden Satz mit Prüfhinweis; der Rest bleibt unverändert. */
export function entfernePruefhinweise(text: string): string {
  if (!PRUEFHINWEIS_MUSTER.test(text)) return text;
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((satz) => !PRUEFHINWEIS_MUSTER.test(satz))
    .join(" ")
    .trim();
}

type Frage = { id?: string; prompt?: string; explanation?: string; choices?: string[] };
type Einheit = {
  id?: string;
  explanation?: string;
  explanationSimple?: string;
  sections?: Partial<Record<"einstieg" | "kern" | "beispiel" | "merksatz", string>>;
  questions?: Frage[];
};

export type BereinigungsBericht = {
  /** Einheiten mit geändertem Text. */
  einheiten: string[];
  /** Fragen (`einheit/frage`) mit geändertem Prompt oder geänderter Erklärung. */
  fragen: string[];
  /** Einheiten, die den Elektro-Hinweis bekamen. */
  elektro: string[];
  /** Treffer, die nicht automatisch entfernt werden (Antworttexte, Text bestünde nur aus dem Hinweis). */
  manuell: string[];
};

const ABSCHNITTE = ["einstieg", "kern", "beispiel", "merksatz"] as const;

/**
 * Bereinigt ein erzeugtes Lernfeld (`course.generated`) und liefert eine Kopie plus Bericht.
 * Der Elektro-Hinweis kommt einmal je Einheit an `explanation` (fehlt sie: an den letzten Abschnitt), wenn Erklärung oder Abschnitte der Einheit
 * elektrische Eingriffe nennen und weder sie noch die Fragen eine Zuständigkeit nennen (Fragen lösen nichts aus).
 */
export function bereinigeLernfeld<T>(generated: T): { generated: T; bericht: BereinigungsBericht } {
  const bericht: BereinigungsBericht = { einheiten: [], fragen: [], elektro: [], manuell: [] };
  const lf = structuredClone(generated) as { units?: Einheit[] };

  for (const u of lf?.units ?? []) {
    const uid = u.id ?? "?";
    let geaendert = false;
    const saeubern = (text: string | undefined, ort: string): string | undefined => {
      if (typeof text !== "string") return text;
      const neu = entfernePruefhinweise(text);
      if (neu === "" && text !== "") {
        bericht.manuell.push(ort);
        return text;
      }
      return neu;
    };

    for (const feld of ["explanation", "explanationSimple"] as const) {
      const neu = saeubern(u[feld], `Einheit ${uid}`);
      if (neu !== u[feld]) {
        u[feld] = neu;
        geaendert = true;
      }
    }
    for (const a of ABSCHNITTE) {
      const neu = saeubern(u.sections?.[a], `Einheit ${uid}`);
      if (u.sections && neu !== u.sections[a]) {
        u.sections[a] = neu;
        geaendert = true;
      }
    }

    for (const q of u.questions ?? []) {
      const ort = `${uid}/${q.id ?? "?"}`;
      let frageGeaendert = false;
      for (const feld of ["prompt", "explanation"] as const) {
        const neu = saeubern(q[feld], `Frage ${ort}`);
        if (neu !== q[feld]) {
          q[feld] = neu;
          frageGeaendert = true;
        }
      }
      if (frageGeaendert) bericht.fragen.push(ort);
      if ((q.choices ?? []).some((c) => PRUEFHINWEIS_MUSTER.test(c))) bericht.manuell.push(`Antwort ${ort}`);
    }

    const einheitentext = [u.explanation, ...ABSCHNITTE.map((a) => u.sections?.[a])]
      .filter((t): t is string => typeof t === "string")
      .join(" ");
    const fragentext = (u.questions ?? []).flatMap((q) => [q.prompt, q.explanation]).filter((t) => typeof t === "string");
    if (ELEKTRO_MUSTER.test(einheitentext) && !ELEKTRO_VORHANDEN.test([einheitentext, ...fragentext].join(" "))) {
      const abschnitt = [...ABSCHNITTE].reverse().find((a) => u.sections?.[a]);
      if (typeof u.explanation === "string") {
        u.explanation = `${u.explanation.trimEnd()} ${ELEKTRO_HINWEIS}`;
      } else if (abschnitt && u.sections) {
        u.sections[abschnitt] = `${u.sections[abschnitt]!.trimEnd()} ${ELEKTRO_HINWEIS}`;
      } else {
        bericht.manuell.push(`Einheit ${uid}`);
      }
      if (typeof u.explanation === "string" || abschnitt) {
        geaendert = true;
        bericht.elektro.push(uid);
      }
    }
    if (geaendert) bericht.einheiten.push(uid);
  }
  return { generated: lf as T, bericht };
}
