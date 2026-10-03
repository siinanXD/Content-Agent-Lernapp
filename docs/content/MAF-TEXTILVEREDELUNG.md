# Curriculum-Map: Maschinen- und Anlagenführer/in – Schwerpunkt Textilveredelung (Referenz Produktveredler-Textil)

Stand: 2026-10-03 · Status: **Entwurf – Freigabe durch Sinan offen** · Familie: `maf` · Map-ID: `maf-textilveredelung` · Maschinenlesbar: [`maf-textilveredelung.json`](maf-textilveredelung.json) · Vorgaben für die Agenten: [README](README.md)

> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.

## 1. Beruf, Dauer, Variante

- **Beruf:** Maschinen- und Anlagenführer
- **Variante:** Schwerpunkt Textilveredelung, Referenz-RLP Produktveredler-Textil (Lernfelder 1–8)
- **Dauer:** 2 Jahre. § 2 MaschFüAusbV: Die Ausbildung dauert zwei Jahre. Ein drittes und viertes Jahr gibt es nur als Fortsetzung in einem anderen Beruf nach § 10. Das ist nicht Teil dieses Kurses.
- **Referenz-Rahmenlehrplan:** `rlp-pvtextil`. Der KMK-RLP MAF verweist für den Schwerpunkt Textilveredelung auf den RLP Produktveredler-Textil (2005). Dessen Lernfelder 1–8 (280 + 280 Std.) bilden die schulische Achse.

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
| `bibb-51121` | [BIBB Berufesuche – Maschinen- und Anlagenführer/in (51121)](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121) | berufsinformation | 2026-10-03 |
| `rlp-pvtextil` | [KMK Rahmenlehrplan Produktveredler-Textil / Produktveredlerin-Textil (Beschluss 18.03.2005) – Lernfelder 1–8 als Referenz](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/ProduktveredelerTextil.pdf) | rahmenlehrplan | 2026-10-03 |

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

**Anlage II.C – Berufliche Fachbildung, 2. Ausbildungsjahr, Schwerpunkt Textilveredelung** (Quelle `ao-anlage`)

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
| 1 | Eigenschaften von Naturfasern für Veredlungsprozesse nutzen | 1 | 80 | `LF1` |
| 2 | Konstruktion des Behandlungsgutes analysieren und für die Veredlung vorbereiten | 1 | 80 | `LF2` |
| 3 | Veredlungsmaschinen und -anlagen überwachen | 1 | 40 | `LF3` |
| 4 | Wirkung von Chemikalien für Veredlungsprozesse nutzen | 1 | 80 | `LF4` |
| 5 | Eigenschaften von Chemiefasern für Veredlungsprozesse nutzen | 2 | 60 | `LF5` |
| 6 | Textilveredlungsmaschinen und -anlagen instand halten | 2 | 60 | `LF6` |
| 7 | Aufbereiten von Wasser und Ansetzen von Flotten | 2 | 80 | `LF7` |
| 8 | Textilien für Veredlungsprozesse vorbehandeln | 2 | 80 | `LF8` |
| | **Summe je Jahr** | | **J1: 280 · J2: 280** | |

## 5. Prüfungen und Zuordnung der Gebiete

Zwischenprüfung zu Beginn des 2. Ausbildungsjahres (§ 8). Abschlussprüfung (§ 9): praktischer Teil (höchstens 7 Stunden, bis zu 2 Aufgaben) und schriftlicher Teil mit Produktionstechnik 50 %, Produktionsplanung 30 %, Wirtschafts- und Sozialkunde 20 %. Gebiete laut § 9 Abs. 3 für diesen Schwerpunkt.

| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlussprüfung | Praktischer Teil (§ 9 Abs. 2) | praktisch | höchstens 7 Stunden, bis zu 2 Aufgaben | – | PRAK-1: Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-2: Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-3: Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme | `LF6`, `PA`, `LF8` |
| Abschlussprüfung schriftlich | Produktionstechnik | schriftlich | 120 Minuten | 50 % | PT-a: Rohstoffe, Zwischen- und Endprodukte; PT-b: Produktionsverfahren, Prozessabläufe; PT-c: Funktion von Maschinen und Anlagen; PT-d: prozess- und leistungsbezogene Berechnungen; PT-e: Veredelungsmittel und deren Funktionsweise; PT-f: Umweltschutz und Arbeitssicherheit; PT-g: Fertigungstechniken | `LF1`, `LF2`, `LF3`, `LF4`, `LF5`, `LF6`, `LF7`, `PA`, `LF8`, `APPT` |
| Abschlussprüfung schriftlich | Produktionsplanung | schriftlich | 60 Minuten | 30 % | PP-a: Arbeitsschritte; PP-b: Qualitätssicherung; PP-c: vorbeugende Instandhaltung; PP-d: Materialfluss; PP-e: Anfertigen von Skizzen und Planungsunterlagen | `LF2`, `LF3`, `LF6`, `PA`, `LF8`, `QS`, `APPP` |
| Abschlussprüfung schriftlich | Wirtschafts- und Sozialkunde | schriftlich | 60 Minuten | 20 % | WISO-1: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO` |

**Zwischenprüfung (§ 8):** zu Beginn des 2. Ausbildungsjahres; praktische Aufgabe höchstens 3 Stunden plus höchstens 60 Minuten schriftlich; Beispiel: Positionieren von Maschinenelementen; Stoff des 1. Ausbildungsjahres → `ZP`

Bestehen: Praktischer und schriftlicher Teil jeweils mindestens ausreichend; in zwei schriftlichen Prüfungsbereichen mindestens ausreichend, im dritten nicht ungenügend (§ 9 Abs. 7). Mündliche Ergänzungsprüfung möglich, Gewichtung 2:1 (§ 9 Abs. 5).

## 6. Module im Überblick

15 Module, **830 Einheiten** (bei 7.5 Minuten im Schnitt ≈ 103.8 Stunden Lernzeit; 4150–6640 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt | 1 | querschnitt | 60 | ja | WISO-1 |
| 1 | `LF1` | Eigenschaften von Naturfasern für Veredlungsprozesse nutzen | 1 | lernfeld | 80 | nein | PT-a, PT-d |
| 2 | `LF2` | Konstruktion des Behandlungsgutes analysieren und für die Veredlung vorbereiten | 1 | lernfeld | 80 | ja | PT-a, PT-b, PP-a |
| 3 | `LF3` | Veredlungsmaschinen und -anlagen überwachen | 1 | lernfeld | 40 | ja | PT-c, PP-c |
| 4 | `LF4` | Wirkung von Chemikalien für Veredlungsprozesse nutzen | 1 | lernfeld | 80 | ja | PT-e, PT-f |
| 5 | `ZP` | Zwischenprüfung: Training (§ 8) | 1 | pruefung | 20 | ja | ZP |
| 6 | `LF5` | Eigenschaften von Chemiefasern für Veredlungsprozesse nutzen | 2 | lernfeld | 60 | nein | PT-a, PT-d |
| 7 | `LF6` | Textilveredlungsmaschinen und -anlagen instand halten | 2 | lernfeld | 60 | ja | PP-c, PT-c, PRAK-3 |
| 8 | `LF7` | Aufbereiten von Wasser und Ansetzen von Flotten | 2 | lernfeld | 80 | ja | PT-e, PT-f, PT-d |
| 9 | `PA` | Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern) | 2 | ao-kern | 60 | ja | PT-c, PP-a, PP-d, PRAK-1, PRAK-2 |
| 10 | `LF8` | Textilien für Veredlungsprozesse vorbehandeln | 2 | lernfeld | 80 | nein | PT-b, PT-g, PP-a, PRAK-1 |
| 11 | `QS` | Qualitätssichernde Maßnahmen | 2 | ao-kern | 20 | nein | PP-b |
| 12 | `WISO` | Wirtschafts- und Sozialkunde | 2 | wiso | 40 | nein | WISO-1 |
| 13 | `APPT` | Abschlussprüfung: Training Produktionstechnik (§ 9) | 2 | pruefung | 40 | nein | PT-a, PT-b, PT-c, PT-d, PT-e, PT-f, PT-g |
| 14 | `APPP` | Abschlussprüfung: Training Produktionsplanung (§ 9) | 2 | pruefung | 30 | nein | PP-a, PP-b, PP-c, PP-d, PP-e |
| | | **Summe** | | | **830** | | |

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

### LF1 · Eigenschaften von Naturfasern für Veredlungsprozesse nutzen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 1 (80 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 6 → Betriebliche und technische Kommunikation
- Prüfungsgebiete: PT-a, PT-d
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF1-1` | Naturfaserstoffe: Histologie, Morphologie, chemischer Aufbau | 24 | Baumwolle, Wolle, Leinen, Seide; Faseraufbau; Chemischer Aufbau | `rlp-pvtextil`, `ao-anlage` |  |
| `LF1-2` | Faserprüfung und Mikroskopie | 16 | Faserprüfung; Mikroskopie | `rlp-pvtextil` |  |
| `LF1-3` | Faserstoffmassen, Handelsmasse, Gleichgewichtsfeuchte | 16 | Faserstoffmassen berechnen; Handelsmasse; Gleichgewichtsfeuchte | `rlp-pvtextil` | rechnen |
| `LF1-4` | Textilkennzeichnungsgesetz | 12 | Kennzeichnungspflichten; Faserbezeichnungen | `rlp-pvtextil` |  |
| `LF1-5` | Präsentationstechniken | 12 | Ergebnisse präsentieren; Dokumentation | `rlp-pvtextil`, `ao-anlage` |  |

