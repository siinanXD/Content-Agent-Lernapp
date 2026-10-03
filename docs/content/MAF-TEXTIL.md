# Curriculum-Map: Maschinen- und Anlagenführer/in – Schwerpunkt Textiltechnik (Referenz Produktionsmechaniker-Textil)

Stand: 2026-10-03 · Status: **Entwurf – Freigabe durch Sinan offen** · Familie: `maf` · Map-ID: `maf-textil` · Maschinenlesbar: [`maf-textil.json`](maf-textil.json) · Vorgaben für die Agenten: [README](README.md)

> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.

## 1. Beruf, Dauer, Variante

- **Beruf:** Maschinen- und Anlagenführer
- **Variante:** Schwerpunkt Textiltechnik, Referenz-RLP Produktionsmechaniker-Textil (Lernfelder 1–4, 5 PM–9 PM, 10)
- **Dauer:** 2 Jahre. § 2 MaschFüAusbV: Die Ausbildung dauert zwei Jahre. Ein drittes und viertes Jahr gibt es nur als Fortsetzung in einem anderen Beruf nach § 10. Das ist nicht Teil dieses Kurses.
- **Referenz-Rahmenlehrplan:** `rlp-pmtextil`. Der KMK-RLP MAF verweist für den Schwerpunkt Textiltechnik auf den RLP Produktionsmechaniker-Textil (2005 i. d. F. 2007). Dessen Jahre 1–2 (gemeinsame LF 1–4 und 10 plus PM-Lernfelder 5–9) bilden die schulische Achse: 280 + 280 Std.

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
| `rlp-pmtextil` | [KMK Rahmenlehrplan Produktionsmechaniker-Textil / Produktprüfer-Textil (Beschluss 18.03.2005 i. d. F. 15.03.2007), Lernfelder 1–10 PM – Wiedergabe im Landeslehrplan NRW (QUA-LiS)](https://berufsbildung.nrw.de/system/files/media/document/file/produktionsmechanik_textil.pdf) | rahmenlehrplan | 2026-10-03 |

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

**Anlage II.B – Berufliche Fachbildung, 2. Ausbildungsjahr, Schwerpunkt Textiltechnik** (Quelle `ao-anlage`)

| Lfd. Nr. | Berufsbildposition | Wochen |
| --- | --- | --- |
| 1, 2 | 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; 7 Planen und Vorbereiten von Arbeitsabläufen | 10 |
| 3, 4 | 9 Branchenspezifische Fertigungstechniken; 10 Steuerungs- und Regelungstechnik | 16 |
| 5 | 11 Einrichten und Bedienen von Produktionsanlagen | 18 |
| 6 | 12 Steuern des Materialflusses | 2 |
| 7 | 13 Warten und Inspizieren von Maschinen und Anlagen | 4 |
| 8 | 14 Durchführen von qualitätssichernden Maßnahmen | 2 |
| | **Summe** | **52** (erwartet 52) |

Mehrere Nummern in einer Zeile teilen sich die Wochen (Klammer in der Anlage).

## 4. Schulische Lernfelder (Referenz-Rahmenlehrplan)

| LF | Titel | Jahr | Std. | Modul |
| --- | --- | --- | --- | --- |
| 1 | Produktionsprozesse auf textile Produkte abstimmen | 1 | 40 | `LF1` |
| 2 | Textile Faserstoffe einsetzen | 1 | 80 | `LF2` |
| 3 | Herstellen von linienförmigen textilen Gebilden | 1 | 40 | `LF3` |
| 4 | Herstellen und Bearbeiten textiler Flächen | 1 | 80 | `LF4` |
| 5 PM | Produktionsprozesse überwachen | 1 | 40 | `LF5` |
| 6 PM | Textile Produkte nachstellen | 2 | 80 | `LF6` |
| 7 PM | Textile Materialien in Vorbereitungsprozessen einsetzen | 2 | 40 | `LF7` |
| 8 PM | Werkstoffe für Maschinenelemente bearbeiten | 2 | 60 | `LF8` |
| 9 PM | Maschinen und Anlagen warten | 2 | 60 | `LF9` |
| 10 | Textilien kundengerecht veredeln und aufmachen | 2 | 40 | `LF10` |
| | **Summe je Jahr** | | **J1: 280 · J2: 280** | |

## 5. Prüfungen und Zuordnung der Gebiete

Zwischenprüfung zu Beginn des 2. Ausbildungsjahres (§ 8). Abschlussprüfung (§ 9): praktischer Teil (höchstens 7 Stunden, bis zu 2 Aufgaben) und schriftlicher Teil mit Produktionstechnik 50 %, Produktionsplanung 30 %, Wirtschafts- und Sozialkunde 20 %. Gebiete laut § 9 Abs. 3 für diesen Schwerpunkt.

| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlussprüfung | Praktischer Teil (§ 9 Abs. 2) | praktisch | höchstens 7 Stunden, bis zu 2 Aufgaben | – | PRAK-1: Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-2: Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-3: Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme | `PA`, `LF9` |
| Abschlussprüfung schriftlich | Produktionstechnik | schriftlich | 120 Minuten | 50 % | PT-a: Rohstoffe, Zwischen- und Endprodukte; PT-b: Produktionsverfahren, Prozessabläufe; PT-c: Funktion von Maschinen und Anlagen; PT-d: prozess- und leistungsbezogene Berechnungen; PT-e: Konstruktionstechniken und Produktmerkmale; PT-f: Fertigungstechniken | `LF1`, `LF2`, `LF3`, `LF4`, `LF5`, `LF6`, `LF7`, `PA`, `LF9`, `LF10`, `APPT` |
| Abschlussprüfung schriftlich | Produktionsplanung | schriftlich | 60 Minuten | 30 % | PP-a: Arbeitsschritte; PP-b: Qualitätssicherung; PP-c: vorbeugende Instandhaltung; PP-d: Materialfluss; PP-e: Anfertigen von Skizzen und Planungsunterlagen | `LF1`, `LF5`, `LF6`, `LF7`, `LF8`, `PA`, `LF9`, `LF10`, `QS`, `APPP` |
| Abschlussprüfung schriftlich | Wirtschafts- und Sozialkunde | schriftlich | 60 Minuten | 20 % | WISO-1: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO`, `SBP` |

**Zwischenprüfung (§ 8):** zu Beginn des 2. Ausbildungsjahres; praktische Aufgabe höchstens 3 Stunden plus höchstens 60 Minuten schriftlich; Beispiel: Positionieren von Maschinenelementen; Stoff des 1. Ausbildungsjahres → `ZP`

Bestehen: Praktischer und schriftlicher Teil jeweils mindestens ausreichend; in zwei schriftlichen Prüfungsbereichen mindestens ausreichend, im dritten nicht ungenügend (§ 9 Abs. 7). Mündliche Ergänzungsprüfung möglich, Gewichtung 2:1 (§ 9 Abs. 5).

## 6. Module im Überblick

18 Module, **850 Einheiten** (bei 7.5 Minuten im Schnitt ≈ 106.3 Stunden Lernzeit; 4250–6800 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt | 1 | querschnitt | 60 | ja | WISO-1 |
| 1 | `LF1` | Produktionsprozesse auf textile Produkte abstimmen | 1 | lernfeld | 40 | nein | PT-b, PP-a |
| 2 | `LF2` | Textile Faserstoffe einsetzen | 1 | lernfeld | 80 | nein | PT-a, PT-d |
| 3 | `LF3` | Herstellen von linienförmigen textilen Gebilden | 1 | lernfeld | 40 | nein | PT-b, PT-f, PT-d |
| 4 | `LF4` | Herstellen und Bearbeiten textiler Flächen | 1 | lernfeld | 80 | ja | PT-e, PT-f, PT-d |
| 5 | `LF5` | Produktionsprozesse überwachen | 1 | lernfeld | 40 | ja | PT-c, PP-c |
| 6 | `ZP` | Zwischenprüfung: Training (§ 8) | 1 | pruefung | 20 | ja | ZP |
| 7 | `LF6` | Textile Produkte nachstellen | 2 | lernfeld | 80 | nein | PT-e, PP-e, PT-a |
| 8 | `LF7` | Textile Materialien in Vorbereitungsprozessen einsetzen | 2 | lernfeld | 40 | nein | PT-b, PP-d |
| 9 | `LF8` | Werkstoffe für Maschinenelemente bearbeiten | 2 | lernfeld | 60 | ja | PP-c, PP-e |
| 10 | `PA` | Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern) | 2 | ao-kern | 60 | ja | PT-c, PP-a, PP-d, PRAK-1, PRAK-2 |
| 11 | `LF9` | Maschinen und Anlagen warten | 2 | lernfeld | 60 | ja | PP-c, PT-c, PRAK-3 |
| 12 | `LF10` | Textilien kundengerecht veredeln und aufmachen | 2 | lernfeld | 40 | nein | PT-a, PP-b |
| 13 | `QS` | Qualitätssichernde Maßnahmen | 2 | ao-kern | 20 | nein | PP-b |
| 14 | `WISO` | Wirtschafts- und Sozialkunde | 2 | wiso | 40 | nein | WISO-1 |
| 15 | `SBP` | Standardberufsbildpositionen 2021: Nachhaltigkeit und digitalisierte Arbeitswelt (Empfehlung) | 1 | querschnitt | 20 | nein | WISO-1 |
| 16 | `APPT` | Abschlussprüfung: Training Produktionstechnik (§ 9) | 2 | pruefung | 40 | nein | PT-a, PT-b, PT-c, PT-d, PT-e, PT-f |
| 17 | `APPP` | Abschlussprüfung: Training Produktionsplanung (§ 9) | 2 | pruefung | 30 | nein | PP-a, PP-b, PP-c, PP-d, PP-e |
| | | **Summe** | | | **850** | | |

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

### LF1 · Produktionsprozesse auf textile Produkte abstimmen

- Jahr 1 · lernfeld · 40 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 1 (40 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 6 → Betriebliche und technische Kommunikation
- Prüfungsgebiete: PT-b, PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF1-1` | Textile Produkte: Garne, Zwirne, Flächen, Verbundstoffe | 12 | Garne und Zwirne; Textile Flächen; Verbundstoffe | `rlp-pmtextil` |  |
| `LF1-2` | Produktionsmaschinen und -anlagen im Überblick | 12 | Maschinen der Garnherstellung; Maschinen der Flächenherstellung; Prozessstufen | `rlp-pmtextil`, `ao-anlage` |  |
| `LF1-3` | Informationsquellen, interner Kunde, Prozessverantwortung | 10 | Informationsquellen nutzen; Interner Kunde; Verantwortung für den Produktionsprozess | `rlp-pmtextil`, `ao-anlage` |  |
| `LF1-4` | Prozess auf Produkt abstimmen: Fallbeispiele | 6 | Produktanforderung lesen; Passenden Prozess wählen | `rlp-pmtextil` |  |

### LF2 · Textile Faserstoffe einsetzen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 2 (80 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 8 → Prüfen
- Prüfungsgebiete: PT-a, PT-d
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF2-1` | Faserstoffe: Aufbau, Eigenschaften, Einsatzgebiete | 24 | Aufbau der Faserstoffe; Eigenschaften; Einsatzgebiete | `rlp-pmtextil`, `ao-anlage` |  |
| `LF2-2` | Natur- und Chemiefasern unterscheiden | 16 | Naturfasern; Chemiefasern; Kennzeichnung | `rlp-pmtextil` |  |
| `LF2-3` | Feinheitsbe- und -umrechnungen | 16 | Feinheitsbezeichnungen; Umrechnen zwischen Systemen | `rlp-pmtextil` | rechnen |
| `LF2-4` | Prüfvorschriften und Faserprüfung | 14 | Prüfvorschriften; Faserprüfung durchführen; Ergebnis dokumentieren | `rlp-pmtextil`, `ao-anlage` |  |
| `LF2-5` | Ökologische Aspekte | 10 | Ressourcen; Entsorgung und Recycling | `rlp-pmtextil`, `ao-anlage` |  |

### LF3 · Herstellen von linienförmigen textilen Gebilden

- Jahr 1 · lernfeld · 40 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 3 (40 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 8 → Prüfen
- Prüfungsgebiete: PT-b, PT-f, PT-d
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF3-1` | Garne und Zwirne herstellen | 14 | Spinnen; Zwirnen; Prozessstufen | `rlp-pmtextil`, `ao-anlage` |  |
| `LF3-2` | Maschinen und Anlagen der Garnherstellung | 10 | Maschinenaufbau; Einsatz | `rlp-pmtextil` |  |
| `LF3-3` | Qualitätsdaten | 8 | Qualitätsmerkmale von Garnen; Dokumentation | `rlp-pmtextil` |  |
| `LF3-4` | Berechnungen zur Garnherstellung | 8 | Produktionsmengen; Drehungen, Feinheit | `rlp-pmtextil` | rechnen |

### LF4 · Herstellen und Bearbeiten textiler Flächen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 4 (80 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 6 → Betriebliche und technische Kommunikation; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit
- Prüfungsgebiete: PT-e, PT-f, PT-d
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF4-1` | Gewebe, Maschenwaren, Vliesstoffe | 20 | Gewebe; Maschenwaren; Vliesstoffe | `rlp-pmtextil`, `ao-anlage` |  |
| `LF4-2` | Bindungen, Rapporte, Musteranalyse | 18 | Grundbindungen; Rapporte; Musteranalyse | `rlp-pmtextil` |  |
| `LF4-3` | Zeichnungen und Normen | 12 | Bindungspatronen zeichnen; Normen | `rlp-pmtextil` |  |
| `LF4-4` | Bearbeiten textiler Flächen, z. B. Besticken | 10 | Besticken; Weitere Bearbeitungen | `rlp-pmtextil` |  |
| `LF4-5` | Berechnungen zur Flächenherstellung | 12 | Fadendichte; Flächenmasse; Produktionsleistung | `rlp-pmtextil` | rechnen |
| `LF4-6` | Arbeits- und Umweltschutz an Flächenmaschinen | 8 | Gefährdungen an Web- und Strickmaschinen; Schutzeinrichtungen | `rlp-pmtextil`, `ao-anlage` | Sicherheit |

### LF5 · Produktionsprozesse überwachen

- Jahr 1 · lernfeld · 40 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 5 PM (40 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage I Nr. 10 → Steuerungs- und Regelungstechnik; Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-c, PP-c
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF5-1` | Elektronische Überwachungseinrichtungen | 10 | Sensoren und Überwachung; Anzeigen lesen | `rlp-pmtextil` |  |
| `LF5-2` | Steuern und Regeln | 10 | Steuern und Regeln unterscheiden; Regelkreis | `rlp-pmtextil`, `ao-anlage` |  |
| `LF5-3` | Störungen: Ursachen und Beheben | 10 | Störungsursachen; Störungen beheben | `rlp-pmtextil` |  |
| `LF5-4` | Schaltpläne, Sicherheitsvorschriften | 10 | Schaltpläne lesen; Sicherheitsvorschriften | `rlp-pmtextil`, `ao-anlage` | Sicherheit |

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

### LF6 · Textile Produkte nachstellen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 6 PM (80 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage II.B Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage II.B Nr. 3 → Branchenspezifische Fertigungstechniken
- Prüfungsgebiete: PT-e, PP-e, PT-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF6-1` | Produktanalyse | 24 | Mustervorlage analysieren; Konstruktionstechnik bestimmen; Produktmerkmale | `rlp-pmtextil`, `ao-anlage` |  |
| `LF6-2` | Zeichnerische Darstellung | 16 | Faden- und Flächenkonstruktion normgerecht darstellen; Bindungen und Bindungselemente | `rlp-pmtextil`, `ao-anlage` |  |
| `LF6-3` | Berechnungen zum Nachstellen | 16 | Feinheit; Einstellung; Materialbedarf | `rlp-pmtextil` | rechnen |
| `LF6-4` | Umsetzungsplan | 14 | Arbeitsschritte planen; Maschineneinstellungen festlegen | `rlp-pmtextil`, `ao-anlage` |  |
| `LF6-5` | Qualitätsvergleich Muster und Nachstellung | 10 | Prüfen; Abweichungen bewerten | `rlp-pmtextil` |  |

### LF7 · Textile Materialien in Vorbereitungsprozessen einsetzen

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 7 PM (40 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage II.B Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.B Nr. 6 → Steuern des Materialflusses
- Prüfungsgebiete: PT-b, PP-d
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF7-1` | Vorbereitungsprozesse: Spulen, Schären, Zetteln, Schlichten | 16 | Spulen; Schären und Zetteln; Schlichten | `rlp-pmtextil` |  |
| `LF7-2` | Lagerung und Logistik | 12 | Lagerung textiler Materialien; Innerbetrieblicher Materialfluss | `rlp-pmtextil`, `ao-anlage` |  |
| `LF7-3` | Berechnungen zur Vorbereitung | 12 | Materialbedarf; Laufzeiten | `rlp-pmtextil` | rechnen |

### LF8 · Werkstoffe für Maschinenelemente bearbeiten

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 8 PM (60 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage II.B Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.B Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen
- Prüfungsgebiete: PP-c, PP-e
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF8-1` | Methoden zur Werkstoffbearbeitung | 16 | Sägen, Feilen, Bohren; Werkstoffe für Maschinenelemente | `rlp-pmtextil` |  |
| `LF8-2` | Betriebs- und Hilfsstoffe, Lagervorschriften | 10 | Betriebs- und Hilfsstoffe; Lagervorschriften | `rlp-pmtextil`, `ao-anlage` |  |
| `LF8-3` | Arbeitsplatz einrichten, Messen | 12 | Arbeitsplatz ergonomisch und sicher einrichten; Messen | `rlp-pmtextil`, `ao-anlage` | Sicherheit |
| `LF8-4` | Dichte, Volumen, Masse | 10 | Dichte; Volumen; Masse berechnen | `rlp-pmtextil` | rechnen |
| `LF8-5` | Ansichten von Werkstücken | 12 | Ansichten; Skizzen anfertigen | `rlp-pmtextil` |  |

### PA · Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern)

- Jahr 2 · ao-kern · 60 Einheiten · Niveau: Fachbildung (Niveau praktische und schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 12 → Steuern des Materialflusses; Anlage II.B Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.B Nr. 6 → Steuern des Materialflusses
- Prüfungsgebiete: PT-c, PP-a, PP-d, PRAK-1, PRAK-2
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Berufskern laut Anlage II.B Nr. 5 und Nr. 6. Der Referenz-Rahmenlehrplan deckt das nicht 1:1 ab, darum eigenes Modul direkt aus der Ausbildungsordnung. Deckt auch die praktischen Prüfungsaufgaben nach § 9 Abs. 2.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `PA-1` | Textile Produktionsmaschinen und -anlagen nach Funktion und Einsatz unterscheiden | 6 | Maschinen der Garn- und Flächenherstellung; Funktion und Einsatzbereich zuordnen | `ao-anlage` |  |
| `PA-2` | Rüsten und Umrüsten nach Vorgaben | 8 | Rüstvorgang nach Vorgabe; Umrüsten auf ein anderes Produkt; Rüstzeit berechnen | `ao-anlage`, `ao-p9` | rechnen |
| `PA-3` | Mehrstellenarbeit rationell organisieren | 6 | Mehrere Maschinen bedienen; Laufwege und Reihenfolge planen | `ao-anlage` |  |
| `PA-4` | Musterungs- und Verfestigungssysteme prüfen, Warenausfall optimieren | 10 | Musterungs- oder Verfestigungssysteme prüfen und korrigieren; Warenausfall prüfen und optimieren | `ao-anlage` |  |
| `PA-5` | Prozessdaten einstellen und optimieren, Prozesse überwachen | 8 | Prozessdaten einstellen; Produktionsprozess nach Verfahrensparametern überwachen; Parameter optimieren | `ao-anlage` |  |
| `PA-6` | Inbetriebnahme unter Sicherheitsbestimmungen | 6 | Inbetriebnahme Schritt für Schritt; Schutzeinrichtungen prüfen | `ao-anlage`, `ao-p9` | Sicherheit |
| `PA-7` | Störungen und Abweichungen: erkennen, Ursachen, beseitigen | 6 | Störungen feststellen; Ursachen eingrenzen; Beseitigen oder veranlassen | `ao-anlage` |  |
| `PA-8` | Materialfluss im Arbeitsbereich | 4 | Materialfluss überwachen und sicherstellen; Störungen im Materialfluss beseitigen | `ao-anlage` |  |
| `PA-9` | Übergabe und Dokumentation | 6 | Maschine oder Anlage übergeben; Produktionsstand und Veränderungen dokumentieren | `ao-anlage`, `ao-p9` |  |

### LF9 · Maschinen und Anlagen warten

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 9 PM (60 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage II.B Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.B Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PP-c, PT-c, PRAK-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF9-1` | Maschinenelemente zum Verbinden, Übertragen und Umformen von Bewegungen | 14 | Verbindungselemente; Übertragungselemente; Umformen von Bewegungen | `rlp-pmtextil` |  |
| `LF9-2` | Antriebe, Pumpen, Verdichter | 12 | Antriebe; Pumpen; Verdichter | `rlp-pmtextil` |  |
| `LF9-3` | Wartungspläne und Explosionszeichnungen | 12 | Wartungspläne lesen; Explosionszeichnungen lesen | `rlp-pmtextil`, `ao-anlage` |  |
| `LF9-4` | Zahnradgrößen, Reibungskraft, Drehmoment | 12 | Zahnradgrößen; Reibungskraft; Drehmoment | `rlp-pmtextil` | rechnen |
| `LF9-5` | Qualitätssicherung und sicheres Warten | 10 | Qualitätssicherung bei der Wartung; Sicher warten: freischalten, sichern | `rlp-pmtextil`, `ao-anlage` | Sicherheit |

### LF10 · Textilien kundengerecht veredeln und aufmachen

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 10 (40 Std., `rlp-pmtextil`)
- AO-Berufsbild: Anlage II.B Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.B Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PT-a, PP-b
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF10-1` | Farbgebung und Ausrüstung | 14 | Färben; Ausrüsten | `rlp-pmtextil` |  |
| `LF10-2` | Kennzeichnung: Kurzzeichen, Pflegekennzeichen, Gütesiegel, Textilkennzeichnung | 14 | Kurzzeichen; Pflegekennzeichen; Gütesiegel; Textilkennzeichnungsgesetz | `rlp-pmtextil` |  |
| `LF10-3` | Abfallverwertung und -verwendung | 12 | Abfall vermeiden; Verwerten und verwenden | `rlp-pmtextil`, `ao-anlage` |  |

### QS · Qualitätssichernde Maßnahmen

- Jahr 2 · ao-kern · 20 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 14 → Durchführen von qualitätssichernden Maßnahmen; Anlage II.B Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
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
- AO-Berufsbild: Anlage II.B Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.B Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PT-a, PT-b, PT-c, PT-d, PT-e, PT-f
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt B. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPT-1` | Fälle zu Rohstoffe, Zwischen- und Endprodukte, Produktionsverfahren, Prozessabläufe, Funktion von Maschinen und Anlagen | 18 | Praxisbezogene Fälle: Rohstoffe, Zwischen- und Endprodukte; Praxisbezogene Fälle: Produktionsverfahren, Prozessabläufe; Praxisbezogene Fälle: Funktion von Maschinen und Anlagen | `ao-p9` |  |
| `APPT-2` | Fälle zu prozess- und leistungsbezogene Berechnungen, Konstruktionstechniken und Produktmerkmale, Fertigungstechniken | 18 | Praxisbezogene Fälle: prozess- und leistungsbezogene Berechnungen; Praxisbezogene Fälle: Konstruktionstechniken und Produktmerkmale; Praxisbezogene Fälle: Fertigungstechniken | `ao-p9` |  |
| `APPT-3` | Prüfungsformat und Zeitplanung | 4 | 120 Minuten, 50 Prozent Gewicht; Praxisbezogene Fälle lesen und strukturieren | `ao-p9` |  |

### APPP · Abschlussprüfung: Training Produktionsplanung (§ 9)

- Jahr 2 · pruefung · 30 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.B Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen; Anlage II.B Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.B Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.B Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-a, PP-b, PP-c, PP-d, PP-e
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt B. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPP-1` | Fälle zu Arbeitsschritte, Qualitätssicherung | 12 | Praxisbezogene Fälle: Arbeitsschritte; Praxisbezogene Fälle: Qualitätssicherung | `ao-p9`, `ao-anlage` |  |
| `APPP-2` | Fälle zu vorbeugende Instandhaltung, Materialfluss, Anfertigen von Skizzen und Planungsunterlagen | 12 | Praxisbezogene Fälle: vorbeugende Instandhaltung; Praxisbezogene Fälle: Materialfluss; Praxisbezogene Fälle: Anfertigen von Skizzen und Planungsunterlagen | `ao-p9`, `ao-anlage` |  |
| `APPP-3` | Prüfungsformat und Zeitplanung | 6 | 60 Minuten, 30 Prozent Gewicht; Planungsunterlagen und Protokolle lesen | `ao-p9` |  |

## 8. Erzeugungsphasen

Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md).

| Phase | Module | Einheiten | Warum |
| --- | --- | --- | --- |
| A | `M0`, `LF1`, `LF2`, `PA` | 240 | Produktionsprozesse, Faserstoffe, Produktionsanlagen. |
| B | `LF3`, `LF4`, `LF5`, `ZP`, `QS` | 200 | Garne, Flächen, Überwachung, Zwischenprüfungs-Training, Qualitätssicherung. |
| C | `LF6`, `LF7`, `LF8` | 180 | Nachstellen, Vorbereitungsprozesse, Werkstoffe für Maschinenelemente. |
| D | `LF9`, `LF10`, `WISO`, `SBP`, `APPT`, `APPP` | 230 | Warten, Veredeln, WiSo und beide schriftlichen Prüfungstrainings. |
| | **Summe** | **850** | |

## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)

1. Die KMK-Originaldatei des RLP Produktionsmechaniker-Textil war nicht auffindbar; genutzt wird die wortgleiche Wiedergabe im Landeslehrplan NRW (QUA-LiS NRW). Bei Fund der KMK-PDF Quelle austauschen.
2. Einheiten-Budget: 1 Einheit je Unterrichtsstunde des RLP; übrige Module wie maf-metall.
3. Anlage II.B: Nr. 1–2 zusammen 10 Wochen, Nr. 3–4 zusammen 16 Wochen (Klammern der Verordnung).

