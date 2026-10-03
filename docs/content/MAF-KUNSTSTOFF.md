# Curriculum-Map: Maschinen- und Anlagenführer/in – Schwerpunkt Metall- und Kunststofftechnik (Referenz Kunststoff- und Kautschuktechnologe)

Stand: 2026-10-03 · Status: **Entwurf – Freigabe durch Sinan offen** · Familie: `maf` · Map-ID: `maf-kunststoff` · Maschinenlesbar: [`maf-kunststoff.json`](maf-kunststoff.json) · Vorgaben für die Agenten: [README](README.md)

> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.

## 1. Beruf, Dauer, Variante

- **Beruf:** Maschinen- und Anlagenführer
- **Variante:** Schwerpunkt Metall- und Kunststofftechnik, Referenz-RLP Kunststoff- und Kautschuktechnologe/-technologin (Kunststoffbetriebe)
- **Dauer:** 2 Jahre. § 2 MaschFüAusbV: Die Ausbildung dauert zwei Jahre. Ein drittes und viertes Jahr gibt es nur als Fortsetzung in einem anderen Beruf nach § 10. Das ist nicht Teil dieses Kurses.
- **Referenz-Rahmenlehrplan:** `rlp-kuk`. Für Kunststoffbetriebe nennt der KMK-RLP MAF den RLP Kunststoff- und Kautschuktechnologe/-technologin als Fortsetzungsberuf; dessen Lernfelder 1–8 (320 + 280 Std.) bilden die schulische Achse. Betriebliche Achse und Prüfung sind identisch mit maf-metall (Anlage II.A, § 9 Nr. 1).
- **Alternativen:** Metallbetriebe: Map maf-metall (Referenz Industriemechaniker)

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
| `rlp-kuk` | [KMK Rahmenlehrplan Kunststoff- und Kautschuktechnologe/-technologin (Beschluss 22.03.2012 i. d. F. 31.03.2023) – Lernfelder 1–8 als Referenz für Kunststoff](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/KuKTechnologe-12-03-22idf23-03-31-mitEL.pdf) | rahmenlehrplan | 2026-10-03 |

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

**Anlage II.A – Berufliche Fachbildung, 2. Ausbildungsjahr, Schwerpunkt Metall- und Kunststofftechnik** (Quelle `ao-anlage`)

| Lfd. Nr. | Berufsbildposition | Wochen |
| --- | --- | --- |
| 1, 2 | 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; 7 Planen und Vorbereiten von Arbeitsabläufen | 8 |
| 3 | 9 Branchenspezifische Fertigungstechniken | 18 |
| 4, 5 | 10 Steuerungs- und Regelungstechnik; 11 Einrichten und Bedienen von Produktionsanlagen | 18 |
| 6 | 12 Steuern des Materialflusses | 2 |
| 7 | 13 Warten und Inspizieren von Maschinen und Anlagen | 4 |
| 8 | 14 Durchführen von qualitätssichernden Maßnahmen | 2 |
| | **Summe** | **52** (erwartet 52) |

Mehrere Nummern in einer Zeile teilen sich die Wochen (Klammer in der Anlage).

## 4. Schulische Lernfelder (Referenz-Rahmenlehrplan)

| LF | Titel | Jahr | Std. | Modul |
| --- | --- | --- | --- | --- |
| 1 | Werkstoffe nach anwendungsbezogenen Kriterien auswählen | 1 | 80 | `LF1` |
| 2 | Bauelemente aus berufsbezogenen Werkstoffen herstellen | 1 | 80 | `LF2` |
| 3 | Einfache Baugruppen herstellen | 1 | 80 | `LF3` |
| 4 | Anlagenbezogene Steuerungstechniken anwenden | 1 | 80 | `LF4` |
| 5 | Fertigungsvoraussetzungen für die Polymerverarbeitung schaffen | 2 | 80 | `LF5` |
| 7 | Eigenschaften von polymeren Werkstoffen prüfen und analysieren | 2 | 80 | `LF7` |
| 6 | Werkzeuge, Maschinen und Zusatzgeräte instand halten | 2 | 60 | `LF6` |
| 8 | Steuerungstechnische Systeme für die Be- und Verarbeitung von Polymeren anwenden und prüfen | 2 | 60 | `LF8` |
| | **Summe je Jahr** | | **J1: 320 · J2: 280** | |

