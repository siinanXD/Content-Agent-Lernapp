# Curriculum-Map: Maschinen- und Anlagenführer/in – Schwerpunkt Lebensmitteltechnik (Referenz Fachkraft für Lebensmitteltechnik)

Stand: 2026-10-03 · Status: **Entwurf – Freigabe durch Sinan offen** · Familie: `maf` · Map-ID: `maf-lebensmittel` · Maschinenlesbar: [`maf-lebensmittel.json`](maf-lebensmittel.json) · Vorgaben für die Agenten: [README](README.md)

> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.

## 1. Beruf, Dauer, Variante

- **Beruf:** Maschinen- und Anlagenführer
- **Variante:** Schwerpunkt Lebensmitteltechnik, Referenz-RLP Fachkraft für Lebensmitteltechnik (Lernfelder 1–9)
- **Dauer:** 2 Jahre. § 2 MaschFüAusbV: Die Ausbildung dauert zwei Jahre. Ein drittes und viertes Jahr gibt es nur als Fortsetzung in einem anderen Beruf nach § 10. Das ist nicht Teil dieses Kurses.
- **Referenz-Rahmenlehrplan:** `rlp-fklmt`. Der KMK-RLP MAF nennt für Lebensmitteltechnik drei Fortsetzungsberufe. Referenz ist die Fachkraft für Lebensmitteltechnik (1999), weil sie branchenübergreifend ist und Lernfelder hat; Lernfelder 1–9 (280 + 280 Std.) bilden die schulische Achse.
- **Alternativen:** Brauer und Mälzer / Brauerin und Mälzerin (KMK 18.12.2020) für Brauereien; Fachkraft für Fruchtsafttechnik (KMK 09.08.1984, ohne Lernfelder)

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
| `rlp-fklmt` | [KMK Rahmenlehrplan Fachkraft für Lebensmitteltechnik (Beschluss 10.12.1999) – Lernfelder 1–9 als Referenz](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/FKLmt.pdf) | rahmenlehrplan | 2026-10-03 |

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

**Anlage II.D – Berufliche Fachbildung, 2. Ausbildungsjahr, Schwerpunkt Lebensmitteltechnik** (Quelle `ao-anlage`)

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
| 1 | Lebensmittelinhaltsstoffe untersuchen | 1 | 80 | `LF1` |
| 2 | Lebensmittel und Materialien lagern | 1 | 80 | `LF2` |
| 3 | Lebensmittel vorbehandeln | 1 | 60 | `LF3` |
| 4 | Lebensmittel verpacken | 1 | 60 | `LF4` |
| 5 | Produktionsanlagen reinigen, pflegen und warten | 2 | 80 | `LF5` |
| 6 | Lebensmittelqualität prüfen und sicherstellen | 2 | 40 | `LF6` |
| 7 | Verpackungsprozesse steuern und kontrollieren | 2 | 40 | `LF7` |
| 8 | Lebensmittel konservieren | 2 | 60 | `LF8` |
| 9 | Getränke herstellen | 2 | 60 | `LF9` |
| | **Summe je Jahr** | | **J1: 280 · J2: 280** | |

## 5. Prüfungen und Zuordnung der Gebiete

Zwischenprüfung zu Beginn des 2. Ausbildungsjahres (§ 8). Abschlussprüfung (§ 9): praktischer Teil (höchstens 7 Stunden, bis zu 2 Aufgaben) und schriftlicher Teil mit Produktionstechnik 50 %, Produktionsplanung 30 %, Wirtschafts- und Sozialkunde 20 %. Gebiete laut § 9 Abs. 3 für diesen Schwerpunkt.

| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlussprüfung | Praktischer Teil (§ 9 Abs. 2) | praktisch | höchstens 7 Stunden, bis zu 2 Aufgaben | – | PRAK-1: Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-2: Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-3: Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme | `LF5`, `LF7`, `PA` |
| Abschlussprüfung schriftlich | Produktionstechnik | schriftlich | 120 Minuten | 50 % | PT-a: Roh-, Zusatz- und Hilfsstoffe sowie Halbfabrikate; PT-b: Funktion von Maschinen und Anlagen; PT-c: Zerkleinerungs-, Trenn- und Sortierverfahren; PT-d: Abfüllen, Etikettieren und Verpacken; PT-e: Kochen, Mischen und Haltbarmachen; PT-f: lebensmittelrechtliche Bestimmungen und Hygienevorschriften; PT-g: Fertigungstechniken | `LF1`, `LF2`, `LF3`, `LF4`, `LF5`, `LF6`, `LF7`, `PA`, `LF8`, `LF9`, `APPT` |
| Abschlussprüfung schriftlich | Produktionsplanung | schriftlich | 60 Minuten | 30 % | PP-a: Arbeitsschritte; PP-b: Qualitätssicherung; PP-c: vorbeugende Instandhaltung; PP-d: Materialfluss; PP-e: Maschinenbelegung | `LF2`, `LF3`, `LF5`, `LF6`, `LF7`, `PA`, `LF9`, `QS`, `APPP` |
| Abschlussprüfung schriftlich | Wirtschafts- und Sozialkunde | schriftlich | 60 Minuten | 20 % | WISO-1: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO` |

**Zwischenprüfung (§ 8):** zu Beginn des 2. Ausbildungsjahres; praktische Aufgabe höchstens 3 Stunden plus höchstens 60 Minuten schriftlich; Beispiel: Positionieren von Maschinenelementen; Stoff des 1. Ausbildungsjahres → `ZP`

Bestehen: Praktischer und schriftlicher Teil jeweils mindestens ausreichend; in zwei schriftlichen Prüfungsbereichen mindestens ausreichend, im dritten nicht ungenügend (§ 9 Abs. 7). Mündliche Ergänzungsprüfung möglich, Gewichtung 2:1 (§ 9 Abs. 5).

## 6. Module im Überblick

16 Module, **830 Einheiten** (bei 7.5 Minuten im Schnitt ≈ 103.8 Stunden Lernzeit; 4150–6640 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt | 1 | querschnitt | 60 | ja | WISO-1 |
| 1 | `LF1` | Lebensmittelinhaltsstoffe untersuchen | 1 | lernfeld | 80 | ja | PT-a, PT-f |
| 2 | `LF2` | Lebensmittel und Materialien lagern | 1 | lernfeld | 80 | nein | PT-a, PP-d |
| 3 | `LF3` | Lebensmittel vorbehandeln | 1 | lernfeld | 60 | ja | PT-c, PT-g, PT-b, PP-a |
| 4 | `LF4` | Lebensmittel verpacken | 1 | lernfeld | 60 | nein | PT-d, PT-f |
| 5 | `ZP` | Zwischenprüfung: Training (§ 8) | 1 | pruefung | 20 | ja | ZP |
| 6 | `LF5` | Produktionsanlagen reinigen, pflegen und warten | 2 | lernfeld | 80 | ja | PP-c, PT-b, PT-f, PRAK-3 |
| 7 | `LF6` | Lebensmittelqualität prüfen und sicherstellen | 2 | lernfeld | 40 | nein | PT-f, PP-b |
| 8 | `LF7` | Verpackungsprozesse steuern und kontrollieren | 2 | lernfeld | 40 | ja | PT-d, PT-b, PP-d, PRAK-1 |
| 9 | `PA` | Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern) | 2 | ao-kern | 60 | ja | PT-b, PP-a, PP-d, PP-e, PRAK-1, PRAK-2 |
| 10 | `LF8` | Lebensmittel konservieren | 2 | lernfeld | 60 | ja | PT-e, PT-g |
| 11 | `LF9` | Getränke herstellen | 2 | lernfeld | 60 | ja | PT-d, PT-e, PT-g, PP-e |
| 12 | `QS` | Qualitätssichernde Maßnahmen | 2 | ao-kern | 20 | nein | PP-b |
| 13 | `WISO` | Wirtschafts- und Sozialkunde | 2 | wiso | 40 | nein | WISO-1 |
| 14 | `APPT` | Abschlussprüfung: Training Produktionstechnik (§ 9) | 2 | pruefung | 40 | nein | PT-a, PT-b, PT-c, PT-d, PT-e, PT-f, PT-g |
| 15 | `APPP` | Abschlussprüfung: Training Produktionsplanung (§ 9) | 2 | pruefung | 30 | nein | PP-a, PP-b, PP-c, PP-d, PP-e |
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

### LF1 · Lebensmittelinhaltsstoffe untersuchen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 1 (80 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 8 → Prüfen; Anlage I Nr. 14 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PT-a, PT-f
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF1-1` | Chemischer Aufbau und Reaktionen der Inhaltsstoffe | 18 | Kohlenhydrate, Fette, Eiweiße; Reaktionen bei der Verarbeitung | `rlp-fklmt` |  |
| `LF1-2` | Technologische Eigenschaften | 12 | Eigenschaften für die Verarbeitung ableiten; Versuche auswerten | `rlp-fklmt` |  |
| `LF1-3` | Ernährungsphysiologie und Nährwerte | 16 | Ernährungsphysiologische Bewertung; Nährwerte berechnen; Regeln gesunder Ernährung | `rlp-fklmt` | rechnen |
| `LF1-4` | Qualitätsmanagement: Aufbau, Lebensmittelrecht, Zertifizierung | 16 | Innerbetrieblicher Aufbau des QM; Lebensmittelrechtliche Bestimmungen; Zertifizierung | `rlp-fklmt`, `ao-anlage` |  |
| `LF1-5` | Arbeitssicherheit im Labor | 10 | Umgang mit Chemikalien; Laboreinrichtungen sicher nutzen | `rlp-fklmt`, `ao-anlage` | Sicherheit |
| `LF1-6` | EDV und Dokumentation | 8 | Ergebnisse digital erfassen; Dokumentieren | `rlp-fklmt` |  |