### LF2 · Konstruktion des Behandlungsgutes analysieren und für die Veredlung vorbereiten

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 2 (80 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit
- Prüfungsgebiete: PT-a, PT-b, PP-a
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF2-1` | Textile Kette und Wertschöpfungsprozesse | 16 | Textile Kette; Wertschöpfung von der Faser bis zum Produkt | `rlp-pvtextil` |  |
| `LF2-2` | Garn- und Flächenkonstruktion analysieren | 20 | Garnkonstruktion; Gewebe, Maschenware, Vliesstoff; Bindungen | `rlp-pvtextil`, `ao-anlage` |  |
| `LF2-3` | Feinheitsbe- und -umrechnungen, Flächenberechnungen, spezifische Flächenmassen | 20 | Feinheit umrechnen; Flächen berechnen; Flächenmasse | `rlp-pvtextil` | rechnen |
| `LF2-4` | Vorbereiten des Behandlungsgutes: Nähen, Wickeln, Abtafeln | 16 | Nähen; Wickeln; Abtafeln | `rlp-pvtextil`, `ao-anlage` |  |
| `LF2-5` | Arbeitsschutz beim Vorbereiten | 8 | Gefährdungen; Schutzmaßnahmen | `rlp-pvtextil`, `ao-anlage` | Sicherheit |

### LF3 · Veredlungsmaschinen und -anlagen überwachen

- Jahr 1 · lernfeld · 40 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 3 (40 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage I Nr. 10 → Steuerungs- und Regelungstechnik; Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-c, PP-c
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF3-1` | Mess-, Kontroll-, Steuer- und Regeleinrichtungen | 14 | Mechanische und elektrische Systeme; Produktionsparameter einstellen | `rlp-pvtextil`, `ao-anlage` |  |
| `LF3-2` | Sensoren: Temperatur, Druck, Warenmasse, Geschwindigkeit | 14 | Sensorarten; Messwerte lesen und bewerten | `rlp-pvtextil` |  |
| `LF3-3` | Sicherheitseinrichtungen, z. B. Flammendetektor | 12 | Sicherheitseinrichtungen; Verhalten bei Auslösung | `rlp-pvtextil`, `ao-anlage` | Sicherheit |

### LF4 · Wirkung von Chemikalien für Veredlungsprozesse nutzen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 4 (80 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → Umweltschutz
- Prüfungsgebiete: PT-e, PT-f
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF4-1` | Atombau und Elementarteilchen | 14 | Atombau; Elementarteilchen, Massen | `rlp-pvtextil` |  |
| `LF4-2` | Chemische Bindungen, Symbole, Formelsprache | 18 | Bindungsarten; Symbole und Formeln | `rlp-pvtextil` |  |
| `LF4-3` | Stoffmenge und stöchiometrische Berechnungen | 20 | Stoffmenge; Stöchiometrie; Konzentrationen | `rlp-pvtextil` | rechnen |
| `LF4-4` | Gefahrstoffe: Lagerung, Transport, Entsorgung | 18 | Gefahrstoffkennzeichnung; Lagerung und innerbetrieblicher Transport; Entsorgung | `rlp-pvtextil`, `ao-anlage` | Sicherheit |
| `LF4-5` | Chemikalienwirkung in der Veredlung | 10 | Wirkung auf Faser und Effekt; Beurteilung | `rlp-pvtextil` |  |

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

### LF5 · Eigenschaften von Chemiefasern für Veredlungsprozesse nutzen

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 5 (60 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage II.C Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage II.C Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen
- Prüfungsgebiete: PT-a, PT-d
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF5-1` | Chemiefasern: Herstellung, Synthesen, Aufbau | 18 | Natürliche und synthetische Polymere; Synthesen; Chemischer und struktureller Aufbau | `rlp-pvtextil` |  |
| `LF5-2` | Amorphe und kristalline Bereiche, Eigenschaften | 14 | Struktur; Physikalische und chemische Eigenschaften | `rlp-pvtextil` |  |
| `LF5-3` | Gebrauchs- und Pflegeeigenschaften, Einsatzgebiete | 12 | Gebrauchseigenschaften; Pflege; Einsatzgebiete | `rlp-pvtextil` |  |
| `LF5-4` | Faserstoffmengen, Mischungsverhältnisse, Faserfeinheit | 16 | Faserstoffmengen; Mischungsverhältnisse; Faserfeinheit | `rlp-pvtextil` | rechnen |

### LF6 · Textilveredlungsmaschinen und -anlagen instand halten

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 6 (60 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage II.C Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.C Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PP-c, PT-c, PRAK-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF6-1` | Maschinenelemente: Walzen, Lager | 12 | Walzen; Lager | `rlp-pvtextil` |  |
| `LF6-2` | Baugruppen: Motoren, Antriebe, Getriebe, Pumpen, Verdichter | 16 | Motoren und Antriebe; Getriebe; Pumpen und Verdichter | `rlp-pvtextil` |  |
| `LF6-3` | Korrosionsschutz, Normen, Verordnungen | 10 | Korrosionsschutz; Normen und Verordnungen | `rlp-pvtextil` |  |
| `LF6-4` | Getriebeberechnungen, Fördervolumen | 12 | Getriebeübersetzung; Fördervolumen | `rlp-pvtextil` | rechnen |
| `LF6-5` | Sicherheitseinrichtungen, sicheres Instandhalten | 10 | Sicherheitseinrichtungen; Freischalten und sichern | `rlp-pvtextil`, `ao-anlage` | Sicherheit |

### LF7 · Aufbereiten von Wasser und Ansetzen von Flotten

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 7 (80 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage II.C Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage II.C Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen; Anlage II.C Nr. 3 → Branchenspezifische Fertigungstechniken
- Prüfungsgebiete: PT-e, PT-f, PT-d
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF7-1` | Wasserkreislauf und Wasserarten | 16 | Wasserkreislauf; Brauchwasser, Kesselspeisewasser, destilliertes Wasser | `rlp-pvtextil` |  |
| `LF7-2` | Dampferzeugung, Dampfarten, Energierückgewinnung | 16 | Dampferzeugung; Dampfarten; Energierückgewinnung | `rlp-pvtextil` |  |
| `LF7-3` | Gesetzliche Vorschriften, Verordnungen, Richtlinien | 12 | Wasserrecht; Abwasser | `rlp-pvtextil` |  |
| `LF7-4` | Gehaltsangaben von Lösungen, Flotten ansetzen | 24 | Gehaltsangaben; Rezeptur- und Ansatzberechnungen; Flotten ansetzen | `rlp-pvtextil`, `ao-anlage` | rechnen |
| `LF7-5` | Arbeitsschutz beim Ansetzen | 12 | Chemikalien sicher handhaben; PSA | `rlp-pvtextil`, `ao-anlage` | Sicherheit |

### PA · Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern)

- Jahr 2 · ao-kern · 60 Einheiten · Niveau: Fachbildung (Niveau praktische und schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 12 → Steuern des Materialflusses; Anlage II.C Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.C Nr. 6 → Steuern des Materialflusses
- Prüfungsgebiete: PT-c, PP-a, PP-d, PRAK-1, PRAK-2
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Berufskern laut Anlage II.C Nr. 5 und Nr. 6. Der Referenz-Rahmenlehrplan deckt das nicht 1:1 ab, darum eigenes Modul direkt aus der Ausbildungsordnung. Deckt auch die praktischen Prüfungsaufgaben nach § 9 Abs. 2.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `PA-1` | Veredlungsmaschinen und -anlagen nach Funktion und Einsatz unterscheiden | 6 | Maschinen der Vorbehandlung, Färberei, Druckerei, Ausrüstung; Funktion und Einsatzbereich zuordnen | `ao-anlage` |  |
| `PA-2` | Rüsten und Umrüsten nach Vorgaben | 8 | Rüstvorgang nach Vorgabe; Umrüsten auf einen anderen Artikel; Rüstzeit berechnen | `ao-anlage`, `ao-p9` | rechnen |
| `PA-3` | Veredelungsmittel unter Sicherheitsregeln und Umweltschutzauflagen einsetzen | 10 | Veredelungsmittel auswählen und einsetzen; Sicherheitsregeln und Umweltschutzauflagen | `ao-anlage` | Sicherheit |
| `PA-4` | Veredelungseffekte prüfen und nachstellen | 8 | Effekte prüfen; Bei Bedarf nachstellen | `ao-anlage` |  |
| `PA-5` | Prozessdaten einstellen und optimieren, Prozesse überwachen | 8 | Prozessdaten einstellen; Nach Verfahrensparametern überwachen; Gebrauchs- und Pflegeanforderungen berücksichtigen | `ao-anlage` |  |
| `PA-6` | Inbetriebnahme unter Sicherheitsbestimmungen | 6 | Inbetriebnahme Schritt für Schritt; Schutzeinrichtungen prüfen | `ao-anlage`, `ao-p9` | Sicherheit |
| `PA-7` | Störungen und Abweichungen: erkennen, Ursachen, beseitigen | 6 | Störungen feststellen; Ursachen eingrenzen; Beseitigen oder veranlassen | `ao-anlage` |  |
| `PA-8` | Materialfluss im Arbeitsbereich | 4 | Materialfluss überwachen und sicherstellen; Störungen im Materialfluss beseitigen | `ao-anlage` |  |
| `PA-9` | Übergabe und Dokumentation | 4 | Maschine oder Anlage übergeben; Produktionsstand und Veränderungen dokumentieren | `ao-anlage`, `ao-p9` |  |

### LF8 · Textilien für Veredlungsprozesse vorbehandeln

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 8 (80 Std., `rlp-pvtextil`)
- AO-Berufsbild: Anlage II.C Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.C Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.C Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PT-b, PT-g, PP-a, PRAK-1
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF8-1` | Vorbehandlungsprozesse substratbezogen planen | 20 | Vorbehandlung je Substrat; Prozessfolge planen | `rlp-pvtextil`, `ao-anlage` |  |
| `LF8-2` | Maschinen und Anlagen der Vorbehandlung | 16 | Maschinentypen; Einsatz | `rlp-pvtextil` |  |
| `LF8-3` | Verfahren: diskontinuierlich, kontinuierlich, semi-kontinuierlich | 16 | Verfahrensarten; Auswahlkriterien | `rlp-pvtextil` |  |
| `LF8-4` | Rezepturen, Flottenaufnahme, Flottenverhältnis | 20 | Rezepturen; Flottenaufnahme; Flottenverhältnis | `rlp-pvtextil` | rechnen |
| `LF8-5` | Umweltschutz und Abwasser | 8 | Abwasser; Umweltauflagen | `rlp-pvtextil`, `ao-anlage` |  |

### QS · Qualitätssichernde Maßnahmen

- Jahr 2 · ao-kern · 20 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 14 → Durchführen von qualitätssichernden Maßnahmen; Anlage II.C Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
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

### APPT · Abschlussprüfung: Training Produktionstechnik (§ 9)

- Jahr 2 · pruefung · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.C Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.C Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PT-a, PT-b, PT-c, PT-d, PT-e, PT-f, PT-g
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt C. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPT-1` | Fälle zu Rohstoffe, Zwischen- und Endprodukte, Produktionsverfahren, Prozessabläufe, Funktion von Maschinen und Anlagen, prozess- und leistungsbezogene Berechnungen | 18 | Praxisbezogene Fälle: Rohstoffe, Zwischen- und Endprodukte; Praxisbezogene Fälle: Produktionsverfahren, Prozessabläufe; Praxisbezogene Fälle: Funktion von Maschinen und Anlagen; Praxisbezogene Fälle: prozess- und leistungsbezogene Berechnungen | `ao-p9` |  |
| `APPT-2` | Fälle zu Veredelungsmittel und deren Funktionsweise, Umweltschutz und Arbeitssicherheit, Fertigungstechniken | 18 | Praxisbezogene Fälle: Veredelungsmittel und deren Funktionsweise; Praxisbezogene Fälle: Umweltschutz und Arbeitssicherheit; Praxisbezogene Fälle: Fertigungstechniken | `ao-p9` |  |
| `APPT-3` | Prüfungsformat und Zeitplanung | 4 | 120 Minuten, 50 Prozent Gewicht; Praxisbezogene Fälle lesen und strukturieren | `ao-p9` |  |

### APPP · Abschlussprüfung: Training Produktionsplanung (§ 9)

- Jahr 2 · pruefung · 30 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.C Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen; Anlage II.C Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.C Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.C Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-a, PP-b, PP-c, PP-d, PP-e
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt C. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPP-1` | Fälle zu Arbeitsschritte, Qualitätssicherung | 12 | Praxisbezogene Fälle: Arbeitsschritte; Praxisbezogene Fälle: Qualitätssicherung | `ao-p9`, `ao-anlage` |  |
| `APPP-2` | Fälle zu vorbeugende Instandhaltung, Materialfluss, Anfertigen von Skizzen und Planungsunterlagen | 12 | Praxisbezogene Fälle: vorbeugende Instandhaltung; Praxisbezogene Fälle: Materialfluss; Praxisbezogene Fälle: Anfertigen von Skizzen und Planungsunterlagen | `ao-p9`, `ao-anlage` |  |
| `APPP-3` | Prüfungsformat und Zeitplanung | 6 | 60 Minuten, 30 Prozent Gewicht; Planungsunterlagen und Protokolle lesen | `ao-p9` |  |

## 8. Erzeugungsphasen

Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md).

| Phase | Module | Einheiten | Warum |
| --- | --- | --- | --- |
| A | `M0`, `LF1`, `LF2`, `PA` | 280 | Naturfasern, Behandlungsgut, Produktionsanlagen. |
| B | `LF3`, `LF4`, `ZP`, `QS` | 160 | Anlagen überwachen, Chemikalien, Zwischenprüfungs-Training, Qualitätssicherung. |
| C | `LF5`, `LF6`, `LF7` | 200 | Chemiefasern, Instandhaltung, Wasser und Flotten. |
| D | `LF8`, `WISO`, `APPT`, `APPP` | 190 | Vorbehandeln, WiSo und beide schriftlichen Prüfungstrainings. |
| | **Summe** | **830** | |

## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)

1. Referenz-Rahmenlehrplan ist Produktveredler-Textil (LF 1–8).
2. Einheiten-Budget: 1 Einheit je Unterrichtsstunde des RLP; übrige Module wie maf-metall.
3. Anlage II.C: Nr. 1–2 zusammen 10 Wochen, Nr. 3–4 zusammen 16 Wochen (Klammern der Verordnung).