## 5. Prüfungen und Zuordnung der Gebiete

Zwischenprüfung zu Beginn des 2. Ausbildungsjahres (§ 8). Abschlussprüfung (§ 9): praktischer Teil (höchstens 7 Stunden, bis zu 2 Aufgaben) und schriftlicher Teil mit Produktionstechnik 50 %, Produktionsplanung 30 %, Wirtschafts- und Sozialkunde 20 %. Gebiete laut § 9 Abs. 3 für diesen Schwerpunkt.

| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlussprüfung | Praktischer Teil (§ 9 Abs. 2) | praktisch | höchstens 7 Stunden, bis zu 2 Aufgaben | – | PRAK-1: Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-2: Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-3: Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme | `LF5`, `LF6`, `PA`, `LF8` |
| Abschlussprüfung schriftlich | Produktionstechnik | schriftlich | 120 Minuten | 50 % | PT-a: technische Unterlagen; PT-b: Werkstoffe; PT-c: Werkzeuge; PT-d: Funktion von Maschinen und Anlagen; PT-e: Prüfverfahren und Prüfmittel; PT-f: Fertigungstechniken | `LF1`, `LF2`, `LF3`, `LF4`, `LF5`, `LF7`, `LF6`, `PA`, `LF8`, `APPT` |
| Abschlussprüfung schriftlich | Produktionsplanung | schriftlich | 60 Minuten | 30 % | PP-a: Arbeitsschritte; PP-b: Qualitätssicherung; PP-c: vorbeugende Instandhaltung; PP-d: Produktionsanlagen; PP-e: Übergabeprotokoll | `LF2`, `LF3`, `LF4`, `LF5`, `LF7`, `LF6`, `PA`, `LF8`, `QS`, `APPP` |
| Abschlussprüfung schriftlich | Wirtschafts- und Sozialkunde | schriftlich | 60 Minuten | 20 % | WISO-1: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO` |

**Zwischenprüfung (§ 8):** zu Beginn des 2. Ausbildungsjahres; praktische Aufgabe höchstens 3 Stunden plus höchstens 60 Minuten schriftlich; Beispiel: Positionieren von Maschinenelementen; Stoff des 1. Ausbildungsjahres → `ZP`

Bestehen: Praktischer und schriftlicher Teil jeweils mindestens ausreichend; in zwei schriftlichen Prüfungsbereichen mindestens ausreichend, im dritten nicht ungenügend (§ 9 Abs. 7). Mündliche Ergänzungsprüfung möglich, Gewichtung 2:1 (§ 9 Abs. 5).

## 6. Module im Überblick

15 Module, **870 Einheiten** (bei 7.5 Minuten im Schnitt ≈ 108.8 Stunden Lernzeit; 4350–6960 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt | 1 | querschnitt | 60 | ja | WISO-1 |
| 1 | `LF1` | Werkstoffe nach anwendungsbezogenen Kriterien auswählen | 1 | lernfeld | 80 | nein | PT-b, PT-a |
| 2 | `LF2` | Bauelemente aus berufsbezogenen Werkstoffen herstellen | 1 | lernfeld | 80 | ja | PT-a, PT-c, PT-e, PT-f, PP-a |
| 3 | `LF3` | Einfache Baugruppen herstellen | 1 | lernfeld | 80 | nein | PT-a, PT-c, PP-a |
| 4 | `LF4` | Anlagenbezogene Steuerungstechniken anwenden | 1 | lernfeld | 80 | ja | PT-d, PP-d |
| 5 | `ZP` | Zwischenprüfung: Training (§ 8) | 1 | pruefung | 20 | ja | ZP |
| 6 | `LF5` | Fertigungsvoraussetzungen für die Polymerverarbeitung schaffen | 2 | lernfeld | 80 | ja | PT-b, PT-f, PP-a, PRAK-1 |
| 7 | `LF7` | Eigenschaften von polymeren Werkstoffen prüfen und analysieren | 2 | lernfeld | 80 | nein | PT-b, PT-e, PP-b |
| 8 | `LF6` | Werkzeuge, Maschinen und Zusatzgeräte instand halten | 2 | lernfeld | 60 | ja | PP-c, PT-d, PRAK-3 |
| 9 | `PA` | Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern) | 2 | ao-kern | 60 | ja | PT-d, PP-a, PP-d, PP-e, PRAK-1, PRAK-2 |
| 10 | `LF8` | Steuerungstechnische Systeme für die Be- und Verarbeitung von Polymeren anwenden und prüfen | 2 | lernfeld | 60 | ja | PT-d, PP-d, PRAK-1 |
| 11 | `QS` | Qualitätssichernde Maßnahmen | 2 | ao-kern | 20 | nein | PP-b |
| 12 | `WISO` | Wirtschafts- und Sozialkunde | 2 | wiso | 40 | nein | WISO-1 |
| 13 | `APPT` | Abschlussprüfung: Training Produktionstechnik (§ 9) | 2 | pruefung | 40 | nein | PT-a, PT-b, PT-c, PT-d, PT-e, PT-f |
| 14 | `APPP` | Abschlussprüfung: Training Produktionsplanung (§ 9) | 2 | pruefung | 30 | nein | PP-a, PP-b, PP-c, PP-d, PP-e |
| | | **Summe** | | | **870** | | |

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

### LF1 · Werkstoffe nach anwendungsbezogenen Kriterien auswählen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 1 (80 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 6 → Betriebliche und technische Kommunikation
- Prüfungsgebiete: PT-b, PT-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF1-1` | Aufbau der Stoffe: Atommodell, Molekülstruktur, Bindungsarten | 12 | Atommodell; Molekülstruktur; Bindungsarten, Haupt- und Nebenvalenzkräfte | `rlp-kuk` |  |
| `LF1-2` | Werkstoffeigenschaften | 12 | Physikalische, chemische, mechanische, technologische Eigenschaften; Eigenschaften für die Anwendung bewerten | `rlp-kuk`, `ao-anlage` |  |
| `LF1-3` | Metallische Werkstoffe im Überblick | 8 | Stahl, Gusseisen, Nichteisenmetalle; Einsatz in Werkzeugen und Maschinen | `rlp-kuk` |  |
| `LF1-4` | Thermoplaste, Duroplaste, Elastomere | 14 | Einteilung der Polymere; Verhalten bei Wärme; Typische Anwendungen | `rlp-kuk`, `ao-anlage` |  |
| `LF1-5` | Polyreaktionen und Additive | 12 | Polymerisation, Polykondensation, Polyaddition; Additive und Zuschlagstoffe; Hilfsstoffe sicher handhaben | `rlp-kuk`, `ao-anlage` |  |
| `LF1-6` | SI-Einheiten, Dichte, Wärmedehnung, Zustandsdiagramme | 10 | SI-Einheiten umrechnen; Dichte und Wärmedehnung berechnen; Zustandsdiagramme lesen | `rlp-kuk` | rechnen |
| `LF1-7` | Werkstoffnormung, Kunststofferkennung, technische Unterlagen | 12 | Werkstoffnormung und Kurzzeichen; Kunststoffe erkennen; Technische Unterlagen, digitale Medien, Datenschutz und Datensicherheit | `rlp-kuk`, `ao-anlage` |  |

