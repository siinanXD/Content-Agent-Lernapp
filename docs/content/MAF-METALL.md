# Curriculum-Map: Maschinen- und Anlagenführer/in – Schwerpunkt Metall- und Kunststofftechnik (Referenz Industriemechaniker)

Stand: 2026-10-03 · Status: **Entwurf – Freigabe durch Sinan offen** · Familie: `maf` · Map-ID: `maf-metall` · Maschinenlesbar: [`maf-metall.json`](maf-metall.json) · Vorgaben für die Agenten: [README](README.md)

> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.

## 1. Beruf, Dauer, Variante

- **Beruf:** Maschinen- und Anlagenführer
- **Variante:** Schwerpunkt Metall- und Kunststofftechnik, Referenz-RLP Industriemechaniker/in (Metallbetriebe)
- **Dauer:** 2 Jahre. § 2 MaschFüAusbV: Die Ausbildung dauert zwei Jahre. Ein drittes und viertes Jahr gibt es nur als Fortsetzung in einem anderen Beruf nach § 10. Das ist nicht Teil dieses Kurses.
- **Referenz-Rahmenlehrplan:** `rlp-im`. Der KMK-RLP MAF hat keine eigenen Lernfelder; er verweist für den Schwerpunkt Metall/Kunststoff auf die ersten zwei Jahre der RLP der Fortsetzungsberufe. Referenz für Metallbetriebe: Industriemechaniker/in, weil LF 1–4 laut RLP für alle Metallberufe inhaltsgleich sind und der Beruf die häufigste Fortsetzung ist.
- **Alternativen:** Zerspanungsmechaniker/in; Werkzeugmechaniker/in; Feinwerkmechaniker/in; Fertigungsmechaniker/in; Kunststoffbetriebe: Map maf-kunststoff

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
| `rlp-im` | [KMK Rahmenlehrplan Industriemechaniker/in (Beschluss 25.03.2004 i. d. F. 23.02.2018) – Lernfelder 1–9 als Referenz für Metall](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf) | rahmenlehrplan | 2026-10-03 |

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
| 1 | Fertigen von Bauelementen mit handgeführten Werkzeugen | 1 | 80 | `LF1` |
| 2 | Fertigen von Bauelementen mit Maschinen | 1 | 80 | `LF2` |
| 3 | Herstellen von einfachen Baugruppen | 1 | 80 | `LF3` |
| 4 | Warten technischer Systeme | 1 | 80 | `LF4` |
| 5 | Fertigen von Einzelteilen mit Werkzeugmaschinen | 2 | 80 | `LF5` |
| 7 | Montieren von technischen Teilsystemen | 2 | 40 | `LF7` |
| 6 | Installieren und Inbetriebnehmen steuerungstechnischer Systeme | 2 | 60 | `LF6` |
| 8 | Fertigen auf numerisch gesteuerten Werkzeugmaschinen | 2 | 60 | `LF8` |
| 9 | Instandsetzen von technischen Systemen | 2 | 40 | `LF9` |
| | **Summe je Jahr** | | **J1: 320 · J2: 280** | |

## 5. Prüfungen und Zuordnung der Gebiete

Zwischenprüfung zu Beginn des 2. Ausbildungsjahres (§ 8). Abschlussprüfung (§ 9): praktischer Teil (höchstens 7 Stunden, bis zu 2 Aufgaben) und schriftlicher Teil mit Produktionstechnik 50 %, Produktionsplanung 30 %, Wirtschafts- und Sozialkunde 20 %. Gebiete laut § 9 Abs. 3 für diesen Schwerpunkt.

| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlussprüfung | Praktischer Teil (§ 9 Abs. 2) | praktisch | höchstens 7 Stunden, bis zu 2 Aufgaben | – | PRAK-1: Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-2: Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; PRAK-3: Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme | `LF6`, `PA`, `LF9` |
| Abschlussprüfung schriftlich | Produktionstechnik | schriftlich | 120 Minuten | 50 % | PT-a: technische Unterlagen; PT-b: Werkstoffe; PT-c: Werkzeuge; PT-d: Funktion von Maschinen und Anlagen; PT-e: Prüfverfahren und Prüfmittel; PT-f: Fertigungstechniken | `LF1`, `LF2`, `LF3`, `LF4`, `LF5`, `LF7`, `LF6`, `PA`, `LF8`, `APPT` |
| Abschlussprüfung schriftlich | Produktionsplanung | schriftlich | 60 Minuten | 30 % | PP-a: Arbeitsschritte; PP-b: Qualitätssicherung; PP-c: vorbeugende Instandhaltung; PP-d: Produktionsanlagen; PP-e: Übergabeprotokoll | `LF1`, `LF3`, `LF4`, `LF5`, `LF7`, `LF6`, `PA`, `LF8`, `LF9`, `QS`, `APPP` |
| Abschlussprüfung schriftlich | Wirtschafts- und Sozialkunde | schriftlich | 60 Minuten | 20 % | WISO-1: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO`, `SBP` |

**Zwischenprüfung (§ 8):** zu Beginn des 2. Ausbildungsjahres; praktische Aufgabe höchstens 3 Stunden plus höchstens 60 Minuten schriftlich; Beispiel: Positionieren von Maschinenelementen; Stoff des 1. Ausbildungsjahres → `ZP`

Bestehen: Praktischer und schriftlicher Teil jeweils mindestens ausreichend; in zwei schriftlichen Prüfungsbereichen mindestens ausreichend, im dritten nicht ungenügend (§ 9 Abs. 7). Mündliche Ergänzungsprüfung möglich, Gewichtung 2:1 (§ 9 Abs. 5).

## 6. Module im Überblick

17 Module, **890 Einheiten** (bei 7.5 Minuten im Schnitt ≈ 111.3 Stunden Lernzeit; 4450–7120 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt | 1 | querschnitt | 60 | ja | WISO-1 |
| 1 | `LF1` | Fertigen von Bauelementen mit handgeführten Werkzeugen | 1 | lernfeld | 80 | ja | PT-a, PT-b, PT-c, PT-e, PT-f, PP-a |
| 2 | `LF2` | Fertigen von Bauelementen mit Maschinen | 1 | lernfeld | 80 | nein | PT-a, PT-c, PT-d, PT-e, PT-f |
| 3 | `LF3` | Herstellen von einfachen Baugruppen | 1 | lernfeld | 80 | nein | PT-a, PT-c, PP-a |
| 4 | `LF4` | Warten technischer Systeme | 1 | lernfeld | 80 | ja | PT-d, PP-c |
| 5 | `ZP` | Zwischenprüfung: Training (§ 8) | 1 | pruefung | 20 | ja | ZP |
| 6 | `LF5` | Fertigen von Einzelteilen mit Werkzeugmaschinen | 2 | lernfeld | 80 | nein | PT-b, PT-c, PT-e, PT-f, PP-b |
| 7 | `LF7` | Montieren von technischen Teilsystemen | 2 | lernfeld | 40 | nein | PT-a, PP-a |
| 8 | `LF6` | Installieren und Inbetriebnehmen steuerungstechnischer Systeme | 2 | lernfeld | 60 | ja | PT-d, PP-d, PRAK-1 |
| 9 | `PA` | Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern) | 2 | ao-kern | 60 | ja | PT-d, PP-a, PP-d, PP-e, PRAK-1, PRAK-2 |
| 10 | `LF8` | Fertigen auf numerisch gesteuerten Werkzeugmaschinen | 2 | lernfeld | 60 | ja | PT-a, PT-e, PT-f, PP-b |
| 11 | `LF9` | Instandsetzen von technischen Systemen | 2 | lernfeld | 40 | ja | PP-c, PP-d, PRAK-3 |
| 12 | `QS` | Qualitätssichernde Maßnahmen | 2 | ao-kern | 20 | nein | PP-b |
| 13 | `WISO` | Wirtschafts- und Sozialkunde | 2 | wiso | 40 | nein | WISO-1 |
| 14 | `SBP` | Standardberufsbildpositionen 2021: Nachhaltigkeit und digitalisierte Arbeitswelt (Empfehlung) | 1 | querschnitt | 20 | nein | WISO-1 |
| 15 | `APPT` | Abschlussprüfung: Training Produktionstechnik (§ 9) | 2 | pruefung | 40 | nein | PT-a, PT-b, PT-c, PT-d, PT-e, PT-f |
| 16 | `APPP` | Abschlussprüfung: Training Produktionsplanung (§ 9) | 2 | pruefung | 30 | nein | PP-a, PP-b, PP-c, PP-d, PP-e |
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

### LF1 · Fertigen von Bauelementen mit handgeführten Werkzeugen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 1 (80 Std., `rlp-im`)
- AO-Berufsbild: Anlage I Nr. 5 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 6 → Betriebliche und technische Kommunikation; Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 8 → Prüfen; Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken
- Prüfungsgebiete: PT-a, PT-b, PT-c, PT-e, PT-f, PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF1-1` | Technische Zeichnungen lesen und skizzieren | 12 | Teilzeichnungen, Gruppen- und Montagezeichnungen; Ansichten, Schnitte, Bemaßung; Allgemeintoleranzen; Normen und Normschrift; Skizzen für Bauelemente erstellen | `rlp-im`, `ao-anlage` |  |
| `LF1-2` | Technische Unterlagen: Stücklisten, Arbeits- und Fertigungspläne | 8 | Stücklisten lesen und ergänzen; Arbeitspläne und Fertigungspläne; Funktionsbeschreibungen; Informationsquellen, auch digital | `rlp-im`, `ao-anlage` |  |
| `LF1-3` | Werkstoffe: Eisen- und Nichteisenmetalle, Kunststoffe | 12 | Einteilung der Werkstoffe; Eigenschaften metallischer Werkstoffe; Stahl und Gusseisen, Aluminium, Kupferlegierungen; Kunststoffe: Thermoplaste, Duroplaste, Elastomere; Werkstoffe nach Verwendungszweck unterscheiden | `rlp-im`, `ao-anlage` |  |
| `LF1-4` | Halbzeuge, Normteile, Hilfsstoffe | 6 | Halbzeuge: Profile, Bleche, Rohre; Normteile: Schrauben, Muttern, Stifte; Hilfsstoffe sicher auswählen und verwenden | `rlp-im`, `ao-anlage` |  |
| `LF1-5` | Bank- und Elektrowerkzeuge sicher einsetzen | 8 | Bankwerkzeuge: Feile, Säge, Schraubstock; Elektrowerkzeuge: Bohrmaschine, Winkelschleifer; Sichere Handhabung und Pflege | `rlp-im`, `ao-anlage` | Sicherheit |
| `LF1-6` | Trennen und Umformen von Hand | 14 | Grundlagen des Trennens: Sägen, Feilen, Bohren, Senken; Anreißen und Körnen; Gewindeschneiden von Hand; Grundlagen des Umformens: Biegen, Richten; Arbeitsschritte planen | `rlp-im`, `ao-anlage` |  |
| `LF1-7` | Prüfen: Messen, Lehren, Prüfprotokoll | 8 | Messen und Lehren unterscheiden; Messschieber, Stahlmaßstab, Winkel; Prüfmittel nach Verwendungszweck auswählen; Prüfprotokoll erstellen | `rlp-im`, `ao-anlage` |  |
| `LF1-8` | Berechnen: Masse, Stückzahl, Kosten | 8 | Masse von Bauteilen aus Volumen und Dichte; Stückzahl- und Materialbedarf; Material-, Lohn- und Werkzeugkosten überschlägig | `rlp-im` | rechnen |
| `LF1-9` | Dokumentieren und Präsentieren, Urheberrecht | 4 | Arbeitsergebnisse dokumentieren; Präsentationstechniken; Urheberrecht beachten | `rlp-im`, `ao-anlage` |  |

