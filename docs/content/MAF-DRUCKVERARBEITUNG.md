# Curriculum-Map: Maschinen- und Anlagenführer/in – Schwerpunkt Druckweiter- und Papierverarbeitung (Referenz Medientechnologe Druckverarbeitung)

Stand: 2026-10-03 · Status: **Entwurf – Freigabe durch Sinan offen** · Familie: `maf` · Map-ID: `maf-druckverarbeitung` · Maschinenlesbar: [`maf-druckverarbeitung.json`](maf-druckverarbeitung.json) · Vorgaben für die Agenten: [README](README.md)

> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.

## 1. Beruf, Dauer, Variante

- **Beruf:** Maschinen- und Anlagenführer
- **Variante:** Schwerpunkt Druckweiter- und Papierverarbeitung, Referenz-RLP Buchbinder/Medientechnologe Druckverarbeitung (Lernfelder 1–8) – Druckweiterverarbeitung
- **Dauer:** 2 Jahre. § 2 MaschFüAusbV: Die Ausbildung dauert zwei Jahre. Ein drittes und viertes Jahr gibt es nur als Fortsetzung in einem anderen Beruf nach § 10. Das ist nicht Teil dieses Kurses.
- **Referenz-Rahmenlehrplan:** `rlp-mtdv`. Der KMK-RLP MAF nennt für diesen Schwerpunkt zwei Fortsetzungsberufe. Für Druckweiterverarbeitung ist die Referenz der gemeinsame RLP Buchbinder/Medientechnologe Druckverarbeitung (2011), Lernfelder 1–8 (320 + 280 Std.).
- **Alternativen:** Papier- und Packmittelbetriebe: Map maf-packmittel (Referenz Packmitteltechnologe)

## 2. Amtliche Quellen

