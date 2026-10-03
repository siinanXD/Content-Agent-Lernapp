# Curriculum-Maps (AP-13)

Eine Map pro Beruf und Variante. Die JSON ist der Vertrag für Plan- und Inhalts-Agent (AP-14). Die Markdown-Dateien werden daraus erzeugt:

```bash
node scripts/content-render-curriculum.mjs            # alle Maps
node scripts/content-render-curriculum.mjs maf-metall # eine Map
npm test                                               # Summen, Quellen, Gewichte, Phasen
```

Stand 2026-10-03 · Status aller Maps: **Entwurf, Freigabe durch Sinan offen** · Linear [SIN-191](https://linear.app/sinan-kahraman/issue/SIN-191) · Entscheidung D-26/D-27 in `docs/DECISIONS.md`.

## Übersicht

| Map | Beruf / Variante | Jahre | Referenz-Rahmenlehrplan | Module | Einheiten |
| --- | --- | --- | --- | --- | --- |
| [`maf-metall`](MAF-METALL.md) | MAF, Schwerpunkt Metall- und Kunststofftechnik, Metallbetriebe (Pilot) | 2 | Industriemechaniker/in LF 1–9 (320 + 280 Std.) | 16 | 870 |
| [`maf-kunststoff`](MAF-KUNSTSTOFF.md) | MAF, Schwerpunkt Metall- und Kunststofftechnik, Kunststoffbetriebe | 2 | Kunststoff- und Kautschuktechnologe/-technologin LF 1–8 (320 + 280) | 15 | 870 |
| [`maf-textil`](MAF-TEXTIL.md) | MAF, Schwerpunkt Textiltechnik | 2 | Produktionsmechaniker-Textil LF 1–4, 5 PM–9 PM, 10 (280 + 280) | 17 | 830 |
| [`maf-textilveredelung`](MAF-TEXTILVEREDELUNG.md) | MAF, Schwerpunkt Textilveredelung | 2 | Produktveredler-Textil LF 1–8 (280 + 280) | 15 | 830 |
| [`maf-lebensmittel`](MAF-LEBENSMITTEL.md) | MAF, Schwerpunkt Lebensmitteltechnik | 2 | Fachkraft für Lebensmitteltechnik LF 1–9 (280 + 280) | 16 | 830 |
| [`maf-druckverarbeitung`](MAF-DRUCKVERARBEITUNG.md) | MAF, Schwerpunkt Druckweiter- und Papierverarbeitung, Druckweiterverarbeitung | 2 | Buchbinder/Medientechnologe Druckverarbeitung LF 1–8 (320 + 280) | 15 | 870 |
| [`maf-packmittel`](MAF-PACKMITTEL.md) | MAF, Schwerpunkt Druckweiter- und Papierverarbeitung, Packmittel | 2 | Packmitteltechnologe/-technologin LF 1–8 (280 + 280) | 15 | 830 |
| [`indkfl`](INDKFL.md) | Industriekaufmann/-frau, alle sieben Einsatzgebiete | 3 | Industriekaufleute 2023, LF 1–13 (320 + 280 + 280) | 20 | 1160 |

**MAF, alle Richtungen:** Die Ausbildungsordnung kennt fünf Schwerpunkte (§ 5). Der KMK-Rahmenlehrplan MAF hat keine eigenen Lernfelder und verweist je Schwerpunkt auf die ersten zwei Jahre der Fortsetzungsberufe. Wo ein Schwerpunkt zwei verschiedene Referenz-Rahmenlehrpläne hat (Metall/Kunststoff, Druck/Papier), gibt es zwei Maps mit identischer betrieblicher Achse und Prüfung. Jahr 1 der betrieblichen Achse (Anlage I) und die Module M0, ZP, QS, WISO sind in allen MAF-Maps gleich.

**Industriekaufleute, alle Varianten:** Einsatzgebiete (§ 4 Abs. 4) sind keine Fachrichtungen. Lernfelder und schriftliche Prüfung sind für alle gleich; nur Berufsbildpositionen 8 und 9 und die Fachaufgabe in Teil 2 hängen am Einsatzgebiet. Darum eine Map mit einem Modul `EG`, das pro Einsatzgebiet einen Block hat.

## Aufbau einer Map

1. **Modul** = Lernfeld (Schule), Kernbereich aus der Ausbildungsordnung (Betrieb), Querschnitt oder Prüfungstraining
2. **Block** = Themenblock mit Quellen-IDs (Ausbildungsordnung/Anlage und/oder Rahmenlehrplan)
3. **Einheit** = 5–10 Minuten: kurze Erklärung, 5–8 Fragen (Auswahl, Zuordnen, Lückentext, Reihenfolge, Rechnen), jede Antwort mit Erklärung und Quelle

Jedes Modul trägt Jahr, Niveau für den Richter, AO-Berufsbildpositionen, Prüfungsgebiete, Einheiten-Ziel, Fragetypen-Mix und ein Sicherheitsmerkmal (dann 10 % Stichprobe durch einen Menschen). Einheiten-Budget: 1 Einheit je Unterrichtsstunde des Rahmenlehrplans; übrige Module nach Gewicht in Anlage und Prüfungsordnung.

## So wird der Agent darauf eingestellt (Vorgabe für AP-14)

**Plan-Agent** (`src/lib/plan/plan-agent.ts`)

1. Lädt die Map über `loadCurriculum()` aus `src/lib/content/curriculum.ts` (Auswahl über `keyword` und Variante statt der Topic-Titel aus `maf-plan-seed.ts`).
2. Läuft die Module in `order` ab und streut Querschnitt-Einheiten (`kind: querschnitt`) ein, etwa jede fünfte Einheit.
3. Füllt Tage mit 2–3 Stunden aus Einheiten zu 5–10 Minuten; die Lernvariante bestimmt Tage, Stunden pro Tag und welche Phasen enthalten sind.
4. Jede Plan-Einheit trägt `moduleId`, `blockId`, `sourceKind` und `niveau`, damit Generate und Evaluate dieselbe Referenz nutzen.
5. Industriekaufleute: Modul `EG` nur mit Block `EG-0` plus dem Block des gewählten Einsatzgebiets.

**Inhalts-Agent** (`src/lib/generate/generate-agent.ts`)

1. Ein Batch-Request **pro Block**. Eingabe: Blocktitel, Themenliste, Quellen-URLs aus `blockSources()`, Jahr und Niveau, Fragetypen-Mix, Anzahl Einheiten.
2. Ausgabe im bestehenden Schema (`GeneratedLernfeld` → `GeneratedUnit` → `GeneratedQuestion`) plus `moduleId` und `blockId`.
3. Pflicht im Prompt: nur die genannten Quellen zitieren, `sourceFetchedAt` setzen, keine IHK-Aufgaben, keine Personendaten, einfache Sprache.
4. Blöcke mit `rechnen` liefern Rechenfragen mit Rechenweg; Blöcke mit `safety` setzen `safetyFlag`.

Prompt-Gerüst für einen Block:

```text
Erzeuge {units} Lerneinheiten (je 5–10 Minuten) für den Block "{block.title}" im Modul "{module.title}"
der Ausbildung {keyword}, {variantLabel}, Ausbildungsjahr {year}. Niveau: {niveau}.
Themen, die abgedeckt werden müssen: {topics}.
Erlaubte Quellen (nur diese zitieren, URL in sourceUrl, Abrufdatum {fetchedAt} in sourceFetchedAt): {sourceUrls}.
Je Einheit: kurze Erklärung in einfacher Sprache, dann 5–8 Fragen. Fragetypen-Mix in Prozent: {questionMix}.
Jede Frage hat genau eine richtige Antwort, eine Erklärung mit Bezug zur Quelle und sourceUrl.
Verboten: IHK-Prüfungsaufgaben oder deren Umformulierung, Personendaten, Inhalte ohne Quelle.
Antworte nur mit JSON nach Schema: { ... }
```

**Richter / Qualitäts-Schranke** (`src/lib/quality/*`)

- `niveau` wird gegen das Modul-Niveau geprüft, nicht gegen einen Kurs-Mittelwert.
- `safetyFlag` ist bei Blöcken mit Sicherheitsmerkmal vorbelegt; 10 % Stichprobe durch einen Menschen vor `publish`.
- Goldset-Lücke: Die 70 MAF-Items decken Verordnung und Prüfungsstruktur, kaum Fachinhalt. Für AP-15 mindestens 5 eigene Items pro Modul; für Industriekaufleute ein eigenes Goldset von etwa 20 geprüften Fragen.

## Erzeugungsphasen und Kosten

Jede Map hat vier Phasen (A–D), je ein Kurslauf unter dem 20-Euro-Deckel. Phase A reicht für einen spielbaren Pilot. Schätzung pro Phase mit 250–380 Einheiten (Preise D-06/D-07, Batch-Rabatt): 10–15 USD für Erzeugen und Prüfen; AP-15 misst nach.

## Quellen

Alle Maps zitieren ausschließlich amtliche Quellen (gesetze-im-internet.de, kmk.org, bibb.de; für Produktionsmechaniker-Textil die wortgleiche Wiedergabe im Landeslehrplan NRW, weil die KMK-Datei nicht auffindbar war). Abruf 2026-10-03 über Exa-Web-Fetch, weil der Netzwerk-Proxy der Cloud-Agent-Umgebung die Domains sperrt.
