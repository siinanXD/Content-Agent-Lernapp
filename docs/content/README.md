# Curriculum-Maps (AP-13)

Eine Map pro Beruf und Variante. Die JSON ist der Vertrag für Plan- und Inhalts-Agent (AP-14). Die Markdown-Dateien werden daraus erzeugt:

```bash
node scripts/content-render-curriculum.mjs            # alle Maps
node scripts/content-render-curriculum.mjs maf-metall # eine Map
npm test                                               # Summen, Quellen, Gewichte, Phasen
```

Stand 2026-10-03 · Status aller Maps: **Entwurf, Freigabe durch Sinan offen** · Linear [SIN-191](https://linear.app/sinan-kahraman/issue/SIN-191) · Entscheidung D-26/D-27/D-28 in `docs/DECISIONS.md` · Rechtsstand geprüft am 2026-10-03 (siehe unten).

## Übersicht

| Map | Beruf / Variante | Jahre | Referenz-Rahmenlehrplan | Module | Einheiten |
| --- | --- | --- | --- | --- | --- |
| [`maf-metall`](MAF-METALL.md) | MAF, Schwerpunkt Metall- und Kunststofftechnik, Metallbetriebe (Pilot) | 2 | Industriemechaniker/in LF 1–9 (320 + 280 Std.) | 17 | 890 |
| [`maf-kunststoff`](MAF-KUNSTSTOFF.md) | MAF, Schwerpunkt Metall- und Kunststofftechnik, Kunststoffbetriebe | 2 | Kunststoff- und Kautschuktechnologe/-technologin LF 1–8 (320 + 280) | 16 | 890 |
| [`maf-textil`](MAF-TEXTIL.md) | MAF, Schwerpunkt Textiltechnik | 2 | Produktionsmechaniker-Textil LF 1–4, 5 PM–9 PM, 10 (280 + 280) | 18 | 850 |
| [`maf-textilveredelung`](MAF-TEXTILVEREDELUNG.md) | MAF, Schwerpunkt Textilveredelung | 2 | Produktveredler-Textil LF 1–8 (280 + 280) | 16 | 850 |
| [`maf-lebensmittel`](MAF-LEBENSMITTEL.md) | MAF, Schwerpunkt Lebensmitteltechnik | 2 | Fachkraft für Lebensmitteltechnik LF 1–9 (280 + 280) | 17 | 850 |
| [`maf-druckverarbeitung`](MAF-DRUCKVERARBEITUNG.md) | MAF, Schwerpunkt Druckweiter- und Papierverarbeitung, Druckweiterverarbeitung | 2 | Buchbinder/Medientechnologe Druckverarbeitung LF 1–8 (320 + 280) | 16 | 890 |
| [`maf-packmittel`](MAF-PACKMITTEL.md) | MAF, Schwerpunkt Druckweiter- und Papierverarbeitung, Packmittel | 2 | Packmitteltechnologe/-technologin LF 1–8 (280 + 280) | 16 | 850 |
| [`indkfl`](INDKFL.md) | Industriekaufmann/-frau, alle sieben Einsatzgebiete | 3 | Industriekaufleute 2023, LF 1–13 (320 + 280 + 280) | 20 | 1160 |

**MAF, alle Richtungen:** Die Ausbildungsordnung kennt fünf Schwerpunkte (§ 5). Der KMK-Rahmenlehrplan MAF hat keine eigenen Lernfelder und verweist je Schwerpunkt auf die ersten zwei Jahre der Fortsetzungsberufe. Wo ein Schwerpunkt zwei verschiedene Referenz-Rahmenlehrpläne hat (Metall/Kunststoff, Druck/Papier), gibt es zwei Maps mit identischer betrieblicher Achse und Prüfung. Jahr 1 der betrieblichen Achse (Anlage I) und die Module M0, ZP, QS, WISO sind in allen MAF-Maps gleich. Das Modul `SBP` (Standardberufsbildpositionen 2021: Umweltschutz und Nachhaltigkeit, digitalisierte Arbeitswelt) steht in allen MAF-Maps in Phase D: Für Berufe mit Verordnung vor 2021 gelten sie nur als Empfehlung (BIBB-Hauptausschuss 172), darum ein eigenes Modul mit Quellenart `empfehlung` statt einer Vermischung mit den Pflichtpositionen der Anlage. Für Industriekaufleute sind dieselben Inhalte Pflicht (Abschnitt B der Anlage) und stecken in den Modulen `DIG` und `WISO`.

**Industriekaufleute, alle Varianten:** Einsatzgebiete (§ 4 Abs. 4) sind keine Fachrichtungen. Lernfelder und schriftliche Prüfung sind für alle gleich; nur Berufsbildpositionen 8 und 9 und die Fachaufgabe in Teil 2 hängen am Einsatzgebiet. Darum eine Map mit einem Modul `EG`, das pro Einsatzgebiet einen Block hat.

## Aufbau einer Map

Wie eine Einheit innen aufgebaut ist (Erklärung, Fragestufen, Wiederholung, Prüfungsmodus, Bilder), steht in [`DIDAKTIK.md`](DIDAKTIK.md) (AP-18, D-31). Prompt-Schablonen der vier Varianten (`standard` / `ablauf` / `rechnen` / `sicherheit`) liegen in `src/lib/generate/didaktik-prompts.ts` (`buildDidaktikBlockPrompt`, `buildDidaktikKeywordPrompt`). Phase-A-Bilder: `npm run content:mermaid` → `public/generated/*.svg`.

1. **Modul** = Lernfeld (Schule), Kernbereich aus der Ausbildungsordnung (Betrieb), Querschnitt oder Prüfungstraining
2. **Block** = Themenblock mit Quellen-IDs (Ausbildungsordnung/Anlage und/oder Rahmenlehrplan)
3. **Einheit** = 5–10 Minuten: `sections` (einstieg/kern/beispiel/merksatz) + `explanation`-Fallback, 5–8 Fragen mit Stufe `erinnern`/`verstehen`/`anwenden`, optional generiertes SVG

Jedes Modul trägt Jahr, Niveau für den Richter, AO-Berufsbildpositionen, Prüfungsgebiete, Einheiten-Ziel, Fragetypen-Mix und ein Sicherheitsmerkmal (dann 10 % Stichprobe durch einen Menschen). Einheiten-Budget: 1 Einheit je Unterrichtsstunde des Rahmenlehrplans; übrige Module nach Gewicht in Anlage und Prüfungsordnung.

## So wird der Agent darauf eingestellt (Vorgabe für AP-14)

**Plan-Agent** (`src/lib/plan/plan-agent.ts`)

1. Lädt die Map über `loadCurriculum()` aus `src/lib/content/curriculum.ts` (Auswahl über `keyword` und Variante statt der Topic-Titel aus `maf-plan-seed.ts`).
2. Läuft die Module in `order` ab und streut Querschnitt-Einheiten (`kind: querschnitt`) ein, etwa jede fünfte Einheit.
3. Füllt Tage mit 2–3 Stunden aus Einheiten zu 5–10 Minuten; die Lernvariante bestimmt Tage, Stunden pro Tag und welche Phasen enthalten sind.
4. Jede Plan-Einheit trägt `moduleId`, `blockId`, `sourceKind` und `niveau`, damit Generate und Evaluate dieselbe Referenz nutzen.
5. Industriekaufleute: Modul `EG` nur mit Block `EG-0` plus dem Block des gewählten Einsatzgebiets.

**Inhalts-Agent** (`src/lib/generate/generate-agent.ts` + `didaktik-prompts.ts`)

1. Ein Batch-Request **pro Block**. Eingabe: Blocktitel, Themenliste, Quellen-URLs aus `blockSources()`, Jahr und Niveau, Fragetypen-Mix, Anzahl Einheiten, Didaktik-Variante.
2. Ausgabe: `GeneratedLernfeld` → `GeneratedUnit` (`sections`, `variant`, `image?`, `explanation` Fallback) → `GeneratedQuestion` (`level`, `examAreas`, optional `sampleSolution`).
3. Pflicht im Prompt: nur die genannten Quellen zitieren, `sourceFetchedAt` setzen, keine IHK-Aufgaben, keine Personendaten, einfache Sprache, keine KI-Bewertung offener Antworten.
4. Blöcke mit `rechnen` → Variante rechnen + Rechenweg; Blöcke mit `safety` → Variante sicherheit + `safetyFlag`.

Prompt-Gerüst: `buildDidaktikBlockPrompt(curriculum, module, block)` (vier Varianten). AP-14 (PR #20) bitte nach Merge auf diese Funktion umstellen statt des v1-`explanation`-only-Skeletts.

**Richter / Qualitäts-Schranke** (`src/lib/quality/*`)

- `niveau` wird gegen das Modul-Niveau geprüft, nicht gegen einen Kurs-Mittelwert.
- `safetyFlag` ist bei Blöcken mit Sicherheitsmerkmal vorbelegt; 10 % Stichprobe durch einen Menschen vor `publish`.
- Goldset-Lücke: Die 70 MAF-Items decken Verordnung und Prüfungsstruktur, kaum Fachinhalt. Für AP-15 mindestens 5 eigene Items pro Modul; für Industriekaufleute ein eigenes Goldset von etwa 20 geprüften Fragen. Entwurf mit 35 Fragen: `docs/quality/indkfl-goldset.json` (SIN-447), Prüfung durch Sinan offen.

## Erzeugungsphasen und Kosten

Jede Map hat vier Phasen (A–D), je ein Kurslauf unter dem 20-Euro-Deckel. Phase A reicht für einen spielbaren Pilot. Schätzung pro Phase mit 250–380 Einheiten (Preise D-06/D-07, Batch-Rabatt): 10–15 USD für Erzeugen und Prüfen; AP-15 misst nach.

## Aktualität und Rechtsstand (AP-16)

**Rechtsstand 2026, geprüft am 2026-10-03:** MaschFüAusbV (Stand Art. 2 V v. 14.6.2023), IndKflAusbV (12.03.2024, unverändert) und alle neun Referenz-Rahmenlehrpläne tragen im KMK-Downloadbereich dieselben Beschlussdaten wie in den Maps. Die 22 Neuordnungen zum 1.8.2026 (19 Bauberufe, Bautechnischer Konstrukteur, Kaufmann für Mobilität und Verkehrsservice, Verfahrensmechaniker Glastechnik) und die laufenden Verfahren (Technischer Modellbauer 1.8.2027, Veranstaltungskaufleute, Landwirt, Bäcker, Fachangestellte für Medien- und Informationsdienste) betreffen keine Map.

**So bleibt das aktuell:**

1. `docs/content/sources.lock.json` hält je Quell-URL einen Versionsmarker: die Stand-Zeile von gesetze-im-internet.de („Zuletzt geändert durch …“), das Beschlussdatum aus dem KMK-Downloadbereich oder ETag/Last-Modified/Hash.
2. `npm run content:check-sources` liest alle Quellen der Maps neu, vergleicht mit dem Lock, scannt den Aktualitätendienst von gesetze-im-internet.de und die BIBB-Seite „Neuordnungen“ nach 20 Berufsnamen und nennt je Treffer die betroffenen Module und Blöcke (`sourceIds`). Exit 0 = nichts neu, Exit 2 = Änderung oder Feed-Treffer, Exit 3 = eine Quelle fehlt im Lock.
3. Läuft wöchentlich als GitHub-Action (`.github/workflows/source-check.yml`, montags, auch per Hand startbar). Bei Exit 2 legt sie ein Issue mit Label `quellen-monitor` an oder ergänzt das offene; bei Exit 3 wird der Job rot. Später übernimmt der Hermes-Job auf Railway (`docs/ops/HERMES.md`) mit Telegram-Meldung. Im Cloud-Agent nur `npm run content:check-sources:offline`, weil der Proxy gesetze-im-internet.de und kmk.org sperrt.
4. Bei Exit 2: Änderung lesen, betroffene Map im Builder anpassen, Markdown neu rendern, Lock mit `--update` schreiben, PR. Danach die genannten Blöcke neu erzeugen und prüfen (research → plan → generate → evaluate → publish).

Der Lock ist am 2026-10-03 von Hand geseedet (Stand-Zeilen und KMK-Daten aus den Dokumenten); ETag und Hash füllt der erste Live-Lauf mit `--update`.

## Quellen

Alle Maps zitieren ausschließlich amtliche Quellen (gesetze-im-internet.de, kmk.org, bibb.de; für Produktionsmechaniker-Textil die wortgleiche Wiedergabe im Landeslehrplan NRW, weil die KMK-Datei nicht auffindbar war). Abruf 2026-10-03 über Exa-Web-Fetch, weil der Netzwerk-Proxy der Cloud-Agent-Umgebung die Domains sperrt.