### LF2 · Fertigen von Bauelementen mit Maschinen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 2 (80 Std., `rlp-im`)
- AO-Berufsbild: Anlage I Nr. 8 → Prüfen; Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 11 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-a, PT-c, PT-d, PT-e, PT-f
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF2-1` | Zeichnungen und Informationsquellen, auch digital | 8 | Gruppenzeichnungen und Stücklisten auswerten; Teilzeichnungen und Arbeitspläne ändern, CAD-Grundlagen; Fertigungspläne, Funktionsbeschreibungen | `rlp-im` |  |
| `LF2-2` | ISO-Toleranzen und Oberflächenangaben | 10 | Toleranzen, Grenzmaße, Abmaße; ISO-Toleranzsystem und Passungen (Grundlagen); Oberflächenangaben lesen | `rlp-im` |  |
| `LF2-3` | Prüfmittel auswählen, Messfehler erkennen | 8 | Auswahlkriterien für Prüfmittel; Messschieber, Messschraube, Messuhr; Messfehler und ihre Ursachen | `rlp-im`, `ao-anlage` |  |
| `LF2-4` | Bohren, Senken, Reiben | 10 | Bohrerarten, Bohrmaschinen; Senken und Reiben: Zweck und Werkzeuge; Spannen von Werkstück und Werkzeug | `rlp-im` |  |
| `LF2-5` | Drehen und Fräsen: Verfahren, Werkzeuge, Maschinenaufbau | 14 | Drehverfahren und Drehwerkzeuge; Fräsverfahren und Fräswerkzeuge; Aufbau von Dreh- und Fräsmaschinen; Maschinen für den Einsatz vorbereiten | `rlp-im`, `ao-anlage` |  |
| `LF2-6` | Funktionseinheiten von Maschinen und ihre Wirkungsweise | 8 | Antrieb, Getriebe, Führung, Spannsystem; Produktionsmaschinen nach Funktion und Einsatz unterscheiden | `rlp-im`, `ao-anlage` |  |
| `LF2-7` | Fertigungsdaten berechnen | 10 | Schnittgeschwindigkeit und Drehzahl; Vorschub und Vorschubgeschwindigkeit; Schnitttiefe, Zeitspanungsvolumen (Grundlagen) | `rlp-im` | rechnen |
| `LF2-8` | Standzeiten, Kühl- und Schmiermittel | 6 | Standzeit von Werkzeugen; Kühlschmierstoffe: Aufgaben, Arten, Umgang | `rlp-im` |  |
| `LF2-9` | Qualitätsmanagement-Grundlagen und Fertigungskosten | 6 | Grundbegriffe des Qualitätsmanagements; Werkzeug- und Maschinenkosten, Materialverbrauch, Arbeitszeit | `rlp-im` | rechnen |

### LF3 · Herstellen von einfachen Baugruppen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 3 (80 Std., `rlp-im`)
- AO-Berufsbild: Anlage I Nr. 6 → Betriebliche und technische Kommunikation; Anlage I Nr. 7 → Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 9 → Branchenspezifische Fertigungstechniken; Anlage I Nr. 10 → Steuerungs- und Regelungstechnik
- Prüfungsgebiete: PT-a, PT-c, PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF3-1` | Gesamt- und Gruppenzeichnungen, Anordnungspläne, einfache Schaltpläne | 10 | Funktionszusammenhänge einer Baugruppe beschreiben; Anordnungspläne lesen; Einfache Schaltpläne lesen | `rlp-im` |  |
| `LF3-2` | Stücklisten, Montagepläne, Montageanleitungen | 8 | Stücklisten und Montagepläne erstellen; Montageanleitungen nutzen; Einzelteile normgerecht kennzeichnen | `rlp-im` |  |
| `LF3-3` | Fügen: kraft-, form- und stoffschlüssig | 16 | Wirkprinzipien des Fügens; Schraubenverbindungen, Sicherungselemente; Stift-, Bolzen- und Pressverbindungen; Kleben und Löten (Grundlagen); Fügeverfahren anwendungsbezogen zuordnen | `rlp-im`, `ao-anlage` |  |
| `LF3-4` | Normteile, Werkzeuge, Vorrichtungen, Zusatzstoffe | 8 | Normteile produktbezogen auswählen; Montagewerkzeuge und Vorrichtungen; Werk-, Hilfs- und Zusatzstoffe | `rlp-im` |  |
| `LF3-5` | Grundlagen der Steuerungstechnik | 10 | Steuern und Regeln unterscheiden; Einfache Steuerungen planen, Bauteile auswählen; Überwachungseinrichtungen nach Aufbau und Funktion | `rlp-im`, `ao-anlage` |  |
| `LF3-6` | Kraft und Drehmoment berechnen | 8 | Kräfte und Hebelgesetz; Drehmoment und Anzugsmoment; Einfache Festigkeitsüberlegungen | `rlp-im` | rechnen |
| `LF3-7` | Funktionsprüfung, Prüfpläne, Prüfprotokolle | 8 | Prüfkriterien für Funktionsprüfungen entwickeln; Prüfpläne und Prüfprotokolle; Qualitätsmängel beseitigen | `rlp-im` |  |
| `LF3-8` | Arbeitsorganisation, Montagekosten, Arbeiten im Team | 12 | Montagearbeiten organisieren; Arbeitsplanung und Reihenfolge; Montagekosten und Wirtschaftlichkeit; Fach- und englischsprachige Begriffe | `rlp-im`, `ao-anlage` |  |