### LF2 · Lebensmittel und Materialien lagern

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 2 (80 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage I Nr. 12 → Steuern des Materialflusses; Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit
- Prüfungsgebiete: PT-a, PP-d
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF2-1` | Lagerbedingungen, Hygiene, Warenverderb | 18 | Lagerbedingungen für Lebensmittel und Materialien; Hygiene; Warenverderb | `rlp-fklmt`, `ao-anlage` |  |
| `LF2-2` | Physikalische, chemische, biochemische Veränderungen | 14 | Veränderungen bei der Lagerung; Einflussfaktoren | `rlp-fklmt` |  |
| `LF2-3` | Schädlingsbekämpfung | 8 | Schädlinge erkennen; Bekämpfung und Vorbeugung | `rlp-fklmt` |  |
| `LF2-4` | Lager- und Fördertechnik | 16 | Lagertechnik; Fördertechnik; Einsatzmöglichkeiten bewerten | `rlp-fklmt`, `ao-anlage` |  |
| `LF2-5` | Materialverwaltung, Bestandskontrollen, Inventur | 12 | Bestände verwalten; Bestandskontrolle; Inventur | `rlp-fklmt` |  |
| `LF2-6` | Berechnungen zur Lagerhaltung | 12 | Lagerkennzahlen; Mengen und Kapazitäten | `rlp-fklmt` | rechnen |

### LF3 · Lebensmittel vorbehandeln

- Jahr 1 · lernfeld · 60 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 3 (60 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen
- Prüfungsgebiete: PT-c, PT-g, PT-b, PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF3-1` | Stoffveränderungen bei der Vorbehandlung | 8 | Stoffveränderungen; Bewertung | `rlp-fklmt` |  |
| `LF3-2` | Anordnung von Produktionsanlagen, Organisation, Fließbilder | 12 | Anordnung von Anlagen; Organisation der Produktion; Fließbilder lesen | `rlp-fklmt`, `ao-anlage` |  |
| `LF3-3` | Reinigungs-, Schäl-, Zerkleinerungsverfahren und -maschinen | 12 | Reinigen; Schälen; Zerkleinern | `rlp-fklmt` |  |
| `LF3-4` | Trenn- und Mischverfahren | 8 | Trennverfahren; Mischverfahren | `rlp-fklmt` |  |
| `LF3-5` | Thermische Behandlungsverfahren | 8 | Erhitzen, Kühlen; Wirkung auf das Lebensmittel | `rlp-fklmt` |  |
| `LF3-6` | Messtechnik und Berechnungen | 8 | Messverfahren; Themenbezogene Berechnungen | `rlp-fklmt` | rechnen |
| `LF3-7` | Arbeitssicherheit und Hygiene an Maschinen | 4 | Arbeitsschutz an Maschinen; Hygienevorschriften | `rlp-fklmt`, `ao-anlage` | Sicherheit |

### LF4 · Lebensmittel verpacken

- Jahr 1 · lernfeld · 60 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 4 (60 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 4 → Umweltschutz; Anlage I Nr. 6 → Betriebliche und technische Kommunikation
- Prüfungsgebiete: PT-d, PT-f
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF4-1` | Funktionen und Anforderungen einer Verpackung | 14 | Funktionen; Produktspezifische Anforderungen | `rlp-fklmt` |  |
| `LF4-2` | Verpackungsmaterialien | 12 | Materialien; Auswahl nach Produkt | `rlp-fklmt` |  |
| `LF4-3` | Rechtliche Bestimmungen und Kennzeichnung | 12 | Kennzeichnungspflichten; Rechtliche Bestimmungen | `rlp-fklmt` |  |
| `LF4-4` | Verpackungsanlagen und Ablauf | 12 | Verpackungsanlagen; Ablauf von Verpackungsprozessen | `rlp-fklmt`, `ao-anlage` |  |
| `LF4-5` | Umweltschutz und Berechnungen | 10 | Ökologische und ökonomische Gesichtspunkte; Berechnungen | `rlp-fklmt`, `ao-anlage` | rechnen |

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

### LF5 · Produktionsanlagen reinigen, pflegen und warten

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 5 (80 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage II.D Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.D Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.D Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PP-c, PT-b, PT-f, PRAK-3
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF5-1` | Reinigungs- und Desinfektionsmittel | 16 | Mittel und Wirkung; Einsatz nach Plan | `rlp-fklmt`, `ao-anlage` |  |
| `LF5-2` | Werkstoffe und Schmierstoffe | 12 | Werkstoffe in Lebensmittelanlagen; Schmierstoffe | `rlp-fklmt` |  |
| `LF5-3` | Maschinenelemente und Baugruppen | 16 | Maschinenelemente; Baugruppen von Anlagen | `rlp-fklmt` |  |
| `LF5-4` | Wartungs- und Schmierpläne, Fließbilder | 16 | Wartungspläne; Schmierpläne; Fließbilder erstellen und lesen | `rlp-fklmt`, `ao-anlage` |  |
| `LF5-5` | Arbeitssicherheit und Umweltschutz beim Reinigen | 12 | Umgang mit Reinigungs- und Desinfektionsmitteln; Umweltschutz | `rlp-fklmt`, `ao-anlage` | Sicherheit |
| `LF5-6` | Berechnungen | 8 | Dosierungen; Konzentrationen | `rlp-fklmt` | rechnen |

### LF6 · Lebensmittelqualität prüfen und sicherstellen

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 6 (40 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage II.D Nr. 8 → Durchführen von qualitätssichernden Maßnahmen; Anlage I Nr. 8 → Prüfen
- Prüfungsgebiete: PT-f, PP-b
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF6-1` | Rechtliche Bestimmungen, amtliche Lebensmittelüberwachung | 10 | Rechtliche Vorgaben; Amtliche Überwachung | `rlp-fklmt` |  |
| `LF6-2` | Sensorische und physikalische Untersuchungen | 10 | Sensorik; Physikalische Prüfungen | `rlp-fklmt` |  |
| `LF6-3` | Chemische und mikrobiologische Untersuchungen | 12 | Chemische Analytik; Mikrobiologie | `rlp-fklmt` |  |
| `LF6-4` | Dokumentation, Auswertung, Berechnungen | 8 | Ergebnisse dokumentieren; Auswerten | `rlp-fklmt` | rechnen |

### LF7 · Verpackungsprozesse steuern und kontrollieren

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 7 (40 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage II.D Nr. 4 → Steuerungs- und Regelungstechnik; Anlage II.D Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-d, PT-b, PP-d, PRAK-1
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF7-1` | Elektrizitätslehre und Gefahren des elektrischen Stroms | 12 | Grundgrößen; Gefahren des elektrischen Stroms | `rlp-fklmt`, `ao-anlage` | rechnen, Sicherheit |
| `LF7-2` | MSR-Technik in Verpackungsprozessen | 10 | Messen, Steuern, Regeln; Regelkreise für Temperatur, Druck, Geschwindigkeit | `rlp-fklmt`, `ao-anlage` |  |
| `LF7-3` | Verpackungsprozesse und Verschlusskontrollen | 10 | Prozesse vergleichen; Verschlusskontrollen | `rlp-fklmt` |  |
| `LF7-4` | Qualitätsmanagement und Dokumentation | 8 | QM-Vorgaben; Dokumentation | `rlp-fklmt` |  |

### PA · Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern)

- Jahr 2 · ao-kern · 60 Einheiten · Niveau: Fachbildung (Niveau praktische und schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 12 → Steuern des Materialflusses; Anlage II.D Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.D Nr. 6 → Steuern des Materialflusses
- Prüfungsgebiete: PT-b, PP-a, PP-d, PP-e, PRAK-1, PRAK-2
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Berufskern laut Anlage II.D Nr. 5 und Nr. 6. Der Referenz-Rahmenlehrplan deckt das nicht 1:1 ab, darum eigenes Modul direkt aus der Ausbildungsordnung. Deckt auch die praktischen Prüfungsaufgaben nach § 9 Abs. 2.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `PA-1` | Anlagentypen der Lebensmittelproduktion | 8 | Koch- und Mischanlagen; Abfülllinien, Sterilisationsanlagen; Etikettier-, Pack- und Palettieranlagen | `ao-anlage` |  |
| `PA-2` | Rüsten und Umrüsten, Prozessdaten einstellen und optimieren | 10 | Rüsten und Umrüsten nach Vorgaben; Prozessdaten einstellen und optimieren; Rüstzeit berechnen | `ao-anlage`, `ao-p9` | rechnen |
| `PA-3` | Inbetriebnahme unter Sicherheitsbestimmungen | 6 | Inbetriebnahme Schritt für Schritt; Schutzeinrichtungen prüfen | `ao-anlage`, `ao-p9` | Sicherheit |
| `PA-4` | Produktionsprozesse nach Verfahrensparametern überwachen | 6 | Parameter überwachen; Abweichungen erkennen | `ao-anlage` |  |
| `PA-5` | Störungen und Abweichungen: erkennen, Ursachen, beseitigen | 6 | Störungen feststellen; Ursachen eingrenzen; Beseitigen oder veranlassen | `ao-anlage` |  |
| `PA-6` | Reinigen und Pflegen von Geräten, Maschinen, Anlagen und Mehrwegverpackungen | 8 | Reinigungs- und Pflegepläne; Mehrwegverpackungen reinigen | `ao-anlage` |  |
| `PA-7` | Lebensmittelrecht und Hygiene im Fertigungsprozess | 6 | Lebensmittelrechtliche Bestimmungen anwenden; Hygienevorschriften beachten | `ao-anlage`, `ao-p9` | Sicherheit |
| `PA-8` | Materialfluss im Arbeitsbereich | 4 | Materialfluss überwachen und sicherstellen; Störungen im Materialfluss beseitigen | `ao-anlage` |  |
| `PA-9` | Übergabe und Dokumentation | 6 | Maschine oder Anlage übergeben; Produktionsstand und Veränderungen dokumentieren | `ao-anlage`, `ao-p9` |  |

### LF8 · Lebensmittel konservieren

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 8 (60 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage II.D Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.D Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-e, PT-g
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF8-1` | Physikalische Konservierungsverfahren | 14 | Erhitzen, Kühlen, Gefrieren, Trocknen; Wirkung auf Qualität und Lagerfähigkeit | `rlp-fklmt` |  |
| `LF8-2` | Chemische und biochemische Verfahren | 14 | Konservierungsstoffe; Fermentation | `rlp-fklmt` |  |
| `LF8-3` | Anlagen und Energieversorgung | 12 | Aufbau und Funktion der Anlagen; Energieversorgung | `rlp-fklmt`, `ao-anlage` |  |
| `LF8-4` | Hygiene und Arbeitssicherheit | 10 | Hygiene; Arbeitssicherheit | `rlp-fklmt`, `ao-anlage` | Sicherheit |
| `LF8-5` | Berechnungen | 10 | Haltbarkeit; Mengen und Energie | `rlp-fklmt` | rechnen |

### LF9 · Getränke herstellen

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 9 (60 Std., `rlp-fklmt`)
- AO-Berufsbild: Anlage II.D Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.D Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.D Nr. 4 → Steuerungs- und Regelungstechnik
- Prüfungsgebiete: PT-d, PT-e, PT-g, PP-e
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF9-1` | Herstellung und Abfüllung von Getränken | 16 | Alkoholfreie, alkoholische, alkaloidhaltige Getränke; Abfüllen | `rlp-fklmt` |  |
| `LF9-2` | Lebensmittelrecht, Zusatzstoffe, Light-Produkte | 10 | Rechtliche Bestimmungen; Zusatzstoffe; Light-Produkte | `rlp-fklmt` |  |
| `LF9-3` | Verfahrenstechnik, Druckbehälter, MSR-Technik | 14 | Verfahrenstechnik; Druckbehälter sicher betreiben; MSR-Technik | `rlp-fklmt`, `ao-anlage` | Sicherheit |
| `LF9-4` | Entsorgungstechnik, Fließbilder, Qualitätsmanagement | 10 | Entsorgung; Fließbilder; QM | `rlp-fklmt` |  |
| `LF9-5` | Berechnungen | 10 | Mischungen; Ausbeute | `rlp-fklmt` | rechnen |

### QS · Qualitätssichernde Maßnahmen

- Jahr 2 · ao-kern · 20 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage I Nr. 14 → Durchführen von qualitätssichernden Maßnahmen; Anlage II.D Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
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
- AO-Berufsbild: Anlage II.D Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.D Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PT-a, PT-b, PT-c, PT-d, PT-e, PT-f, PT-g
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt D. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPT-1` | Fälle zu Roh-, Zusatz- und Hilfsstoffe sowie Halbfabrikate, Funktion von Maschinen und Anlagen, Zerkleinerungs-, Trenn- und Sortierverfahren, Abfüllen, Etikettieren und Verpacken | 18 | Praxisbezogene Fälle: Roh-, Zusatz- und Hilfsstoffe sowie Halbfabrikate; Praxisbezogene Fälle: Funktion von Maschinen und Anlagen; Praxisbezogene Fälle: Zerkleinerungs-, Trenn- und Sortierverfahren; Praxisbezogene Fälle: Abfüllen, Etikettieren und Verpacken | `ao-p9` |  |
| `APPT-2` | Fälle zu Kochen, Mischen und Haltbarmachen, lebensmittelrechtliche Bestimmungen und Hygienevorschriften, Fertigungstechniken | 18 | Praxisbezogene Fälle: Kochen, Mischen und Haltbarmachen; Praxisbezogene Fälle: lebensmittelrechtliche Bestimmungen und Hygienevorschriften; Praxisbezogene Fälle: Fertigungstechniken | `ao-p9` |  |
| `APPT-3` | Prüfungsformat und Zeitplanung | 4 | 120 Minuten, 50 Prozent Gewicht; Praxisbezogene Fälle lesen und strukturieren | `ao-p9` |  |

### APPP · Abschlussprüfung: Training Produktionsplanung (§ 9)

- Jahr 2 · pruefung · 30 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.D Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen; Anlage II.D Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.D Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.D Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-a, PP-b, PP-c, PP-d, PP-e
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 für Schwerpunkt D. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPP-1` | Fälle zu Arbeitsschritte, Qualitätssicherung | 12 | Praxisbezogene Fälle: Arbeitsschritte; Praxisbezogene Fälle: Qualitätssicherung | `ao-p9`, `ao-anlage` |  |
| `APPP-2` | Fälle zu vorbeugende Instandhaltung, Materialfluss, Maschinenbelegung | 12 | Praxisbezogene Fälle: vorbeugende Instandhaltung; Praxisbezogene Fälle: Materialfluss; Praxisbezogene Fälle: Maschinenbelegung | `ao-p9`, `ao-anlage` |  |
| `APPP-3` | Prüfungsformat und Zeitplanung | 6 | 60 Minuten, 30 Prozent Gewicht; Planungsunterlagen und Protokolle lesen | `ao-p9` |  |

## 8. Erzeugungsphasen

Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md).

| Phase | Module | Einheiten | Warum |
| --- | --- | --- | --- |
| A | `M0`, `LF1`, `LF2`, `PA` | 280 | Inhaltsstoffe, Lagern, Produktionsanlagen. |
| B | `LF3`, `LF4`, `ZP`, `QS` | 160 | Vorbehandeln, Verpacken, Zwischenprüfungs-Training, Qualitätssicherung. |
| C | `LF5`, `LF6`, `LF7` | 160 | Reinigen und Warten, Qualität prüfen, Verpackungsprozesse steuern. |
| D | `LF8`, `LF9`, `WISO`, `APPT`, `APPP` | 230 | Konservieren, Getränke, WiSo und beide schriftlichen Prüfungstrainings. |
| | **Summe** | **830** | |

## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)

1. Referenz-Rahmenlehrplan ist Fachkraft für Lebensmitteltechnik; Brauereien brauchen später eine Variante mit RLP Brauer und Mälzer.
2. Einheiten-Budget: 1 Einheit je Unterrichtsstunde des RLP; übrige Module wie maf-metall.
3. Anlage II.D: Nr. 1–2 zusammen 10 Wochen, Nr. 3–4 zusammen 16 Wochen (Klammern der Verordnung).

