/**
 * AP-18e: Generate prompt templates for the four didactic variants.
 * AP-14 generate-agent calls buildDidaktikBlockPrompt for each curriculum block.
 */

import {
  variantFromBlock,
  type UnitVariant,
} from "@/lib/content/didaktik";
import {
  blockSources,
  type Curriculum,
  type CurriculumBlock,
  type CurriculumModule,
  type QuestionMix,
} from "@/lib/content/curriculum";
import { ELEKTRO_HINWEIS } from "@/lib/review/pruefhinweise";

const VARIANT_RULES: Record<UnitVariant, string> = {
  standard:
    "Variante standard: sections.einstieg (1 Satz Praxis), sections.kern (≤120 Wörter), sections.beispiel (≤60 Wörter), sections.merksatz (≤15 Wörter).",
  ablauf:
    "Variante ablauf: sections.kern als nummerierte Schritte (3–7). image.kind=flow aus genau diesen Schritten (Mermaid → SVG). generatedFrom = Mermaid-Quelltext.",
  rechnen:
    "Variante rechnen: sections.kern nennt Größen, Einheiten und Formel; sections.beispiel ist vollständiger Rechenweg; sections.merksatz = Formel in Worten. Rechenfragen mit Toleranz/Rundung und sampleSolution.",
  sicherheit:
    "Variante sicherheit: sections.kern in Folge Gefahr → Regel → Folge bei Verstoß. image.kind=sign wenn sinnvoll. safetyFlag=true auf jeder Einheit.",
};

export function formatMix(mix: QuestionMix): string {
  return (Object.entries(mix) as Array<[keyof QuestionMix, number]>)
    .map(([k, v]) => `${k}=${v}%`)
    .join(", ");
}

/**
 * SIN-432: Regeln für auswahl und reihenfolge. Ursachen der Verwerfungen (SIN-395):
 * Niveau unter 4 und mehrdeutige Antworten (Eindeutigkeit).
 */
export const AUSWAHL_REGELN = `Regeln für Fragetyp auswahl und reihenfolge (der Richter verwirft sonst):
- auswahl: 4 Antworten, genau EINE ist nach der zitierten Quelle richtig. Jede falsche Antwort ist nach der Quelle eindeutig falsch, nicht nur "weniger passend". Keine zweite Antwort, die als teilweise richtig gelten kann. Kein "alle genannten", "keine der genannten", keine Verneinung in der Frage.
- Distraktoren: gleiche Länge, gleiche Satzform, gleicher Fachbereich wie die richtige Antwort; typische Fehlvorstellungen aus der Praxis, keine Scherzantworten. Die richtige Antwort steht nicht immer an derselben Stelle und ist nicht die längste.
- Niveau: Fragen auf dem Niveau des Moduls (Jahr 1 = Zwischenprüfung, Jahr 2+ = Abschlussprüfung). Nicht nur Namen oder Zahlen abfragen: Situation aus dem Betrieb schildern und eine Entscheidung, Ursache oder Folge verlangen. Bei Stufe anwenden mindestens eine konkrete Angabe (Maschine, Werkstück, Wert) in der Frage.
- reihenfolge: 4–6 Schritte, die Quelle schreibt genau diese Folge zwingend vor. Keine Schritte, die sich vertauschen lassen. Jeder Schritt eine Handlung, gleiche Satzform, keine Nummern im Text.
- Begründung (explanation) nennt, warum die richtige Antwort gilt und warum eine typische falsche nicht.`;

/**
 * SIN-433: Regeln für rechnen, zuordnen und lueckentext. Verwerfungen nach SIN-432:
 * maf-metall/PA rechnen (Niveau), LF1 zuordnen (Eindeutigkeit), LF2 lueckentext und zuordnen (Niveau).
 */