### LF4 · Warten technischer Systeme

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 4 (80 Std., `rlp-im`)
- AO-Berufsbild: Anlage I Nr. 13 → Warten und Inspizieren von Maschinen und Anlagen; Anlage I Nr. 10 → Steuerungs- und Regelungstechnik; Anlage I Nr. 3 → Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → Umweltschutz
- Prüfungsgebiete: PT-d, PP-c
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF4-1` | Instandhaltung: Wartung, Inspektion, Instandsetzung, Verbesserung | 10 | Grundbegriffe der Instandhaltung; Bedeutung für Sicherheit, Verfügbarkeit, Wirtschaftlichkeit | `rlp-im`, `ao-anlage` |  |
| `LF4-2` | Wartungspläne, Anordnungspläne, Betriebsanleitungen | 8 | Wartungspläne lesen und anwenden; Betriebsanleitungen, auch in Englisch; Betriebsorganisation der Instandhaltung | `rlp-im` |  |
| `LF4-3` | Verschleiß- und Störungsursachen, Schadensanalyse | 10 | Verschleißarten und Ursachen; Störungsursachen erkennen; Schadensanalyse durchführen | `rlp-im` |  |
| `LF4-4` | Schmier- und Kühlschmierstoffe, Korrosionsschutz, Entsorgung | 10 | Schmierstoffe: Arten und Auswahl; Kühlschmierstoffe pflegen und entsorgen; Korrosion und Korrosionsschutzmittel | `rlp-im`, `ao-anlage` |  |
| `LF4-5` | Elektrischer Stromkreis: Größen, Ohmsches Gesetz | 12 | Spannung, Strom, Widerstand, Leistung; Ohmsches Gesetz anwenden; Elektrische Größen messen | `rlp-im` | rechnen |
| `LF4-6` | Gefahren des elektrischen Stroms, elektrische Sicherheit | 10 | Wirkung des Stroms auf den Menschen; Schutzmaßnahmen und Sicherheitsvorschriften für elektrische Betriebsmittel; Fünf Sicherheitsregeln | `rlp-im`, `ao-anlage` | Sicherheit |
| `LF4-7` | Steuerungstechnik: einfache Schaltpläne in Gerätetechniken | 8 | Grundlagen der Steuerungstechnik; Einfache Schaltpläne pneumatisch, hydraulisch, elektrisch erklären | `rlp-im` |  |
| `LF4-8` | Funktionsprüfung, Kosten, Normen, IT-Sicherheit | 12 | Funktionsprüfung nach Wartung; Instandhaltungs- und Ausfallkosten, Störungsfolgen; Normen und Verordnungen; IT-Sicherheit bei digitalen Wartungsunterlagen | `rlp-im` |  |

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

### LF5 · Fertigen von Einzelteilen mit Werkzeugmaschinen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 5 (80 Std., `rlp-im`)
- AO-Berufsbild: Anlage II.A Nr. 1 → Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage II.A Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.A Nr. 8 → Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PT-b, PT-c, PT-e, PT-f, PP-b
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF5-1` | Spanende Fertigungsverfahren im Überblick | 12 | Drehen, Fräsen, Bohren, Schleifen; Verfahren unter technologischen Aspekten auswählen; Einflüsse des Prozesses auf Maß, Form, Oberfläche | `rlp-im`, `ao-anlage` |  |
| `LF5-2` | Werkstoffnormung, Werkstoffeigenschaften und ihre Veränderung | 10 | Kurznamen und Werkstoffnummern; Eigenschaften beurteilen und Werkstoffe nach Verwendungszweck auswählen; Zerspanbarkeit | `rlp-im`, `ao-anlage` |  |
| `LF5-3` | Wärmebehandlung: Glühverfahren | 6 | Glühverfahren und ihr Zweck; Entscheidung: Stoffeigenschaften vor der Zerspanung ändern | `rlp-im` |  |
| `LF5-4` | Schneidstoffe und Schneidengeometrie | 8 | Schneidstoffe: HSS, Hartmetall, Keramik; Winkel an der Schneide; Werkzeug nach Verfahren und Werkstoff auswählen | `rlp-im`, `ao-anlage` |  |
| `LF5-5` | Bearbeitungsparameter und Technologiedaten festlegen | 10 | Schnittgeschwindigkeit, Drehzahl, Vorschub, Schnitttiefe; Technologiedaten ermitteln und einstellen; Herstellerunterlagen nutzen | `rlp-im`, `ao-anlage` | rechnen |
| `LF5-6` | Hauptnutzungszeit, Fertigungskosten, Wirtschaftlichkeit | 8 | Hauptnutzungszeit berechnen; Fertigungskosten ermitteln; Wirtschaftlichkeit von Verfahren vergleichen | `rlp-im` | rechnen |
| `LF5-7` | Spannmittel wählen, Maschine einrichten | 8 | Spannmittel für Werkstück und Werkzeug; Arbeitsplan für das Verfahren; Maschine zur Fertigung einrichten | `rlp-im`, `ao-anlage` |  |
| `LF5-8` | Kühlschmierstoffe und Hilfsstoffe einsetzen und entsorgen | 6 | Kühlschmierstoffe auswählen; Hilfsstoffe nach Vorschrift einsetzen und fachgerecht entsorgen | `rlp-im`, `ao-anlage` |  |
| `LF5-9` | Prüfplanung und Prüfmittelüberwachung | 12 | Prüfanweisungen erstellen; Prüfmittelauswahl und -überwachung; Attributive und variable Prüfmerkmale; Form- und Lagetoleranzen prüfen; Digitale Messgeräte, Prüfergebnisse sichern | `rlp-im` |  |