| ID | Quelle | Art | Abruf |
| --- | --- | --- | --- |
| `ao` | [MaschFüAusbV – Verordnung über die Berufsausbildung zum Maschinen- und Anlagenführer (Volltext, Stand Art. 2 V v. 14.6.2023)](https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html) | ausbildungsordnung | 2026-10-03 |
| `ao-anlage` | [MaschFüAusbV Anlage (zu § 5) – Ausbildungsrahmenplan mit zeitlichen Richtwerten, Abschnitte I und II.A–E](https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html) | ausbildungsordnung | 2026-10-03 |
| `ao-p8` | [MaschFüAusbV § 8 Zwischenprüfung](https://www.gesetze-im-internet.de/maschf_ausbv/__8.html) | pruefung | 2026-10-03 |
| `ao-p9` | [MaschFüAusbV § 9 Abschlussprüfung (Prüfungsgebiete je Schwerpunkt, Abs. 3 Nr. 1–5)](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html) | pruefung | 2026-10-03 |
| `ao-bgbl` | [BGBl. I 2004 Nr. 19 (BIBB-Kopie der Verordnung inkl. Anlage)](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/regulation/maschinen_und_anlagenfuehrer.pdf) | ausbildungsordnung | 2026-10-03 |
| `rlp-maf` | [KMK Rahmenlehrplan Maschinen- und Anlagenführer/in (Beschluss 25.03.2004 i. d. F. 31.03.2023) – verweist je Schwerpunkt auf die RLP der Fortsetzungsberufe](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf) | rahmenlehrplan | 2026-10-03 |
| `kmk-wiso` | [KMK Kompetenzorientiertes Qualifikationsprofil Wirtschafts- und Sozialkunde gewerblich-technischer Ausbildungsberufe (Beschluss 17.06.2021, 40 Unterrichtsstunden)](https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2021/2021_06_17-Berufsschule-Unterricht-Wirtschafts-Sozialkunde.pdf) | rahmenlehrplan | 2026-10-03 |
| `bibb-ha172` | [BIBB Hauptausschuss-Empfehlung Nr. 172 vom 17.11.2020: Anwendung der modernisierten Standardberufsbildpositionen in der Ausbildungspraxis (Empfehlung für Berufe mit Verordnung vor 2021)](https://www.bibb.de/dokumente/pdf/HA172.pdf) | empfehlung | 2026-10-03 |
| `bibb-51121` | [BIBB Berufesuche – Maschinen- und Anlagenführer/in (51121)](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121) | berufsinformation | 2026-10-03 |
| `rlp-mtdv` | [KMK Rahmenlehrplan Buchbinder/in und Medientechnologe/-technologin Druckverarbeitung (Beschluss 25.03.2011) – Lernfelder 1–8 als Referenz](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/BuchbinderMedientechnDruckverarbeitung11-03-25-E_03.pdf) | rahmenlehrplan | 2026-10-03 |

Abruf: Exa web_fetch (Cloud-Agent-Egress zu gesetze-im-internet.de und kmk.org gesperrt); Verordnungstexte gegen BIBB-Kopie des BGBl. gegengelesen

## 3. Betrieblicher Zeitrahmen (Ausbildungsrahmenplan)

**Anlage I – Berufliche Grundbildung, 1. Ausbildungsjahr (alle Schwerpunkte)** (Quelle `ao-anlage`)

| Lfd. Nr. | Berufsbildposition | Wochen |
| --- | --- | --- |
| 1, 2, 3, 4 | 1 Berufsbildung, Arbeits- und Tarifrecht; 2 Aufbau und Organisation des Ausbildungsbetriebes; 3 Sicherheit und Gesundheitsschutz bei der Arbeit; 4 Umweltschutz | während der gesamten Ausbildung zu vermitteln |
| 5 | 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen | 4 |
| 6 | 6 Betriebliche und technische Kommunikation | 8 |
| 7 | 7 Planen und Vorbereiten von Arbeitsabläufen | 4 |
| 8 | 8 Prüfen | 6 |
| 9, 10, 11 | 9 Branchenspezifische Fertigungstechniken; 10 Steuerungs- und Regelungstechnik; 11 Einrichten und Bedienen von Produktionsanlagen | 22 |
| 12 | 12 Steuern des Materialflusses | 2 |
| 13 | 13 Warten und Inspizieren von Maschinen und Anlagen | 4 |
| 14 | 14 Durchführen von qualitätssichernden Maßnahmen | 2 |
| | **Summe** | **52** (erwartet 52) |

**Anlage II.E – Berufliche Fachbildung, 2. Ausbildungsjahr, Schwerpunkt Druckweiter- und Papierverarbeitung** (Quelle `ao-anlage`)

| Lfd. Nr. | Berufsbildposition | Wochen |
| --- | --- | --- |
| 1, 2 | 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; 7 Planen und Vorbereiten von Arbeitsabläufen | 8 |
| 3, 4 | 9 Branchenspezifische Fertigungstechniken; 10 Steuerungs- und Regelungstechnik | 16 |
| 5 | 11 Einrichten und Bedienen von Produktionsanlagen | 20 |
| 6 | 12 Steuern des Materialflusses | 2 |
| 7 | 13 Warten und Inspizieren von Maschinen und Anlagen | 4 |
| 8 | 14 Durchführen von qualitätssichernden Maßnahmen | 2 |
| | **Summe** | **52** (erwartet 52) |

Mehrere Nummern in einer Zeile teilen sich die Wochen (Klammer in der Anlage).

## 4. Schulische Lernfelder (Referenz-Rahmenlehrplan)

| LF | Titel | Jahr | Std. | Modul |
| --- | --- | --- | --- | --- |
| 1 | Betriebliche Strukturen und Arbeitsabläufe darstellen und vergleichen | 1 | 40 | `LF1` |
| 2 | Vorprodukte und ihre Daten beurteilen und nutzen | 1 | 80 | `LF2` |
| 3 | Werkstoffe unterscheiden und einsetzen | 1 | 80 | `LF3` |
| 4 | Verfahrenstechniken auftragsbezogen auswählen und anwenden | 1 | 120 | `LF4` |
| 5 | Bogen und Bahnen schneiden | 2 | 80 | `LF5` |
| 6 | Bogen falzen | 2 | 80 | `LF6` |
| 7 | Produkte fügen | 2 | 80 | `LF7` |
| 8 | Produktionsmittel instand halten | 2 | 40 | `LF8` |
| | **Summe je Jahr** | | **J1: 320 · J2: 280** | |

## 5. Prüfungen und Zuordnung der Gebiete

Zwischenprüfung zu Beginn des 2. Ausbildungsjahres (§ 8). Abschlussprüfung (§ 9): praktischer Teil (höchstens 7 Stunden, bis zu 2 Aufgaben) und schriftlicher Teil mit Produktionstechnik 50 %, Produktionsplanung 30 %, Wirtschafts- und Sozialkunde 20 %. Gebiete laut § 9 Abs. 3 für diesen Schwerpunkt.

| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlussprüfung | Praktischer Teil (§ 9 Abs. 2) | praktisch | höchstens 7 Stunden, bis zu 2 Aufgaben | – | PRAK-1: Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-2: Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-3: Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme | `LF5`, `LF6`, `PA`, `LF8` |
| Abschlussprüfung schriftlich | Produktionstechnik | schriftlich | 120 Minuten | 50 % | PT-a: Funktion von Maschinen und Anlagen; PT-b: Werkstoffe; PT-c: Werkzeuge; PT-d: Prüfverfahren und Prüfmittel; PT-e: Fertigungstechniken | `LF2`, `LF3`, `LF4`, `LF5`, `LF6`, `LF7`, `PA`, `LF8`, `APPT` |
| Abschlussprüfung schriftlich | Produktionsplanung | schriftlich | 60 Minuten | 30 % | PP-a: Arbeitsschritte; PP-b: Qualitätssicherung; PP-c: vorbeugende Instandhaltung; PP-d: Produktionsanlagen | `LF1`, `LF2`, `LF4`, `LF7`, `PA`, `LF8`, `QS`, `APPP` |
| Abschlussprüfung schriftlich | Wirtschafts- und Sozialkunde | schriftlich | 60 Minuten | 20 % | WISO-1: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO`, `SBP` |

**Zwischenprüfung (§ 8):** zu Beginn des 2. Ausbildungsjahres; praktische Aufgabe höchstens 3 Stunden plus höchstens 60 Minuten schriftlich; Beispiel: Positionieren von Maschinenelementen; Stoff des 1. Ausbildungsjahres → `ZP`

Bestehen: Praktischer und schriftlicher Teil jeweils mindestens ausreichend; in zwei schriftlichen Prüfungsbereichen mindestens ausreichend, im dritten nicht ungenügend (§ 9 Abs. 7). Mündliche Ergänzungsprüfung möglich, Gewichtung 2:1 (§ 9 Abs. 5).

## 6. Module im Überblick

16 Module, **890 Einheiten** (bei 7.5 Minuten im Schnitt ≈ 111.3 Stunden Lernzeit; 4450–7120 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt | 1 | querschnitt | 60 | ja | WISO-1 |
| 1 | `LF1` | Betriebliche Strukturen und Arbeitsabläufe darstellen und vergleichen | 1 | lernfeld | 40 | nein | PP-a |
| 2 | `LF2` | Vorprodukte und ihre Daten beurteilen und nutzen | 1 | lernfeld | 80 | nein | PP-a, PT-e |
| 3 | `LF3` | Werkstoffe unterscheiden und einsetzen | 1 | lernfeld | 80 | ja | PT-b, PT-d |
| 4 | `LF4` | Verfahrenstechniken auftragsbezogen auswählen und anwenden | 1 | lernfeld | 120 | ja | PT-e, PT-c, PT-d, PP-a |
| 5 | `ZP` | Zwischenprüfung: Training (§ 8) | 1 | pruefung | 20 | ja | ZP |
| 6 | `LF5` | Bogen und Bahnen schneiden | 2 | lernfeld | 80 | ja | PT-e, PT-c, PT-a, PRAK-1 |
| 7 | `LF6` | Bogen falzen | 2 | lernfeld | 80 | ja | PT-e, PT-a, PRAK-2 |
| 8 | `LF7` | Produkte fügen | 2 | lernfeld | 80 | nein | PT-e, PT-c, PT-d, PP-b |
| 9 | `PA` | Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern) | 2 | ao-kern | 60 | nein | PT-a, PP-a, PP-d, PRAK-1, PRAK-2 |
| 10 | `LF8` | Produktionsmittel instand halten | 2 | lernfeld | 40 | ja | PP-c, PT-a, PRAK-3 |
| 11 | `QS` | Qualitätssichernde Maßnahmen | 2 | ao-kern | 20 | nein | PP-b |
| 12 | `WISO` | Wirtschafts- und Sozialkunde | 2 | wiso | 40 | nein | WISO-1 |
| 13 | `SBP` | Standardberufsbildpositionen 2021: Nachhaltigkeit und digitalisierte Arbeitswelt (Empfehlung) | 1 | querschnitt | 20 | nein | WISO-1 |
| 14 | `APPT` | Abschlussprüfung: Training Produktionstechnik (§ 9) | 2 | pruefung | 40 | nein | PT-a, PT-b, PT-c, PT-d, PT-e |
| 15 | `APPP` | Abschlussprüfung: Training Produktionsplanung (§ 9) | 2 | pruefung | 30 | nein | PP-a, PP-b, PP-c, PP-d |
| | | **Summe** | | | **890** | | |

Reihenfolge = Lernreihenfolge. Querschnitt-Module werden über den Kurs gestreut (etwa jede fünfte Einheit).

## 7. Module und Blöcke im Detail

### M0 · Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt

- Jahr 1 · querschnitt · 60 Einheiten · Niveau: Grundbildung – wird über beide Jahre verteilt wiederholt
- AO-Berufsbild: Anlage I Nr. 1 → Berufsbildung, Arbeits- und Tarifrecht; Anlage I Nr. 2 → Aufbau und Organisation des Ausbildungsbetriebes; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → Umweltschutz
- Prüfungsgebiete: WISO-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5
- Hinweis: Laut Anlage während der gesamten Ausbildung zu vermitteln. Der Plan-Agent streut diese Einheiten über alle Lernfelder (etwa jede fünfte Einheit).

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `M0-1` | Ausbildung, Ausbildungsvertrag und Berufsbild | 15 | Ausbildungsvertrag: Abschluss, Dauer (2 Jahre, § 2), Beendigung; Rechte und Pflichten aus dem Ausbildungsvertrag; Berichtsheft als Ausbildungsnachweis (§ 7); Ausbildungsrahmenplan und betrieblicher Ausbildungsplan (§ 5, § 6); Die 14 Berufsbildpositionen (§ 4); Fünf Schwerpunkte (§ 5) und Fortsetzung der Ausbildung (§ 10); Berufliche Fortbildung; Arbeitsvertrag und Tarifvertrag: wesentliche Teile | `ao`, `ao-anlage`, `bibb-51121` |  |
| `M0-2` | Ausbildungsbetrieb: Aufbau, Grundfunktionen, Mitbestimmung | 10 | Aufbau und Aufgaben des Betriebes; Grundfunktionen: Beschaffung, Fertigung, Absatz, Verwaltung; Wirtschaftsorganisationen, Berufsvertretungen, Gewerkschaften; Betriebsrat, Jugend- und Auszubildendenvertretung | `ao-anlage` |  |
| `M0-3` | Sicherheit und Gesundheitsschutz bei der Arbeit | 20 | Gefährdungen am Arbeitsplatz erkennen, Gefährdungsbeurteilung, Betriebsanweisung; Persönliche Schutzausrüstung; Arbeitsschutz- und Unfallverhütungsvorschriften; Verhalten bei Unfällen, erste Maßnahmen; Vorbeugender Brandschutz, Verhalten bei Bränden; Schutzeinrichtungen, Not-Halt, Freischalten und gegen Wiedereinschalten sichern, Restenergie | `ao-anlage` | Sicherheit |
| `M0-4` | Umweltschutz in der Fertigung | 15 | Umweltbelastungen durch den Betrieb an Beispielen; Betriebliche Umweltschutz-Regelungen; Wirtschaftliche und umweltschonende Energie- und Materialverwendung; Abfälle vermeiden, Stoffe trennen und fachgerecht entsorgen | `ao-anlage` |  |

### LF1 · Betriebliche Strukturen und Arbeitsabläufe darstellen und vergleichen

- Jahr 1 · lernfeld · 40 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 1 (40 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage I Nr. 2 → Aufbau und Organisation des Ausbildungsbetriebes; Anlage I Nr. 6 → Betriebliche und technische Kommunikation
- Prüfungsgebiete: PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF1-1` | Aufbau- und Ablauforganisation | 12 | Aufbauorganisation; Ablauforganisation; Auftragsdurchlauf | `rlp-mtdv`, `ao-anlage` |  |
| `LF1-2` | Medienwirtschaft und Medienberufe | 10 | Branche; Berufe der Druckweiterverarbeitung | `rlp-mtdv` |  |
| `LF1-3` | Qualitäts-, Kosten- und Umweltbewusstsein | 10 | Qualität; Kosten; Umwelt | `rlp-mtdv`, `ao-anlage` |  |
| `LF1-4` | Fremdsprachliche Fachbegriffe, Präsentationstechniken | 8 | Englische Fachbegriffe; Präsentieren | `rlp-mtdv` |  |

### LF2 · Vorprodukte und ihre Daten beurteilen und nutzen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 2 (80 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage I Nr. 6 → Betriebliche und technische Kommunikation; Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen
- Prüfungsgebiete: PP-a, PT-e
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF2-1` | Konventionelle und elektronische Auftragstasche | 16 | Auftragstasche; Auftragsdaten lesen | `rlp-mtdv`, `ao-anlage` |  |
| `LF2-2` | Ausschießen und Falzmuster | 24 | Ausschießschema; Falzmuster; Seitenanordnung | `rlp-mtdv` |  |
| `LF2-3` | Formate, Hilfszeichen, Kontrollelemente | 20 | Hochformat, Querformat; Hilfszeichen; Kontrollelemente | `rlp-mtdv` |  |
| `LF2-4` | Informationsfluss und Kommunikationswege | 12 | Informationsfluss im Betrieb; Kommunikation mit Vorstufe und Druck | `rlp-mtdv`, `ao-anlage` |  |
| `LF2-5` | Berechnungen zu Nutzen und Seitenanordnung | 8 | Nutzen berechnen; Umfang und Bogen | `rlp-mtdv` | rechnen |

### LF3 · Werkstoffe unterscheiden und einsetzen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 3 (80 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 8 → Prüfen
- Prüfungsgebiete: PT-b, PT-d
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF3-1` | Papier, Karton, Pappe: Klassifizierung, Prüfverfahren | 20 | Klassifizierung; Prüfverfahren; Laufrichtung | `rlp-mtdv`, `ao-anlage` |  |
| `LF3-2` | Klebstoffe: Kohäsion, Adhäsion, rheologische und Abbindeeigenschaften | 16 | Kohäsion und Adhäsion; Rheologie; Abbinden | `rlp-mtdv` |  |
| `LF3-3` | Normetikett und Sicherheitsdatenblatt | 8 | Normetikett lesen; Sicherheitsdatenblatt anwenden | `rlp-mtdv`, `ao-anlage` | Sicherheit |
| `LF3-4` | Genormte Papierformate, Klimatisierung | 12 | DIN-Formate; Klimatisierung von Papier | `rlp-mtdv` |  |
| `LF3-5` | Nutzenberechnung, flächenbezogene Masse, Papiervolumen, Klebstoffverbrauch | 24 | Nutzenberechnung; Flächenbezogene Masse; Papiervolumen; Klebstoffverbrauch | `rlp-mtdv` | rechnen |

### LF4 · Verfahrenstechniken auftragsbezogen auswählen und anwenden

- Jahr 1 · lernfeld · 120 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 4 (120 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 8 → Prüfen
- Prüfungsgebiete: PT-e, PT-c, PT-d, PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF4-1` | Produkte: Akzidenzen, Broschuren, Papierband, Prospekt, Mailing | 16 | Produktarten; Anforderungen | `rlp-mtdv` |  |
| `LF4-2` | Schneiden, Falzen, Zusammentragen, Sammeln | 24 | Schneiden; Falzen; Zusammentragen und Sammeln | `rlp-mtdv`, `ao-anlage` |  |
| `LF4-3` | Heften, Kleben, Perforieren, Rillen | 24 | Heften; Kleben; Perforieren und Rillen | `rlp-mtdv`, `ao-anlage` |  |
| `LF4-4` | Konfektionieren und Personalisieren | 12 | Konfektionieren; Personalisieren | `rlp-mtdv` |  |
| `LF4-5` | Qualitätskontrolle am Kundenmuster | 16 | Muster prüfen; Abweichungen bewerten | `rlp-mtdv`, `ao-anlage` |  |
| `LF4-6` | Sicherheitskennzeichen und Betriebsanweisungen | 14 | Sicherheitskennzeichen; Betriebsanweisungen anwenden | `rlp-mtdv`, `ao-anlage` | Sicherheit |
| `LF4-7` | Gestaltung und Berechnungen: Goldener Schnitt, Lesbarkeit | 14 | Goldener Schnitt; Lesbarkeit; Materialbedarf | `rlp-mtdv` | rechnen |

### ZP · Zwischenprüfung: Training (§ 8)

- Jahr 1 · pruefung · 20 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau)
- AO-Berufsbild: Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → Umweltschutz; Anlage I Nr. 6 → Betriebliche und technische Kommunikation
- Prüfungsgebiete: ZP
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene Übungsaufgaben nach der Struktur von § 8. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `ZP-1` | Aufbau und Ablauf der Zwischenprüfung | 4 | Zeitpunkt: Beginn 2. Ausbildungsjahr; Praktische Aufgabe höchstens 3 Stunden, schriftlich höchstens 60 Minuten; Was nachzuweisen ist | `ao-p8` |  |
| `ZP-2` | Planungsaufgabe: Arbeitsschritte, Arbeitsmittel, Unterlagen | 6 | Arbeitsschritte planen; Arbeitsmittel auswählen; Technische Unterlagen nutzen | `ao-p8`, `ao-anlage` |  |
| `ZP-3` | Positionieren von Maschinenelementen | 6 | Vorgehen beim Positionieren und Ausrichten; Prüfen und dokumentieren; Sicherheit und Umweltschutz im Auftrag | `ao-p8` | Sicherheit |
| `ZP-4` | Gemischte Wiederholung Jahr 1 | 4 | Fragen quer über die Lernfelder des 1. Jahres und M0 | `ao-anlage` |  |

### LF5 · Bogen und Bahnen schneiden

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 5 (80 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage II.E Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.E Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.E Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PT-e, PT-c, PT-a, PRAK-1
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF5-1` | Material: Oberfläche, Volumen, Fasermaterial, Dicke | 14 | Oberflächeneigenschaften; Volumen und Dicke; Fasermaterial | `rlp-mtdv` |  |
| `LF5-2` | Schneidmarken, Anlage, Format, Standbogen | 14 | Schneidmarken; Anlage und Format; Standbogen | `rlp-mtdv` |  |
| `LF5-3` | Schnittfolge, Programmierung, Maschinenaufbau | 18 | Schnittfolge planen; Schneidemaschine programmieren; Maschinenaufbau | `rlp-mtdv`, `ao-anlage` |  |
| `LF5-4` | Pressdruck, Messeraufbau und -qualität | 12 | Pressdruck und -dauer; Messeraufbau; Messerqualität | `rlp-mtdv` |  |
| `LF5-5` | Schneidfehler erkennen | 8 | Fehlerbilder; Ursachen | `rlp-mtdv` |  |
| `LF5-6` | Nutzenberechnung | 8 | Nutzen aus Bogen und Bahn; Materialausnutzung | `rlp-mtdv` | rechnen |
| `LF5-7` | Sicheres Arbeiten an Schneidemaschinen | 6 | Schutzeinrichtungen; Sicheres Verhalten | `rlp-mtdv`, `ao-anlage` | Sicherheit |

### LF6 · Bogen falzen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 6 (80 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage II.E Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.E Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-e, PT-a, PRAK-2
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF6-1` | Maß- und Registerhaltigkeit, Rechtwinkligkeit | 10 | Maßhaltigkeit; Registerhaltigkeit; Rechtwinkligkeit | `rlp-mtdv` |  |
| `LF6-2` | Materialeinflüsse: Oberfläche, Dicke, Laufrichtung, Luftfeuchte, Aufladung | 12 | Laufrichtung; Luftfeuchtigkeit; Elektrostatische Aufladung | `rlp-mtdv` |  |
| `LF6-3` | Falzmuster, Falzarten, Falzwerkschema, Ausschießschema | 18 | Falzmuster und Falzarten; Falzwerkschema; Ausschießschema | `rlp-mtdv` |  |
| `LF6-4` | Falzsysteme und -techniken, Vor- und Nachfalz, Zusatzaggregate | 16 | Falzsysteme; Vorfalz, Nachfalz; Schneiden, Rillen, Perforieren, Siegeln, Kleben im Falzwerk | `rlp-mtdv`, `ao-anlage` |  |
| `LF6-5` | Falzfehler und Falzbogen absetzen | 8 | Falzfehler; Falzbogen absetzen | `rlp-mtdv` |  |
| `LF6-6` | Falzbogengröße, Einlauflänge, Bogenabstand, Laufgeschwindigkeit | 10 | Falzbogengröße; Einlauflänge und Bogenabstand; Maschinenlaufgeschwindigkeit | `rlp-mtdv` | rechnen |
| `LF6-7` | Gehörschutz und Arbeitsschutz an der Falzmaschine | 6 | Lärm; Schutzmaßnahmen | `rlp-mtdv`, `ao-anlage` | Sicherheit |

### LF7 · Produkte fügen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 7 (80 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage II.E Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.E Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.E Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PT-e, PT-c, PT-d, PP-b
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF7-1` | Sammel- und Zusammentragaggregate | 12 | Aggregate; Konfiguration | `rlp-mtdv` |  |
| `LF7-2` | Klebebinden | 16 | Verfahren; Klebstoffe; Rüsten | `rlp-mtdv`, `ao-anlage` |  |
| `LF7-3` | Fadensiegeln und Falzkleben | 12 | Fadensiegeln; Falzkleben | `rlp-mtdv` |  |
| `LF7-4` | Faden- und Drahtheften, Einzelblattbindungen | 16 | Fadenheften; Drahtheften; Einzelblattbindungen | `rlp-mtdv` |  |
| `LF7-5` | Heftdraht, Heftfaden, Kombinierbarkeit, Wechselwirkungen | 12 | Materialien; Kombinierbarkeit; Wechselwirkungen | `rlp-mtdv` |  |
| `LF7-6` | Kollationieren, Pulltest, Flextest | 12 | Kollationieren; Pulltest; Flextest | `rlp-mtdv` |  |

### PA · Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern)

- Jahr 2 · ao-kern · 60 Einheiten · Niveau: Fachbildung (Niveau praktische und schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 12 → Steuern des Materialflusses; Anlage II.E Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.E Nr. 6 → Steuern des Materialflusses
- Prüfungsgebiete: PT-a, PP-a, PP-d, PRAK-1, PRAK-2
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Berufskern laut Anlage II.E Nr. 5 und Nr. 6. Der Referenz-Rahmenlehrplan deckt das nicht 1:1 ab, darum eigenes Modul direkt aus der Ausbildungsordnung. Deckt auch die praktischen Prüfungsaufgaben nach § 9 Abs. 2.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `PA-1` | Papierverarbeitungsmaschinen und -anlagen nach Funktion und Einsatz unterscheiden | 6 | Maschinen der Druckweiter- und Papierverarbeitung; Funktion und Einsatzbereich zuordnen | `ao-anlage` |  |
| `PA-2` | Rüsten und Umrüsten nach Vorgaben, Peripheriegeräte vorbereiten | 8 | Rüsten und Umrüsten; Peripheriegeräte vorbereiten; Rüstzeit berechnen | `ao-anlage`, `ao-p9` | rechnen |
| `PA-3` | Bedruckstoffe auswählen, bereitstellen, zuführen; Maschinenparameter einstellen | 8 | Bedruckstoffe auftragsbezogen auswählen; Spezifische Maschinenparameter einstellen | `ao-anlage` |  |
| `PA-4` | Muster erstellen, Parameter korrigieren, Werkzeuge auswählen | 8 | Muster nach Vorgaben erstellen; Bei Abweichungen Parameter korrigieren; Werkzeuge nach Verfahren und Werkstoff auswählen | `ao-anlage` |  |
| `PA-5` | Produktion prozessbegleitend überwachen | 8 | Qualitätsstandards einhalten; Wirtschaftliche Aspekte berücksichtigen | `ao-anlage` |  |
| `PA-6` | Zwischenprodukte und Weiterverarbeitungsaggregate vorbereiten | 6 | Zwischenprodukte zur Weiterverarbeitung vorbereiten; Weiterverarbeitungsaggregate vorbereiten und einsetzen | `ao-anlage` |  |
| `PA-7` | Prozessdaten einstellen, optimieren, Produktionsdaten sichern | 6 | Prozessdaten einstellen und optimieren; Produktionsdaten sichern | `ao-anlage` |  |
| `PA-8` | Störungen und Abweichungen: erkennen, Ursachen, beseitigen | 4 | Störungen feststellen; Ursachen eingrenzen; Beseitigen oder veranlassen | `ao-anlage` |  |
| `PA-9` | Materialfluss und Übergabe | 6 | Materialfluss im Arbeitsbereich sicherstellen; Maschine übergeben, Produktionsstand dokumentieren | `ao-anlage`, `ao-p9` |  |

### LF8 · Produktionsmittel instand halten

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 8 (40 Std., `rlp-mtdv`)
- AO-Berufsbild: Anlage II.E Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.E Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PP-c, PT-a, PRAK-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF8-1` | Maschinenhandbücher, Wartungspläne, Pflegeanweisungen | 12 | Handbücher nutzen; Wartungspläne; Pflegeanweisungen | `rlp-mtdv`, `ao-anlage` |  |
| `LF8-2` | Gefahrenstellen, Sicherheitsregeln, Schutzeinrichtungen, Kennzeichnungen | 14 | Gefahrenstellen; Sicherheitsregeln; Schutzeinrichtungen und Kennzeichnungen | `rlp-mtdv`, `ao-anlage` | Sicherheit |
| `LF8-3` | Schmiertechnik, Reinigungs- und Konservierungstechniken | 14 | Schmiertechnik; Reinigung; Konservierung | `rlp-mtdv` |  |

### QS · Qualitätssichernde Maßnahmen

- Jahr 2 · ao-kern · 20 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 14 → Durchführen von qualitätssichernden Maßnahmen; Anlage II.E Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-b
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `QS-1` | Aufgaben und Ziele qualitätssichernder Maßnahmen | 6 | Qualitätsbegriff; Aufgaben und Ziele der Qualitätssicherung; Prüfen, Abweichung erkennen, Korrektur, Dokumentation | `ao-anlage` |  |
| `QS-2` | Ursachen von Qualitätsabweichungen, Korrekturmaßnahmen | 8 | Ursachen feststellen; Korrekturmaßnahmen einleiten; Qualitätsdaten dokumentieren | `ao-anlage`, `ao-p9` |  |
| `QS-3` | Kontinuierliche Verbesserung und kundenorientiertes Arbeiten | 6 | Zur Verbesserung von Arbeitsvorgängen beitragen; Kundenorientiert arbeiten | `ao-anlage` |  |

### WISO · Wirtschafts- und Sozialkunde

- Jahr 2 · wiso · 40 Einheiten · Niveau: Prüfungsbereich WiSo (20 %, 60 Minuten)
- AO-Berufsbild: Anlage I Nr. 1 → Berufsbildung, Arbeits- und Tarifrecht; Anlage I Nr. 2 → Aufbau und Organisation des Ausbildungsbetriebes
- Prüfungsgebiete: WISO-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5
- Hinweis: Inhalt nach dem KMK-Qualifikationsprofil 2021 (40 Unterrichtsstunden). Keine Personendaten in Beispielen.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `WISO-1` | Junge Menschen in Ausbildung und Beruf | 16 | Duales System: Beteiligte, Ausbildungsordnung, Rahmenlehrplan; Rechte und Pflichten aus Ausbildungs- und Arbeitsverhältnis (Jugendarbeitsschutz, Arbeitszeit, Urlaub, Kündigungsschutz); Tarifliche Auseinandersetzung und betriebliche Mitbestimmung; Wandel der Arbeitswelt, Digitalisierung, lebenslanges Lernen; Leben, Lernen und Arbeiten in Europa | `kmk-wiso`, `ao-anlage` |  |
| `WISO-2` | Nachhaltige Existenzsicherung | 12 | Säulen der sozialen Sicherung, Versicherungsprinzipien; Positionen der Entgeltabrechnung; Private Vorsorge; Karriere- und Lebensplanung, Existenzgründung | `kmk-wiso` |  |
| `WISO-3` | Unternehmen, Organisationen und private Marktteilnehmende | 12 | Ziele, Aufbau und Perspektiven von Unternehmen, Wertschöpfungskette, Wirtschaftskreislauf; Bedürfnisse, Bedarf, Kaufkraft; Rechtsgeschäfte: Kauf-, Miet-, Kreditvertrag, Verbraucherschutz; Soziale Marktwirtschaft, Europa, globale Vernetzung, Standortwettbewerb | `kmk-wiso` |  |

### SBP · Standardberufsbildpositionen 2021: Nachhaltigkeit und digitalisierte Arbeitswelt (Empfehlung)

- Jahr 1 · querschnitt · 20 Einheiten · Niveau: Grundbildung – Empfehlung BIBB-Hauptausschuss 172, nicht Teil der MaschFüAusbV 2004
- AO-Berufsbild: Anlage I Nr. 4 → Umweltschutz; Anlage I Nr. 1 → Berufsbildung, Arbeits- und Tarifrecht
- Prüfungsgebiete: WISO-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5
- Hinweis: Die MaschFüAusbV von 2004 enthält die vier modernisierten Standardberufsbildpositionen nicht. Der BIBB-Hauptausschuss empfiehlt seit 2020, sie trotzdem in allen Berufen zu vermitteln. Darum als eigenes Querschnittsmodul, im Lernpfad gestreut wie M0; in der Prüfung nur über WiSo relevant.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `SBP-1` | Umweltschutz und Nachhaltigkeit | 8 | Materialien und Energie unter wirtschaftlichen, umweltverträglichen und sozialen Gesichtspunkten nutzen; Vorschläge für nachhaltiges Handeln im eigenen Arbeitsbereich; Zielkonflikte zwischen ökonomisch, ökologisch, sozial | `bibb-ha172` |  |
| `SBP-2` | Digitalisierte Arbeitswelt | 12 | Datenschutz und Datensicherheit bei eigenen, betrieblichen und fremden Daten; Risiken digitaler Medien, betriebliche Regelungen; Informationen in digitalen Netzen recherchieren, prüfen, bewerten; Lern- und Arbeitstechniken, digitale Lernmedien, lebensbegleitendes Lernen; Zusammenarbeit über Bereichsgrenzen, Wertschätzung und Vielfalt | `bibb-ha172` |  |

### APPT · Abschlussprüfung: Training Produktionstechnik (§ 9)

- Jahr 2 · pruefung · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.E Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.E Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PT-a, PT-b, PT-c, PT-d, PT-e
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt E. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPT-1` | Fälle zu Funktion von Maschinen und Anlagen, Werkstoffe, Werkzeuge | 18 | Praxisbezogene Fälle: Funktion von Maschinen und Anlagen; Praxisbezogene Fälle: Werkstoffe; Praxisbezogene Fälle: Werkzeuge | `ao-p9` |  |
| `APPT-2` | Fälle zu Prüfverfahren und Prüfmittel, Fertigungstechniken | 18 | Praxisbezogene Fälle: Prüfverfahren und Prüfmittel; Praxisbezogene Fälle: Fertigungstechniken | `ao-p9` |  |
| `APPT-3` | Prüfungsformat und Zeitplanung | 4 | 120 Minuten, 50 Prozent Gewicht; Praxisbezogene Fälle lesen und strukturieren | `ao-p9` |  |

### APPP · Abschlussprüfung: Training Produktionsplanung (§ 9)

- Jahr 2 · pruefung · 30 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.E Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen; Anlage II.E Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.E Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.E Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-a, PP-b, PP-c, PP-d
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt E. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPP-1` | Fälle zu Arbeitsschritte, Qualitätssicherung | 12 | Praxisbezogene Fälle: Arbeitsschritte; Praxisbezogene Fälle: Qualitätssicherung | `ao-p9`, `ao-anlage` |  |
| `APPP-2` | Fälle zu vorbeugende Instandhaltung, Produktionsanlagen | 12 | Praxisbezogene Fälle: vorbeugende Instandhaltung; Praxisbezogene Fälle: Produktionsanlagen | `ao-p9`, `ao-anlage` |  |
| `APPP-3` | Prüfungsformat und Zeitplanung | 6 | 60 Minuten, 30 Prozent Gewicht; Planungsunterlagen und Protokolle lesen | `ao-p9` |  |

## 8. Erzeugungsphasen

Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md).

| Phase | Module | Einheiten | Warum |
| --- | --- | --- | --- |
| A | `M0`, `LF1`, `LF2`, `PA` | 240 | Betrieb, Vorprodukte, Produktionsanlagen. |
| B | `LF3`, `LF4`, `ZP`, `QS` | 240 | Werkstoffe, Verfahrenstechniken, Zwischenprüfungs-Training, Qualitätssicherung. |
| C | `LF5`, `LF6`, `LF7` | 240 | Schneiden, Falzen, Fügen. |
| D | `LF8`, `WISO`, `SBP`, `APPT`, `APPP` | 170 | Instandhalten, WiSo und beide schriftlichen Prüfungstrainings. |
| | **Summe** | **890** | |

## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)

1. Referenz-Rahmenlehrplan ist Buchbinder/Medientechnologe Druckverarbeitung; Packmittelbetriebe nutzen maf-packmittel.
2. Einheiten-Budget: 1 Einheit je Unterrichtsstunde des RLP; übrige Module wie maf-metall.
3. Anlage II.E: Nr. 1–2 zusammen 8 Wochen, Nr. 3–4 zusammen 16 Wochen, Nr. 5 20 Wochen.