### LF2 · Bauelemente aus berufsbezogenen Werkstoffen herstellen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 2 (80 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 8 → Prüfen; Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen
- Prüfungsgebiete: PT-a, PT-c, PT-e, PT-f, PP-a
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF2-1` | Zeichnungsnormen, Darstellungsarten, Bemaßung, Maßtoleranzen | 14 | Zeichnungsnormen; Darstellungsarten; Fertigungsbezogene Bemaßung; Maßtoleranzen | `rlp-kuk`, `ao-anlage` |  |
| `LF2-2` | Bohren, Sägen, Feilen | 14 | Werkzeuge und Vorgehen; Arbeitsschritte planen; Arbeitsergebnis prüfen | `rlp-kuk`, `ao-anlage` |  |
| `LF2-3` | Biegen, Streckenteilung, gestreckte Länge | 12 | Biegeverfahren; Streckenteilungen; Gestreckte Länge berechnen | `rlp-kuk` | rechnen |
| `LF2-4` | Winkel an der Werkzeugschneide, Schnittgeschwindigkeit | 12 | Winkel an der Schneide; Winkelberechnung; Schnittgeschwindigkeit und Drehzahl | `rlp-kuk` | rechnen |
| `LF2-5` | Prozentrechnung und Dreisatz in der Fertigung | 8 | Prozentrechnung; Dreisatz; Materialbedarf und Ausschuss | `rlp-kuk` | rechnen |
| `LF2-6` | Messschieber, Lehre, Messfehler | 12 | Messen und Lehren; Messschieber richtig ablesen; Messfehler und Ursachen | `rlp-kuk`, `ao-anlage` |  |
| `LF2-7` | Präsentieren, Arbeits- und Umweltschutz | 8 | Präsentationstechniken; Arbeitsschutz an Werkbank und Maschine; Umweltschutz bei Spänen und Hilfsstoffen | `rlp-kuk`, `ao-anlage` | Sicherheit |

### LF3 · Einfache Baugruppen herstellen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 3 (80 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 6 → Betriebliche und technische Kommunikation; Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen
- Prüfungsgebiete: PT-a, PT-c, PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF3-1` | Gewinde- und Schnittdarstellungen, Gruppen- und Gesamtzeichnungen | 14 | Gewindedarstellung; Schnittdarstellungen; Gruppen- und Gesamtzeichnungen lesen | `rlp-kuk` |  |
| `LF3-2` | Toleranzen, Passungen, Oberflächenangaben | 14 | Toleranzen und Passungen; Oberflächenangaben | `rlp-kuk` |  |
| `LF3-3` | Kleben, Schweißen, Schweißsymbole | 14 | Kleben von Kunststoffen und Metallen; Schweißen: Verfahren im Überblick; Schweißsymbole | `rlp-kuk`, `ao-anlage` |  |
| `LF3-4` | Schraub-, Schnapp- und Klemmverbindungen | 14 | Schraubverbindungen; Schnappverbindungen; Klemmverbindungen | `rlp-kuk`, `ao-anlage` |  |
| `LF3-5` | Reibungsarten und -berechnungen | 10 | Haft-, Gleit-, Rollreibung; Reibkraft berechnen | `rlp-kuk` | rechnen |
| `LF3-6` | Arbeitsorganisation: Arbeitsschritte planen und dokumentieren | 14 | Arbeitsschritte planen; Dokumentation; Arbeitsorganisation im Team | `rlp-kuk`, `ao-anlage` |  |

