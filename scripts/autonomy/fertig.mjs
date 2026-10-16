/**
 * Fertig-Liste Lern-App v1 (SIN-764): `docs/FERTIG.md` mit Checkboxen. Solange ein Punkt offen ist, legt der Planer
 * keine Ideen an und plant nur Bugs; jeder offene Punkt wird genau einmal als Issue (Titel = Punkt) angelegt.
 */
import { existsSync, readFileSync } from "node:fs";

export const FERTIG_FILE = "docs/FERTIG.md";
/** Priorität „High“ in Linear (1 Urgent, 2 High, 3 Medium, 4 Low). */
export const FERTIG_PRIORITY = 2;

/** Punkte der Liste, `offen` = `- [ ]`. Zeilen ohne Checkbox zählen nicht. */
export function parseFertig(md) {
  return [...String(md).matchAll(/^- \[( |x|X)\] (.+?)\s*$/gm)].map((m) => ({ text: m[2], offen: m[1] === " " }));
}

export const offeneFertigPunkte = (md) => parseFertig(md).filter((p) => p.offen);

/** Fertig-Kriterien je Punkt (Stichwort im Text). Jeder Punkt gilt erst als fertig, wenn er live läuft (SIN-616). */
const KRITERIEN = [
  [/industriemechaniker/i, ["Alle Einheiten des Berufs sind veröffentlicht; jede Einheit nennt Quelle und Abrufdatum", "Nur Fragen, die den Richter bestehen, sind im Lernpfad sichtbar", "Der Beruf ist im Lernpfad live; Live-Check nach dem Deploy ist grün"]],
  [/industriekaufmann/i, ["Einheiten sind aus amtlicher Quelle erzeugt, belegt und veröffentlicht; ohne Quelle kein Inhalt", "Content-Guard und Richter laufen über alle Einheiten; kein Treffer auf der Verbotsliste", "Der Beruf ist im Lernpfad live auffindbar"]],
  [/crawler|testnutzer/i, ["Der Crawler läuft täglich über alle Routen", "Drei Tage in Folge 0 Fehler im Bericht", "Funde landen als Issues mit Dublettenprüfung"]],
  [/impressum/i, ["Impressum, Datenschutz und KI-Hinweis sind live und von der Startseite aus erreichbar", "Stripe-Abo ist im Testmodus von der Anmeldung bis zur Bestätigung durchspielbar", "Der Stripe-Live-Schalter bleibt unverändert (Freigabe nur durch Sinan)"]],
  [/platzhalter-kurse/i, ["Die leeren MAF-Schwerpunkt-Kurse erscheinen in keiner Auswahl (Kursliste, Startseite, Lernpfad)", "Ein Test prüft, dass leere Kurse ausgeblendet sind"]],
  [/so funktioniert/i, ["Die Seite „So funktioniert's“ ist live und vom Ausbilder-Bereich aus erreichbar", "Texte und Screens kommen aus Figma; fehlt ein Frame, ein Design-Issue statt Improvisation", "Der Klickpfad im Live-Check ist grün"]],
];
const FALLBACK = ["Der Punkt ist live und im Lernpfad oder Ausbilder-Bereich nutzbar", "Sinan bestätigt das Ergebnis im Issue"];

/** Fertig-Kriterien eines Punktes. Reine Funktion. */
export function fertigKriterien(text) {
  return (KRITERIEN.find(([re]) => re.test(text))?.[1] ?? FALLBACK).concat(["Done heißt live: erst nach Deploy und Live-Check auf Done (SIN-616)"]);
}

/**
 * Issues für die offenen Punkte, ohne Dubletten: Titel = Punkt, Schlüssel case-insensitiv gegen `taken`
 * (offene Issues und in den letzten 14 Tagen erledigte Titel).
 * @returns {{ lane: string, title: string, priority: number, labels: string[], description: string }[]}
 */
export function fertigIssues(md, taken = []) {
  const seen = new Set(taken.map((t) => String(t).trim().toLowerCase()));
  const out = [];
  for (const p of offeneFertigPunkte(md)) {
    const key = p.text.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      lane: "fertig",
      title: p.text.trim(),
      priority: FERTIG_PRIORITY,
      labels: ["claude"],
      description: `Punkt aus ${FERTIG_FILE} (Fertig-Liste Lern-App v1, SIN-764).\n\n## Fertig-Kriterien\n${fertigKriterien(p.text).map((k) => `- [ ] ${k}`).join("\n")}`,
    });
  }
  return out;
}

/** Inhalt von `docs/FERTIG.md`; fehlt die Datei, gibt es keine Sperre. */
export const fertigMarkdown = (path = FERTIG_FILE) => (existsSync(path) ? readFileSync(path, "utf8") : "");