export const RECHNEN_ZUORDNEN_LUECKE_REGELN = `Regeln für Fragetyp rechnen, zuordnen und lueckentext (der Richter verwirft sonst):
- rechnen: Betriebssituation mit konkreten Werten und Einheiten (Maschine, Werkstück, Auftrag), kein nacktes "Berechne x". Mindestens zwei Rechenschritte oder eine Umstellung der Formel; Formel aus der zitierten Quelle. Das Ergebnis steht mit Einheit, Rundung und Toleranz in correct. sampleSolution zeigt jeden Schritt, sampleChecklist prüft Formel, Einheit und Ergebnis. Level anwenden, nie erinnern.
- zuordnen: 4–6 Paare, jedes Element passt nach der Quelle zu genau EINEM Gegenstück. Linke Seite: gleichartige Begriffe (alle Werkstoffe, alle Prüfmittel). Rechte Seite: gleich lange Beschreibungen, die sich nicht überschneiden und nicht mehrere Begriffe treffen. Keine Paare, in denen ein Begriff Oberbegriff eines anderen ist. Keine Zusatzglieder, die zu keinem Paar gehören.
- zuordnen (Niveau): Rechte Seite beschreibt Funktion, Anwendung oder Folge in einer Situation, nicht die Definition aus dem Merksatz. Namen wortgleich vom Begriff auf die Beschreibung zu übertragen reicht nicht.
- lueckentext: Satz oder kurzer Absatz mit 1–3 Lücken, jede Lücke hat genau EIN fachlich richtiges Wort nach der Quelle (keine Synonyme möglich, sonst Hinweis in der Aufgabe). Fehlt der Fachbegriff, muss der Rest des Satzes ihn eindeutig bestimmen. Keine Lücke für Artikel, Füllwörter oder Zahlen ohne Bezug. Lücken verlangen Verständnis (Ursache, Zusammenhang, Wirkung), nicht nur Auswendiglernen eines Namens; Stufe verstehen oder anwenden.
- Alle drei: Begründung (explanation) nennt, warum die Lösung gilt. Kein Satz "Quelle: …" im Text, die Quelle steht nur in sourceUrl.`;

/**
 * SIN-475: Niveau bei auswahl. Verwerfungen nach SIN-432/433: maf-metall LF2 auswahl 17 (davon 14 Niveau),
 * LF1 auswahl 9 (alle Niveau). Der Richter vergibt Niveau 4 nur, wenn die Frage eine Entscheidung verlangt;
 * Definitionsfragen und Wortvergleiche bleiben darunter. Ergänzt AUSWAHL_REGELN (SIN-432), ersetzt sie nicht;
 * das Format steht in FRAGE_FORMAT (SIN-473).
 */
export const AUSWAHL_NIVEAU_REGELN = `Niveau bei auswahl (Zwischenprüfung Jahr 1; der Richter verwirft Fragen unter Niveau 4):
- Aufbau: 1–2 Sätze Betriebssituation mit konkretem Werkstück, Werkstoff, Maschine oder Messwert, dann EINE Frage nach Entscheidung, Ursache oder Folge ("Welches Werkzeug ist hier richtig?", "Woran liegt die Abweichung?", "Was geschieht, wenn ...?"). Keine Frage der Form "Was ist ...?", "Wie heißt ...?" oder "Welche Aussage über X stimmt?" ohne Situation.
- Die richtige Antwort verlangt, zwei Angaben der Frage mit der Quelle zu verknüpfen (z. B. Werkstoff und Verfahren, Toleranz und Prüfmittel). Sie lässt sich nicht durch das Wiedererkennen eines Wortes aus dem Merksatz finden.
- Stufe erinnern höchstens bei 2 von 7 Fragen und dann nur für Sicherheits- oder Normwerte aus der Quelle. Alle anderen Fragen sind verstehen oder anwenden, mit level passend zur Frage.
- Die Distraktoren sind in der Situation plausible Entscheidungen, die nach der Quelle an einer genannten Angabe scheitern. Eine zu leichte Frage (zwei Antworten offensichtlich absurd) wird verworfen.
- Der Quellenbezug bleibt Pflicht: Was die Frage voraussetzt, steht in der zitierten Quelle; Werte, Maße und Verfahren nicht erfinden.`;