### LF4 · Anlagenbezogene Steuerungstechniken anwenden

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 4 (80 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage I Nr. 10 → Steuerungs- und Regelungstechnik; Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → Umweltschutz
- Prüfungsgebiete: PT-d, PP-d
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF4-1` | Messen, Steuern, Regeln; Steuerstrecke, Regelkreis, EVA-Prinzip | 12 | Messen, Steuern, Regeln unterscheiden; Steuerstrecke und Regelkreis; EVA-Prinzip | `rlp-kuk`, `ao-anlage` |  |
| `LF4-2` | Pneumatik-Grundschaltungen | 14 | Bauglieder; Steuerungs- und Leistungsteil; Ventilarten | `rlp-kuk` |  |
| `LF4-3` | Druck- und Durchflussberechnungen; Luft-, Wasser-, Energiebedarf | 12 | Druckberechnungen; Durchflussmenge; Luft-, Wasser- und Energiebedarf | `rlp-kuk` | rechnen |
| `LF4-4` | Hilfs- und Betriebsmittel: Wasser, Öle, Gase; Entsorgung | 10 | Wasser, Öle, Gase; Entsorgung, Richtlinien | `rlp-kuk`, `ao-anlage` |  |
| `LF4-5` | Elektrischer Stromkreis | 14 | Größen im Stromkreis, Ohmsches Gesetz; Reihen- und Parallelschaltung; Elektrische Leistung | `rlp-kuk` | rechnen |
| `LF4-6` | Gefahren des elektrischen Stroms, elektrische Sicherheit | 10 | Wirkung des Stroms auf den Menschen; Schutzmaßnahmen; Fünf Sicherheitsregeln | `rlp-kuk`, `ao-anlage` | Sicherheit |
| `LF4-7` | Funktionsprüfung von Steuerungen | 8 | Funktionsprüfung durchführen; Ergebnis dokumentieren | `rlp-kuk` |  |

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

### LF5 · Fertigungsvoraussetzungen für die Polymerverarbeitung schaffen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 5 (80 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage II.A Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage II.A Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.A Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-b, PT-f, PP-a, PRAK-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF5-1` | Überblick der Fertigungsverfahren der Polymerverarbeitung | 12 | Urformen: Spritzgießen, Extrudieren, Pressen, Blasformen; Verfahren dem Produkt zuordnen | `rlp-kuk`, `ao-anlage` |  |
| `LF5-2` | Eingangskontrolle, Hilfs- und Zusatzstoffe | 10 | Eingangskontrolle der Formmassen; Hilfs- und Zusatzstoffe | `rlp-kuk`, `ao-anlage` |  |
| `LF5-3` | Mischerarten, Mischen und Berechnungen | 12 | Mischerarten; Mischungsverhältnisse berechnen | `rlp-kuk` | rechnen |
| `LF5-4` | Zerkleinern, Granulieren, Vorplastifizieren | 12 | Zerkleinern; Granulieren; Vorplastifizieren | `rlp-kuk` |  |
| `LF5-5` | Trocknungsverfahren und Berechnungen | 10 | Trocknungsverfahren; Trocknungszeit und Restfeuchte berechnen | `rlp-kuk` | rechnen |
| `LF5-6` | Förderung und Lagerung der Formmassen | 10 | Fördersysteme; Lagerung von Formmassen | `rlp-kuk`, `ao-anlage` |  |
| `LF5-7` | Schutz- und Sicherheitseinrichtungen | 8 | Schutzeinrichtungen an Verarbeitungsmaschinen; Sicheres Arbeiten an der Maschine | `rlp-kuk`, `ao-anlage` | Sicherheit |
| `LF5-8` | Verfahrensspezifisches Recycling | 6 | Rezyklat und Mahlgut; Recycling im Betrieb | `rlp-kuk`, `ao-anlage` |  |

### LF7 · Eigenschaften von polymeren Werkstoffen prüfen und analysieren

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 7 (80 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage II.A Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage II.A Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PT-b, PT-e, PP-b
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF7-1` | Prüfplanung und Probenvorbereitung | 10 | Prüfplan erstellen; Proben vorbereiten | `rlp-kuk`, `ao-anlage` |  |
| `LF7-2` | Mechanische Prüfungen: Härte, Schlagzähigkeit, Zug-, Druck-, Scherfestigkeit | 18 | Härte; Schlagzähigkeit; Zug-, Druck-, Scherfestigkeit | `rlp-kuk` |  |
| `LF7-3` | Viskosität, Schmelzindex, Feuchtigkeit | 14 | Viskosität; Schmelzindex; Feuchtigkeit bestimmen | `rlp-kuk` | rechnen |
| `LF7-4` | Rohdichte, Schüttdichte, Korngrößenverteilung, Rieselfähigkeit | 14 | Rohdichte und Schüttdichte; Korngrößenverteilung; Rieselfähigkeit | `rlp-kuk` | rechnen |
| `LF7-5` | Formbeständigkeit in der Wärme | 10 | Prüfverfahren; Bewertung | `rlp-kuk` |  |
| `LF7-6` | Erstarren, Vulkanisation, Vernetzung | 14 | Erstarren von Thermoplasten; Vulkanisation von Kautschuk; Vernetzung von Duroplasten | `rlp-kuk` |  |

### LF6 · Werkzeuge, Maschinen und Zusatzgeräte instand halten

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 6 (60 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage II.A Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.A Nr. 3 → Branchenspezifische Fertigungstechniken
- Prüfungsgebiete: PP-c, PT-d, PRAK-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF6-1` | Instandhaltungssystematik und Systemanalyse | 12 | Wartung, Inspektion, Instandsetzung; Systemanalyse | `rlp-kuk`, `ao-anlage` |  |
| `LF6-2` | Montagepläne, Schnittdarstellungen | 10 | Montagepläne lesen; Schnittdarstellungen | `rlp-kuk` |  |
| `LF6-3` | Antriebseinheit, Arbeitseinheit, Lager, Führungen | 14 | Antriebseinheit; Arbeitseinheit; Lager und Führungen | `rlp-kuk` |  |
| `LF6-4` | Kraft- und Bewegungsübersetzung; Arbeit, Leistung, Wirkungsgrad, Drehmomente | 14 | Übersetzungen; Arbeit, Leistung, Wirkungsgrad; Drehmomente | `rlp-kuk` | rechnen |
| `LF6-5` | Instandhaltung sicher durchführen | 10 | Freischalten, sichern; Verschleißteile tauschen; Betriebsbereitschaft prüfen | `rlp-kuk`, `ao-anlage` | Sicherheit |

### PA · Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern)

- Jahr 2 · ao-kern · 60 Einheiten · Niveau: Fachbildung (Niveau praktische und schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 12 → Steuern des Materialflusses; Anlage II.A Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 6 → Steuern des Materialflusses
- Prüfungsgebiete: PT-d, PP-a, PP-d, PP-e, PRAK-1, PRAK-2
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Berufskern laut Anlage II.A Nr. 5 und Nr. 6. Der Referenz-Rahmenlehrplan deckt das nicht 1:1 ab, darum eigenes Modul direkt aus der Ausbildungsordnung. Deckt auch die praktischen Prüfungsaufgaben nach § 9 Abs. 2.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `PA-1` | Produktionsmaschinen und -anlagen nach Funktion und Einsatz unterscheiden | 6 | Maschinentypen und Anlagentypen in der Metall- und Kunststoffverarbeitung; Funktion und Einsatzbereich zuordnen | `ao-anlage` |  |
| `PA-2` | Rüsten und Umrüsten nach Vorgaben, Rüstzeiten | 10 | Rüstvorgang nach Vorgabe; Umrüsten auf ein anderes Produkt; Rüstzeit und Stückzeit berechnen | `ao-anlage`, `ao-p9` | rechnen |
| `PA-3` | Prozessdaten einstellen und optimieren, Parameter überwachen | 10 | Prozessdaten einstellen; Produktionsprozess nach Verfahrensparametern überwachen; Parameter optimieren | `ao-anlage` |  |
| `PA-4` | Inbetriebnahme unter Sicherheitsbestimmungen | 6 | Inbetriebnahme Schritt für Schritt; Schutzeinrichtungen prüfen; Freigabe und Dokumentation | `ao-anlage`, `ao-p9` | Sicherheit |
| `PA-5` | Störungen und Abweichungen: erkennen, Ursachen, beseitigen | 10 | Störungen und Abweichungen feststellen; Ursachen eingrenzen; Selbst beseitigen oder Beseitigung veranlassen | `ao-anlage` |  |
| `PA-6` | Abläufe optimieren, Eingriff in die Prozesskette | 6 | Arbeits- und Bewegungsabläufe im Arbeitsbereich optimieren; Produktionsablauf durch Eingriff in die Prozesskette sichern | `ao-anlage` |  |
| `PA-7` | Materialfluss im Arbeitsbereich | 6 | Werk-, Betriebs- und Hilfsstoffe transportieren und lagern; Wert- und Reststoffe sammeln, trennen, lagern; Störungen im Materialfluss beseitigen | `ao-anlage` |  |
| `PA-8` | Übergabe und Übergabeprotokoll | 6 | Maschine oder Anlage übergeben; Über Produktionsprozess, Produktionsstand und Veränderungen informieren; Übergabe dokumentieren, Schichtübergabe | `ao-anlage`, `ao-p9` |  |

### LF8 · Steuerungstechnische Systeme für die Be- und Verarbeitung von Polymeren anwenden und prüfen

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 8 (60 Std., `rlp-kuk`)
- AO-Berufsbild: Anlage II.A Nr. 4 → Steuerungs- und Regelungstechnik; Anlage II.A Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-d, PP-d, PRAK-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF8-1` | Verknüpfungs- und Ablaufsteuerung; Logikplan, Ablaufplan nach Norm | 14 | Verknüpfungssteuerung; Ablaufsteuerung; Logikplan und Ablaufplan | `rlp-kuk` |  |
| `LF8-2` | Pneumatische und elektrische Signalarten; pneumatische Leistungsteile | 12 | Signalarten; Pneumatische Leistungsteile | `rlp-kuk` |  |
| `LF8-3` | Hydraulische Systeme, Druckübersetzer, hydraulische Presse, Volumenstrom | 14 | Hydraulische Systeme; Druckübersetzer; Volumenstrom berechnen | `rlp-kuk` | rechnen |
| `LF8-4` | Schalt- und Stromlaufplan lesen | 10 | Schaltplan; Stromlaufplan | `rlp-kuk` |  |
| `LF8-5` | Steuerungen prüfen und sicher in Betrieb nehmen | 10 | Funktionsprüfung; Inbetriebnahme unter Sicherheitsvorschriften | `rlp-kuk`, `ao-anlage` | Sicherheit |

### QS · Qualitätssichernde Maßnahmen

- Jahr 2 · ao-kern · 20 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 14 → Durchführen von qualitätssichernden Maßnahmen; Anlage II.A Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
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
- AO-Berufsbild: Anlage II.A Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.A Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PT-a, PT-b, PT-c, PT-d, PT-e, PT-f
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt A. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPT-1` | Fälle zu technische Unterlagen, Werkstoffe, Werkzeuge | 18 | Praxisbezogene Fälle: technische Unterlagen; Praxisbezogene Fälle: Werkstoffe; Praxisbezogene Fälle: Werkzeuge | `ao-p9` |  |
| `APPT-2` | Fälle zu Funktion von Maschinen und Anlagen, Prüfverfahren und Prüfmittel, Fertigungstechniken | 18 | Praxisbezogene Fälle: Funktion von Maschinen und Anlagen; Praxisbezogene Fälle: Prüfverfahren und Prüfmittel; Praxisbezogene Fälle: Fertigungstechniken | `ao-p9` |  |
| `APPT-3` | Prüfungsformat und Zeitplanung | 4 | 120 Minuten, 50 Prozent Gewicht; Praxisbezogene Fälle lesen und strukturieren | `ao-p9` |  |

### APPP · Abschlussprüfung: Training Produktionsplanung (§ 9)

- Jahr 2 · pruefung · 30 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.A Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen; Anlage II.A Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.A Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-a, PP-b, PP-c, PP-d, PP-e
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt A. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPP-1` | Fälle zu Arbeitsschritte, Qualitätssicherung | 12 | Praxisbezogene Fälle: Arbeitsschritte; Praxisbezogene Fälle: Qualitätssicherung | `ao-p9`, `ao-anlage` |  |
| `APPP-2` | Fälle zu vorbeugende Instandhaltung, Produktionsanlagen, Übergabeprotokoll | 12 | Praxisbezogene Fälle: vorbeugende Instandhaltung; Praxisbezogene Fälle: Produktionsanlagen; Praxisbezogene Fälle: Übergabeprotokoll | `ao-p9`, `ao-anlage` |  |
| `APPP-3` | Prüfungsformat und Zeitplanung | 6 | 60 Minuten, 30 Prozent Gewicht; Planungsunterlagen und Protokolle lesen | `ao-p9` |  |

## 8. Erzeugungsphasen

Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md).

| Phase | Module | Einheiten | Warum |
| --- | --- | --- | --- |
| A | `M0`, `LF1`, `LF2`, `PA` | 280 | Werkstoffe, Bauelemente fertigen, Produktionsanlagen. |
| B | `LF3`, `LF4`, `ZP`, `QS` | 200 | Baugruppen, Steuerungstechnik, Zwischenprüfungs-Training, Qualitätssicherung. |
| C | `LF5`, `LF7`, `LF6` | 220 | Polymerverarbeitung vorbereiten, Werkstoffprüfung, Instandhaltung. |
| D | `LF8`, `WISO`, `APPT`, `APPP` | 170 | Steuerungstechnische Systeme, WiSo und beide schriftlichen Prüfungstrainings. |
| | **Summe** | **870** | |

## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)

1. Referenz-Rahmenlehrplan ist Kunststoff- und Kautschuktechnologe/-technologin (LF 1–8); der RLP hat im 3. Jahr Fachrichtungen, die hier nicht vorkommen.
2. Einheiten-Budget: 1 Einheit je Unterrichtsstunde des RLP; übrige Module wie maf-metall.
3. Anlage II.A und Prüfungsgebiete § 9 Abs. 3 Nr. 1 gelten für Metall und Kunststoff gemeinsam.