### LF7 · Montieren von technischen Teilsystemen

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 7 (40 Std., `rlp-im`)
- AO-Berufsbild: Anlage II.A Nr. 3 → Branchenspezifische Fertigungstechniken; Anlage II.A Nr. 2 → Planen und Vorbereiten von Arbeitsabläufen
- Prüfungsgebiete: PT-a, PP-a
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF7-1` | Funktionsanalyse und Montageplan | 8 | Funktionsanalyse mit Zeichnung, Anordnungsplan, Stückliste; Montagepläne erstellen und sichern | `rlp-im`, `ao-anlage` |  |
| `LF7-2` | Achsen, Wellen, Welle-Nabe-Verbindungen, Passungen | 10 | Achsen und Wellen; Welle-Nabe-Verbindungen; Passungsarten und Passungssysteme | `rlp-im` |  |
| `LF7-3` | Gleit- und Wälzlager, Führungen, Dichtungen | 10 | Gleitlager und Wälzlager; Führungen; Dichtungen | `rlp-im` |  |
| `LF7-4` | Reibung, Wärmedehnung, Flächenpressung, Festigkeit | 6 | Reibung und Schmierung; Wärmedehnung berechnen; Flächenpressung und Festigkeitskenngrößen | `rlp-im` | rechnen |
| `LF7-5` | Montage durchführen, Funktionskontrolle, Prüfprotokoll | 6 | Kennwerte ermitteln, Werkzeuge und Hilfsmittel wählen; Digitale Einstellgeräte; Funktionskontrolle und Prüfprotokoll | `rlp-im`, `ao-anlage` |  |

### LF6 · Installieren und Inbetriebnehmen steuerungstechnischer Systeme

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 6 (60 Std., `rlp-im`)
- AO-Berufsbild: Anlage II.A Nr. 4 → Steuerungs- und Regelungstechnik; Anlage II.A Nr. 5 → Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-d, PP-d, PRAK-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF6-1` | Technologieschema, Stoff-, Energie- und Informationsfluss | 8 | Technologieschema lesen; Stoff-, Energie- und Informationsfluss einer Anlage | `rlp-im` |  |
| `LF6-2` | Pneumatik: Versorgungseinheit, Druckmedien, Zylinder und Ventile | 12 | Druckluftversorgung und Wartungseinheit; Zylinder und Wegeventile; Pneumatische Schaltpläne | `rlp-im` |  |
| `LF6-3` | Hydraulik: Leistungsteile, Druck, Kraft, Volumenstrom | 12 | Hydraulische Leistungsteile; Druck, Kraft und Fläche; Volumenstrom und Geschwindigkeit | `rlp-im` | rechnen |
| `LF6-4` | Sensoren, Aktoren, Stromlaufpläne | 10 | Sensoren erkennen und zuordnen; Aktoren; Stromlaufpläne lesen, Herstellerunterlagen auch in Englisch | `rlp-im` |  |
| `LF6-5` | Steuern und Regeln, Betriebsarten | 8 | Steuerung und Regelung unterscheiden; Betriebsarten einer Steuerung; Steuerungs- und Regelungseinrichtungen sicher bedienen | `rlp-im`, `ao-anlage` |  |
| `LF6-6` | Inbetriebnahme, Fehlersuche, Anlagensicherheit | 10 | Inbetriebnahme unter Arbeitsschutz; Strategien zur Fehlersuche; Anlagensicherheit und Schutzeinrichtungen | `rlp-im`, `ao-anlage` | Sicherheit |

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