/** Modulspezifische Schwerpunkte für das Niveau (nur Frageform, keine neuen Fakten; Fakten kommen aus der Quelle). */
const MODUL_NIVEAU_HINWEISE: Record<string, string> = {
  LF1: "Niveau-Hinweis LF1 (handgeführte Werkzeuge): Situation am Werkstück (Zeichnung lesen, Werkstoff und Halbzeug wählen, von Hand trennen, umformen oder prüfen) mit einer konkreten Angabe (Werkstoff, Maß, Werkzeug). Gefragt wird, welches Vorgehen, Werkzeug oder Prüfmittel nach der Quelle passt oder warum etwas misslingt, nie die bloße Benennung eines Werkzeugs, Werkstoffs oder Zeichnungselements.",
  LF2: "Niveau-Hinweis LF2 (Maschinen): Situation an der Maschine (Bohren, Drehen, Fräsen, Toleranz oder Prüfmittel wählen, Messfehler, Standzeit, Kühlschmierung) mit einer konkreten Angabe (Werkstoff, Durchmesser, Toleranzklasse, Messwert). Gefragt wird nach Ursache, Folge oder dem passenden Verfahren, Werkzeug oder Prüfmittel mit Begründung aus der Quelle, nie nach dem Namen eines Maschinenteils oder Verfahrens.",
};

function niveauRegelnAus(): boolean {
  return process.env.PROMPT_NIVEAU_REGELN === "aus";
}

export function modulNiveauHinweis(moduleId: string): string {
  return niveauRegelnAus() ? "" : (MODUL_NIVEAU_HINWEISE[moduleId] ?? "");
}

/**
 * `PROMPT_AUSWAHL_REGELN=aus` erzeugt den Prompt von vor SIN-432 und SIN-433, `PROMPT_NIVEAU_REGELN=aus` den von
 * vor SIN-475 (nur für Vorher-Läufe im Vergleich).
 */
function auswahlRegelnBlock(): string {
  if (process.env.PROMPT_AUSWAHL_REGELN === "aus") return "";
  const niveau = niveauRegelnAus() ? "" : `${AUSWAHL_NIVEAU_REGELN}\n`;
  return `\n${AUSWAHL_REGELN}\n${niveau}${RECHNEN_ZUORDNEN_LUECKE_REGELN}`;
}

/** SIN-473: feste Form je Fragetyp (Quelle: question-schema.ts). Ungültige Fragen werden einmal repariert, dann verworfen. */
export const FRAGE_FORMAT = `Feste Form je Fragetyp (type nur genau so; Pflicht: id, type, level, prompt, correct, explanation, sourceUrl, examAreas):
- auswahl: choices = Liste mit 2–6 Texten; correct = genau ein Text aus choices.
- zuordnen: pairs = Liste von 2–8 Paaren [Begriff, Zuordnung] (Liste, kein Objekt); correct = Liste der rechten Seiten in der Reihenfolge der pairs.
- lueckentext: blanks = Wortliste mit 2–8 Texten (Liste, kein Objekt); prompt enthält ____ als Lücke; correct = ein Wort aus blanks.
- reihenfolge: steps = Liste mit 3–8 Schritten in richtiger Folge; correct = die steps mit " → " verbunden (ein Text).
- rechnen: correct = Ergebnis mit Einheit (ein Text); sampleSolution = Rechenweg; sampleChecklist optional (Liste).
`;

/** SIN-620: Interne Hinweise standen in Erklärungen und Fragen. Muster und Wächter: src/lib/review/pruefhinweise.ts. */
export const TEXT_REGELN = `Regeln für jeden Text, den Lernende sehen (Einheit und Frage; der Wächter blockiert sonst):
- Keine internen Prüfhinweise wie "bei der Stichprobe gegenzuprüfen", "Abgleich mit …" oder "Quelle: KMK …". Die Quelle steht nur im Feld sourceUrl, nie im Text.
- Nennt ein Text elektrische Eingriffe (spannungsfrei schalten, verdrahten, anklemmen), steht dort der Satz: ${ELEKTRO_HINWEIS}
`;

