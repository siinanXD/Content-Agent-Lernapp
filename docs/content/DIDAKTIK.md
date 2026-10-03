# Didaktik-Vorgabe: Lernen, Üben, Prüfen (AP-18)

Stand 2026-10-03 · Status: **von Sinan freigegeben (2026-10-03), 18a umgesetzt** · Linear [SIN-196](https://linear.app/sinan-kahraman/issue/SIN-196) · Entscheidung D-31 in `docs/DECISIONS.md` · gilt für alle Maps in `docs/content/*.json`.

Diese Vorgabe legt fest, wie eine Lerneinheit aufgebaut ist, wie Wissen abgefragt wird, wie Wiederholung funktioniert, wie die Prüfungsvorbereitung aussieht und wo Bilder eingesetzt werden. Sie ist die Schablone für den Inhalts-Agenten (AP-14, AP-15) und die Vorlage für die Screens (Figma, AP-07/AP-08). Ohne diese Schablone würden die 280 Einheiten der Phase A nach einer Form erzeugt, die danach geändert wird, und müssten neu erzeugt werden.

## 1. Grundsätze

1. **Drei Modi, feste Schablonen:** Lernen, Üben, Prüfen. Der Agent füllt Felder, er erfindet keine Struktur.
2. **Kleine Einheiten:** 5 bis 10 Minuten, sofortige Rückmeldung (PRODUCT.md, Duolingo-Prinzip).
3. **Nur amtliche Quellen:** jede Erklärung und jede Antwort nennt Quelle und Abrufdatum (AGENTS.md).
4. **Einfache Sprache:** Sätze bis 15 Wörter, ein Gedanke pro Satz, Fachwort beim ersten Auftreten erklärt. Der Schalter „Einfache Sprache“ liefert eine noch kürzere Fassung.
5. **Barrierefrei:** WCAG 2.2 AA, Tastatur, Vorlesen, Kontrast mindestens 4,5:1. Kein Bild trägt Information allein (Abschnitt 7).
6. **Die KI bewertet keine Lernenden** (AGENTS.md). Offene Aufgaben werden mit einer Musterlösung selbst verglichen. Es gibt keine KI-Note.
7. **Keine IHK-Prüfungsaufgaben,** auch nicht umformuliert. Prüfungsformate werden nachgebildet, die Aufgaben selbst aus Verordnung und Rahmenlehrplan geschrieben.

## 2. Seitentypen

| Seite | Zweck | Heute (AP-08) | Änderung in AP-18 |
| --- | --- | --- | --- |
| Start | Tagesziel und Weiter-Knopf | vorhanden | Tagesziel = fällige Wiederholungen + neue Einheiten + ggf. Prüfungsübung |
| Lernpfad | Übersicht Modul → Block → Einheit mit Fortschritt | flache Liste von Einheiten | Gruppierung nach Modul und Block aus der Map, Fortschrittsbalken je Modul, Prüfungsgebiet als Tag |
| Einheit | Erklärung, dann Fragen | nur Fragetyp Auswahl | Schablone aus Abschnitt 3, alle 5 Fragetypen, Bilder |
| Wiederholung | fällige Fragen aus dem Stapel | fehlt | neu (Abschnitt 5) |
| Prüfungsmodus | zeitgebundener Satz je Prüfungsbereich | fehlt | neu (Abschnitt 6) |
| Ergebnis | Rückmeldung nach Einheit oder Prüfung | vorhanden (nur Einheit) | zusätzlich Ergebnis je Prüfungsgebiet mit Ampel |
| Profil | Schalter, Fortschritt | vorhanden | Prüfungsreife je Gebiet, Größe des Wiederholungsstapels |

Drei neue Screens in Figma (390×844, bestehende Komponenten und Tokens, `docs/design/FIGMA.md`): Lernpfad gruppiert, Wiederholung, Prüfungsmodus mit Ergebnis je Gebiet.

## 3. Schablone Lerneinheit (Modus Lernen)

Eine Einheit behandelt ein Thema aus einem Block der Map. Felder in fester Reihenfolge:

| Feld | Regel | Beispiel (`maf-metall`, Block PA-2 „Rüsten und Umrüsten nach Vorgaben, Rüstzeiten“) |
| --- | --- | --- |
| `einstieg` | 1 Satz, Praxisbezug, direkte Ansprache | „Du sollst die Anlage von Teil A auf Teil B umrüsten, und die Schicht wartet.“ |
| `kern` | höchstens 120 Wörter, einfache Sprache, Fachwörter erklärt | Was Rüsten ist, warum Rüstzeit Stillstand ist, wie Rüstzeit und Stückzeit zusammenhängen |
| `beispiel` | ein konkreter Fall aus dem Betrieb, höchstens 60 Wörter | „Rüstzeit 20 Minuten, Stückzeit 2 Minuten, Los 100 Stück: Auftragszeit = 20 + 100 × 2 = 220 Minuten.“ |
| `merksatz` | 1 Satz, höchstens 15 Wörter | „Rüstzeit ist Zeit ohne Stück, darum so kurz wie möglich.“ |
| `image` (optional) | nur wenn Abschnitt 7 es vorsieht | Flussdiagramm des Rüstvorgangs |
| Quelle | URL und Abrufdatum aus `blockSources()` | Anlage II.A Nr. 5 MaschFüAusbV |

Varianten nach Blocktyp (Flags im Block der Map):

- **Standard** (kein Flag): wie oben.
- **Ablauf** (Themen wie „planen“, „durchführen“, „in Betrieb nehmen“): `kern` als nummerierte Schritte, 3 bis 7 Stück; Bild = Flussdiagramm aus genau diesen Schritten.
- **Rechnen** (`rechnen: true`): `kern` nennt Größen, Einheiten und Formel; `beispiel` ist ein vollständiger Rechenweg; `merksatz` ist die Formel in Worten; Bild = Skizze mit Maßen, wenn Geometrie im Spiel ist.
- **Sicherheit** (`safety: true`): `kern` in der Folge Gefahr → Regel → Folge bei Verstoß; Bild = Sicherheitszeichen; `safetyFlag` gesetzt, 10 % menschliche Stichprobe vor `publish`.

Richtwert: Erklärung 1 bis 2 Minuten Lesezeit, Fragen 4 bis 7 Minuten.

## 4. Fragen (Modus Üben)

Pro Einheit 5 bis 8 Fragen, aufsteigend nach Stufe:

| Stufe | Anzahl | Was geprüft wird | Typische Fragetypen |
| --- | --- | --- | --- |
| `erinnern` | 2 | Begriff, Zahl, Vorschrift | Auswahl, Lückentext |
| `verstehen` | 3 | Zusammenhang, Begründung, Zuordnung | Zuordnen, Auswahl, Reihenfolge |
| `anwenden` | 2 | Fall aus dem Betrieb, Rechnung | Rechnen, Reihenfolge, Auswahl mit Fall |

Regeln je Fragetyp:

- **Auswahl:** 4 Optionen, genau 1 richtig. Distraktoren plausibel und aus demselben Thema. Keine Optionen „alle“ oder „keine der genannten“.
- **Zuordnen:** 3 bis 5 Paare, Begriffe links, Erklärungen rechts, höchstens 1 Ablenker. Daten: `pairs` = Paare, `correct` = rechte Seiten in der Reihenfolge der linken.
- **Lückentext:** 1 bis 2 Lücken, Wortliste mit 1 bis 2 Ablenkern. Die Lücke trägt den Fachbegriff, kein Füllwort. Daten: `blanks` = Wortliste, `correct` = Lösungen in Reihenfolge der Lücken.
- **Reihenfolge:** 4 bis 6 Schritte, nur eindeutig geordnete Abläufe (Verordnung oder Rahmenlehrplan geben die Reihenfolge vor). Daten: `steps` = gemischt, `correct` = richtige Reihenfolge.
- **Rechnen:** realistische Zahlen, Einheit Pflicht, Rechenweg in der Erklärung, Toleranz oder Rundungsregel angegeben.
- **Bildfragen:** Bild-Auswahl („Welches Zeichen bedeutet …?“) und Bild-Zuordnung („Benenne die Teile 1 bis 5“) als Unterformen von Auswahl und Zuordnen (Abschnitt 7).

Bei 5, 6 oder 8 Fragen wird der Mix 2/3/2 skaliert (5: 1/3/1, 6: 2/2/2, 8: 2/4/2), Abweichung je Stufe höchstens 1. Die Fragen stehen aufsteigend nach Stufe.

**Rückmeldung:** sofort nach jeder Antwort. Erklärung höchstens 60 Wörter mit Quelle. Bei falscher Antwort steht die richtige Antwort mit Begründung dabei. Der Fragetypen-Mix je Modul kommt aus `questionMix` der Map.

**Qualität:** Der Richter prüft Quelle, Eindeutigkeit, Stufe passend zum `niveau` des Moduls und Sprache (D-18, D-25). Fehlerquote über 70 % → Frage neu erzeugen (PRODUCT.md).

## 5. Wiederholung

- Jede falsch beantwortete Frage landet im Wiederholungsstapel der Lernenden. Jede richtig beantwortete Anwenden-Frage ebenfalls, mit langem Intervall, damit Gelerntes präsent bleibt.
- Intervalle nach dem Leitner-Prinzip: Stufe 1 = 1 Tag, Stufe 2 = 3 Tage, Stufe 3 = 7 Tage, Stufe 4 = 14 Tage, danach raus. Richtig → eine Stufe hoch, falsch → zurück auf Stufe 1.
- Tagesziel: fällige Wiederholungen zuerst (höchstens 10), dann neue Einheiten.
- Daten je Lernendem in Supabase (AP-17, Tabelle `progress`) oder offline im sessionStorage: Fragen-ID, Stufe, Fälligkeit, Zeitstempel. Keine Freitexte, keine Personendaten in Prompts.
- Lern-Schleife (AP-12): Fragen, die oft im Stapel landen, erzeugen das Signal „zusätzliche Übungseinheit“.

## 6. Prüfungsmodus (Modus Prüfen)

Ein Prüfungssatz je Eintrag in `exam.gradedParts` der Map. Zeit und Gewichtung kommen aus der Verordnung, die Fragen aus den Modulen mit passendem `examAreas`:

| Map | Satz | Zeit | Zusammensetzung |
| --- | --- | --- | --- |
| MAF (alle 7 Maps) | PT Produktionstechnik | 120 Minuten | 30 Fragen aus Gebieten PT-a bis PT-f, nach Einheiten je Modul gewichtet |
| MAF | PP Produktionsplanung | 60 Minuten | 15 Fragen aus PP-a bis PP-e, mindestens 3 Rechenaufgaben |
| MAF | WiSo | 60 Minuten | 15 Fragen WISO-1 |
| MAF | Zwischenprüfung (§ 8) | 60 Minuten schriftlich | 15 Fragen aus Jahr 1 |
| Industriekaufleute | Teil 1 | 90 Minuten | 25 Fragen aus LF 1 bis 7 |
| Industriekaufleute | Teil 2 schriftlich | 150 Minuten | 40 Fragen aus LF 8 bis 13 |
| Industriekaufleute | WiSo | 60 Minuten | 15 Fragen |

Regel für die Fragenzahl: etwa 4 Minuten je Frage, aufgerundet auf volle 5 Fragen (`examQuestionCount()`). Prüfungssätze entstehen aus dem Fragenpool der Module mit passendem `examAreas`, gleichmäßig über die Gebiete verteilt (`buildExamSet()`).

Regeln:

1. **Formen wie in der realen Prüfung:** gebundene Aufgaben (Auswahl, Zuordnen, Reihenfolge) und offene Aufgaben (Rechnen, kurze Begründung). Offene Aufgaben zeigen nach Abgabe eine Musterlösung und eine Checkliste. Die Lernenden haken selbst ab. Keine KI-Bewertung.
2. **Zeit** läuft sichtbar, Pause ist erlaubt (Barrierefreiheit), Überschreitung gibt einen Hinweis, keine Strafe.
3. **Ergebnis je Gebiet** mit Ampel „Prüfungsreife“: 80 % und mehr grün, 60 bis 79 % gelb, unter 60 % rot (Annahme). Rote Gebiete schlagen die zugehörigen Einheiten zur Wiederholung vor.
4. **Mindestens 3 verschiedene Sätze** je Bereich. Fragen, die in den letzten 7 Tagen geübt wurden, sind ausgeschlossen.
5. **Nicht nachgebildet:** praktischer Teil MAF (§ 9 Abs. 2) und Fachaufgabe im Einsatzgebiet (Industriekaufleute Teil 2). Dafür gibt es Vorbereitungs-Einheiten in den Modulen PA, PP, EG und FA: Ablauf, Dokumentation, typische Fragen im Fachgespräch.

## 7. Bilder

Grundsatz: Ein Bild, wo es das Verstehen beschleunigt. Kein Bild als Schmuck. Jedes Bild hat einen Alt-Text (höchstens 125 Zeichen) und bei Schemata eine Textbeschreibung darunter. Die Information steht immer auch im Text.

Wo Bilder sinnvoll sind:

| Inhalt | Bildtyp | Erzeugung oder Quelle | Beispiele |
| --- | --- | --- | --- |
| Ablauf, Reihenfolge | Flussdiagramm | aus den Schritten der Einheit generiert (Mermaid → SVG) | Rüstvorgang, Prüfablauf, Beschaffungsprozess |
| Aufbau, Teile, Zusammenhang | beschriftetes Schema | SVG-Vorlage mit Beschriftungen; Wikimedia Commons (CC0, CC BY, Public Domain) | Aufbau einer Anlage, Pneumatik-Grundschaltung, Organigramm |
| Sicherheit | Sicherheitszeichen (ISO 7010) | Commons, Lizenz je Datei prüfen und speichern | Gebots-, Verbots-, Warnzeichen |
| Rechnen mit Geometrie | Skizze mit Maßen | SVG-Vorlage aus den Werten der Aufgabe | Volumen, Fläche, Übersetzung |
| Technische Zeichnung lesen (MAF LF1) | Ansichten, Schnitt, Bemaßung | SVG-Vorlage | Dreitafelprojektion, Schnittdarstellung |
| Kaufmännische Zusammenhänge | Diagramm, Tabelle, Kennzahl | aus den Zahlen der Einheit generiert (eigene SVG) | Kostenverlauf, Lagerkennzahlen, Break-even |
| Zuordnen, Teile benennen | Bild mit Markern 1 bis 5 | Schema plus Zuordnen-Frage | „Benenne die Teile der Anlage“ |

Keine Bilder bei Rechtsvorschriften, Definitionen und WiSo-Begriffen, also überall, wo der Inhalt reiner Text ist.

Regeln:

1. **Vorrang:** (a) selbst erzeugte SVG aus den Daten der Einheit (Flussdiagramm, Skizze, Diagramm), (b) freie Bilder mit gespeicherter Lizenz und Quelle (CC0, CC BY, Public Domain; CC BY-SA nur mit Namensnennung im Untertitel), (c) KI-Bilder nur als Illustration nach menschlicher Freigabe, nie für technische Fakten wie Bauteile, Zeichen oder Maße, weil Fehler darin schwer zu erkennen sind.
2. **Verboten:** Fotos von Personen, Firmenlogos, Screenshots oder Grafiken aus IHK-Material.
3. **Formate:** SVG bevorzugt (klein, skalierbar, Offline-Cache). PNG oder WebP höchstens 200 KB, in doppelter Auflösung für hochauflösende Displays.
4. **Jedes Bild wird wie eine Quelle gespeichert:** `image: { src, alt, longDescription?, kind, source: { url, license, attribution? }, generatedFrom? }`.
5. **Barrierefreiheit:** Kontrast der Linien mindestens 3:1, keine Information nur über Farbe, Beschriftungen als Text im SVG, Vorlesen liest Alt-Text und Beschreibung.
6. **Phasen:** Phase A (AP-15) nutzt nur generierte SVG (Ablauf, Rechnen, Diagramm), also ohne Lizenzrisiko und ohne Bildkosten. Commons-Bilder und KI-Bilder kommen in Phase B nach Freigabe. Die OpenAI-Dokumentation (Stand 2026-10-03) nennt für Bilderzeugung die Modelle `gpt-image-2.5-sunburst` und `gpt-image-2.5-flare`; Preis und Nutzen werden vor einem Einsatz in DECISIONS festgehalten.

Fertige Lösung für Flussdiagramme: [Mermaid](https://github.com/mermaid-js/mermaid) (MIT, 90 000 Sterne, aktiv) rendert Diagramme aus Text und liefert SVG. Läuft als Build-Schritt in Node, keine Laufzeit-Abhängigkeit in der App. Erfüllt die Regel „fertige Open-Source-Lösung vor Eigenbau“.

## 8. Schema-Erweiterung (Vorgabe für AP-14 und AP-15)

Umgesetzt in `src/lib/content/didaktik.ts` (Typen, Grenzwerte `LIMITS`, `validateUnit()`, Leitner `leitnerNext()`, `ampel()`, `writtenExamParts()`, `buildExamSet()`), getestet in `didaktik.test.ts`. Eine vollständige Beispiel-Einheit liegt in [`beispiele/maf-metall-pa-2.json`](beispiele/maf-metall-pa-2.json) (Block PA-2, Variante rechnen, 7 Fragen, Flussdiagramm) und ist die Vorlage für den Generate-Prompt. Die v1-Typen `GeneratedUnit` und `GeneratedQuestion` tragen die neuen Felder optional, damit bestehende Seeds weiter laufen; `validateUnit()` verlangt sie für neuen Inhalt.

```ts
type UnitSections = { einstieg: string; kern: string; beispiel: string; merksatz: string };

type UnitImage = {
  src: string;                       // SVG oder Bildpfad
  alt: string;                       // höchstens 125 Zeichen
  longDescription?: string;          // Pflicht bei Schemata
  kind: "flow" | "schema" | "sign" | "sketch" | "chart";
  source: { url: string; license: string; attribution?: string };
  generatedFrom?: string;            // z. B. Mermaid-Quelltext
};

type GeneratedUnit = {
  id: string; title: string; minutes: number;
  moduleId: string; blockId: string;             // aus der Map
  variant: "standard" | "ablauf" | "rechnen" | "sicherheit";
  sections: UnitSections;                        // ersetzt das einzelne Feld explanation
  explanationSimple?: string;                    // Fassung für den Schalter „Einfache Sprache“
  image?: UnitImage;
  questions: GeneratedQuestion[];
  sourceUrl: string; sourceFetchedAt: string;
  safetyFlag?: boolean;
};

type GeneratedQuestion = {
  id: string; type: QuestionType;
  level: "erinnern" | "verstehen" | "anwenden";
  prompt: string;
  choices?: string[]; pairs?: Array<[string, string]>; steps?: string[]; blanks?: string[];
  correct: string | string[];
  explanation: string; sourceUrl: string;
  image?: UnitImage;
  examAreas: string[];                           // aus dem Modul der Map
};

type ReviewItem = { questionId: string; stage: 1 | 2 | 3 | 4; dueAt: string };
type ExamSet = { id: string; mapId: string; partId: string; durationMinutes: number; questionIds: string[] };
```

`explanation` bleibt als Zusammenfassung der `sections` erhalten, damit alte Daten und die heutige Einheit-Seite weiter funktionieren.

## 9. Umsetzung und Aufwand

| Schritt | Inhalt | Aufwand |
| --- | --- | --- |
| 18a | Vorgabe freigeben, Schema erweitern, Tests. **Erledigt 2026-10-03** (`didaktik.ts`, Beispiel-Einheit, 11 Tests) | 1 bis 2 Tage |
| 18b | Einheit-Seite: 4 weitere Fragetypen und Bildfragen | 2 Tage |
| 18c | Figma und Code: Lernpfad gruppiert, Wiederholung, Prüfungsmodus, Ergebnis je Gebiet | 3 Tage |
| 18d | Bild-Pipeline: Mermaid als Build-Schritt, SVG-Vorlagen für Skizze und Diagramm, Lizenzfelder | 2 Tage |
| 18e | Prompt-Schablonen für die vier Varianten in AP-14 nachziehen | 1 Tag |

Reihenfolge: 18a vor dem Merge von AP-14 (PR #20 bindet noch an die v1-Map `maf-curriculum.json`). AP-15 Phase A erst nach 18a und 18e, sonst werden 280 Einheiten zweimal erzeugt.

## 10. Annahmen (siehe D-31)

- Stufenmix 2/3/2, Leitner-Intervalle 1/3/7/14 Tage, Ampel 80/60 %, 4 Minuten je Prüfungsfrage: Startwerte, die Lern-Schleife (AP-12) misst nach.
- Mermaid für Flussdiagramme, eigene SVG-Vorlagen für Skizzen und Diagramme, Commons-Bilder erst Phase B, KI-Bilder nur als Illustration.
- Offene Aufgaben nur mit Musterlösung und Selbstkontrolle, solange AGENTS.md die KI-Bewertung von Lernenden ausschließt.