### LF8 · Fertigen auf numerisch gesteuerten Werkzeugmaschinen

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 8 (60 Std., `rlp-im`)
- AO-Berufsbild: Anlage II.A Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 3 → Branchenspezifische Fertigungstechniken
- Prüfungsgebiete: PT-a, PT-e, PT-f, PP-b
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF8-1` | Aufbau und Funktion von CNC-Maschinen, Arbeitsschutz | 8 | Aufbau und Achsen einer CNC-Maschine; Arbeitsschutz an CNC-Maschinen | `rlp-im` | Sicherheit |
| `LF8-2` | Koordinatensysteme, Bezugspunkte, Koordinatenbemaßung | 10 | Koordinatensysteme; Bezugspunkte: Maschinennullpunkt, Werkstücknullpunkt; Absolute und inkrementale Bemaßung | `rlp-im` | rechnen |
| `LF8-3` | Arbeitsplan, Werkzeugplan, Einrichteblatt | 8 | Arbeitsplan und Werkzeugplan; Einrichteblatt; Werkzeug-Management-Systeme | `rlp-im`, `ao-anlage` |  |
| `LF8-4` | Geometrie- und Technologiedaten, Programmaufbau, Werkzeugkorrekturen | 14 | Geometriedaten aus der Zeichnung; Technologiedaten festlegen; Programmaufbau; Werkzeugkorrekturen | `rlp-im`, `ao-anlage` |  |
| `LF8-5` | Grafisches Programmieren, Simulation, CAD/CAM | 10 | Grafische Programmierverfahren; Programm durch Simulation prüfen; CAD/CAM-Grundlagen | `rlp-im` |  |
| `LF8-6` | Prüfplanung in der Serie, Prozess optimieren | 10 | Attributive und variable Merkmalsprüfung; Prüfpläne für die Serienfertigung; Einfluss der Fertigungsparameter auf Maße, Oberfläche, Produktivität | `rlp-im` |  |

### LF9 · Instandsetzen von technischen Systemen

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 9 (40 Std., `rlp-im`)
- AO-Berufsbild: Anlage II.A Nr. 7 → Warten und Inspizieren von Maschinen und Anlagen; Anlage II.A Nr. 5 → Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 6 → Steuern des Materialflusses
- Prüfungsgebiete: PP-c, PP-d, PRAK-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF9-1` | Zustands- und ausfallbedingte Instandsetzung | 8 | Instandsetzungsstrategien; Abnutzungsvorrat und Verschleiß; Betriebliche und wirtschaftliche Forderungen | `rlp-im`, `ao-anlage` |  |
| `LF9-2` | Fehleranalyse mit Diagnosesystemen | 10 | Fehler analysieren und dokumentieren; Funktions- und Fehlerprotokolle interpretieren; Inspektionsberichte | `rlp-im` |  |
| `LF9-3` | Demontage- und Montagepläne, Ersatzteile | 8 | Teilsysteme fachgerecht demontieren; Ersatzteillisten, Ersatzbeschaffung; Schmier-, Hilfs- und Betriebsstoffe auswählen; Verschleißteile austauschen | `rlp-im`, `ao-anlage` |  |
| `LF9-4` | Stillstandszeiten und Ausfallkosten | 6 | Stillstandszeiten berechnen; Ausfallkosten abschätzen | `rlp-im` | rechnen |
| `LF9-5` | Instandsetzungsvorschriften, Abnahme, Entsorgung, Sicherheit | 8 | Instandsetzungsvorschriften anwenden; Funktion prüfen, Abnahmeprotokoll; Betriebsbereitschaft prüfen und in Betrieb nehmen; Defekte Teile und Hilfsstoffe fachgerecht entsorgen; Arbeitssicherheit | `rlp-im`, `ao-anlage` | Sicherheit |

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
| A | `M0`, `LF1`, `LF2`, `PA` | 280 | Schnell spielbarer Kern: Sicherheit/Betrieb, Fertigen von Hand und mit Maschinen, Produktionsanlagen. |
| B | `LF3`, `LF4`, `ZP`, `QS` | 200 | Baugruppen, Warten, Zwischenprüfungs-Training, Qualitätssicherung. |
| C | `LF5`, `LF7`, `LF6` | 180 | Werkzeugmaschinen, Montage von Teilsystemen, Steuerungstechnik. |
| D | `LF8`, `LF9`, `WISO`, `SBP`, `APPT`, `APPP` | 230 | CNC, Instandsetzen, WiSo und beide schriftlichen Prüfungstrainings. |
| | **Summe** | **890** | |

## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)

1. Referenz-Rahmenlehrplan ist Industriemechaniker/in; Betriebe mit Kunststofffokus nutzen die Map maf-kunststoff.
2. Einheiten-Budget: 1 Einheit je Unterrichtsstunde des RLP; übrige Module nach Gewicht in Anlage und § 9. Startwert, den die Lern-Schleife (AP-12) später verschiebt.
3. Wochen der Anlage sind so gruppiert, wie die Klammern der Verordnung sie zusammenfassen (Jahr 1: Nr. 9–11 = 22; Jahr 2: Nr. 1–2 = 8, Nr. 4–5 = 18).
4. Ein drittes Ausbildungsjahr wird nicht geplant (§ 2).