export function didaktikSchemaHint(): string {
  return `Schema je Einheit: {"id","title","minutes","moduleId","blockId","variant","sections":{"einstieg","kern","beispiel","merksatz"},"explanation":"Zusammenfassung der sections (Fallback)","explanationSimple?","image?":{"src","alt","longDescription?","kind","source":{"url","license","attribution?"},"generatedFrom?"},"safetyFlag?","questions":[{"id","type","level":"erinnern|verstehen|anwenden","prompt","choices?","pairs?","steps?","blanks?","correct","explanation","sourceUrl","examAreas","image?","sampleSolution?","sampleChecklist?"}]}.
Stufenmix pro Einheit: 2 erinnern / 3 verstehen / 2 anwenden (bei 7 Fragen; bei 5–8 anpassen). Rückmeldung ≤60 Wörter, ohne Quellensatz (Quelle nur in sourceUrl).
Offene Aufgaben (rechnen/kurze Begründung): nur sampleSolution + sampleChecklist zur Selbstkontrolle — keine KI-Bewertung.
Phase A: nur generierte SVG (license Generated-SVG), keine Commons-/KI-Bilder.
explanation muss immer gesetzt sein (Fallback aus sections).
${FRAGE_FORMAT}${TEXT_REGELN}${auswahlRegelnBlock()}`;
}

/** Full block prompt with variant rules (AP-14/AP-15 contract). */
export function buildDidaktikBlockPrompt(
  c: Curriculum,
  mod: CurriculumModule,
  block: CurriculumBlock,
): string {
  const sources = blockSources(c, block);
  const fetchedAt = sources[0]?.fetchedAt ?? c.version;
  const sourceUrls =
    sources.map((s) => s.url).join(" | ") || "(amtliche AO/RLP-Quellen)";
  const variant = variantFromBlock({
    rechnen: block.rechnen,
    safety: block.safety || mod.safety,
    topics: block.topics,
  });
  const examAreas = mod.examAreas.join(", ") || "(keine)";

  return `Erzeuge ${block.units} Lerneinheiten (je 5–10 Minuten) für den Block "${block.title}" im Modul "${mod.title}"
der Ausbildung ${c.keyword}${c.variantLabel ? `, ${c.variantLabel}` : ""}, Ausbildungsjahr ${mod.year}.
Niveau: ${mod.niveau}. Themen: ${block.topics.join("; ")}.
${modulNiveauHinweis(mod.id) ? `${modulNiveauHinweis(mod.id)}\n` : ""}Erlaubte Quellen (nur diese zitieren, URL in sourceUrl, Abrufdatum ${fetchedAt} in sourceFetchedAt): ${sourceUrls}.
Fragetypen-Mix in Prozent: ${formatMix(mod.questionMix)}.
examAreas je Frage aus dem Modul: [${examAreas}].
Didaktik-Variante für diesen Block: ${variant}.
${VARIANT_RULES[variant]}
Verboten: IHK-Prüfungsaufgaben oder Umformulierung, Personendaten, Inhalte ohne Quelle, KI-Bewertung von Lernenden.
Jede Einheit trägt moduleId="${mod.id}", blockId="${block.id}", variant="${variant}".
${didaktikSchemaHint()}
Antworte nur mit JSON: {"id","title","focus","moduleId","blockId","units":[...]}`;
}

/** Lightweight keyword prompt (seed/live without map block) — still enforces 4 variants. */
export function buildDidaktikKeywordPrompt(keyword: string, variant: UnitVariant = "sicherheit"): string {
  return `Erzeuge EIN vollständiges Lernfeld als JSON für "${keyword}", Fokus Sicherheit und Gesundheitsschutz.
3 Einheiten, Variante ${variant}. ${VARIANT_RULES[variant]}
Je Einheit sections + explanation-Fallback, 5–8 Fragen mit level und examAreas (z.B. WISO-1).
Typen: auswahl|zuordnen|lueckentext|reihenfolge|rechnen. Bildfragen als auswahl/zuordnen mit image.
${didaktikSchemaHint()}
Keine IHK-Originalprüfungen, keine Personendaten. Nur JSON.`;
}

export function variantRules(): Record<UnitVariant, string> {
  return { ...VARIANT_RULES };
}

/** System-Prompt des Kurslaufs (gleicher Präfix für alle Anfragen, Prompt-Caching). Auch in Langfuse Prompt Management (SIN-299). */
export function generatorSystemText(): string {
  const rules = Object.values(variantRules()).join("\n");
  return `Du erzeugst Lerneinheiten als reines JSON. Didaktik-Regeln:\n${rules}\n${didaktikSchemaHint()}`;
}
