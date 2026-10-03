# Curriculum-Map: Maschinen- und Anlagenführer/in (Schwerpunkt Metall- und Kunststofftechnik)

Stand: 2026-10-03 · Status: **Entwurf, Freigabe durch Sinan offen** · Linear: [SIN-191 (AP-13)](https://linear.app/sinan-kahraman/issue/SIN-191) · Maschinenlesbar: [`maf-curriculum.json`](maf-curriculum.json)

Diese Map ist die Vorgabe, nach der Plan-Agent und Inhalts-Agent den kompletten Kurs für den Pilotberuf erzeugen. Sie legt fest, **was** in welcher Reihenfolge und in welchem Umfang entsteht. Die Fragen selbst entstehen erst in den Folge-Issues (AP-14, AP-15).

## 1. Zuerst lesen: zwei Jahre, nicht drei

Die Ausbildung dauert laut **§ 2 MaschFüAusbV zwei Jahre**. Ein drittes Jahr gibt es nur über **§ 10**: Wer weitermacht, wechselt in das 3. und 4. Ausbildungsjahr eines anderen Berufs (für Metall z. B. Industriemechaniker/in mit den Lernfeldern 10–15). Das ist ein anderer Kurs und nicht Teil dieser Map.

Darum plant diese Map **zwei Ausbildungsjahre plus Prüfungstraining**:

- **Jahr 1, Berufliche Grundbildung** (Anlage I): für alle fünf Schwerpunkte gleich; schulisch Lernfelder 1–4 (320 Std.)
- **Jahr 2, Berufliche Fachbildung** (Anlage II.A, Metall- und Kunststofftechnik): schulisch Lernfelder 5–9 (280 Std.)
- **Prüfungen:** Zwischenprüfung zu Beginn von Jahr 2 (§ 8) und Abschlussprüfung am Ende (§ 9)

## 2. Amtliche Quellen

Alle Inhalte stammen aus diesen Quellen. Jede Einheit, die der Agent später erzeugt, zitiert eine davon mit Abrufdatum.

| ID | Quelle | Art | Abruf |
| --- | --- | --- | --- |
| `ao` | [MaschFüAusbV – Verordnung über die Berufsausbildung zum Maschinen- und Anlagenführer (Volltext, Stand Art. 2 V v. 14.6.2023)](https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html) | ausbildungsordnung | 2026-10-03 |
| `ao-anlage` | [MaschFüAusbV Anlage (zu § 5) – Ausbildungsrahmenplan mit zeitlichen Richtwerten](https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html) | ausbildungsordnung | 2026-10-03 |
| `ao-p8` | [MaschFüAusbV § 8 Zwischenprüfung](https://www.gesetze-im-internet.de/maschf_ausbv/__8.html) | pruefung | 2026-10-03 |
| `ao-p9` | [MaschFüAusbV § 9 Abschlussprüfung](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html) | pruefung | 2026-10-03 |
| `ao-bgbl` | [BGBl. I 2004 Nr. 19 (BIBB-Kopie der Verordnung inkl. Anlage)](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/regulation/maschinen_und_anlagenfuehrer.pdf) | ausbildungsordnung | 2026-10-03 |
| `rlp-maf` | [KMK Rahmenlehrplan Maschinen- und Anlagenführer/in (Beschluss 25.03.2004 i. d. F. 31.03.2023) – verweist auf die RLP der Fortsetzungsberufe](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf) | rahmenlehrplan | 2026-10-03 |
| `rlp-im` | [KMK Rahmenlehrplan Industriemechaniker/in (Beschluss 25.03.2004 i. d. F. 23.02.2018) – Lernfelder 1–9 als Referenz für Schwerpunkt Metall](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf) | rahmenlehrplan | 2026-10-03 |
| `kmk-wiso` | [KMK Kompetenzorientiertes Qualifikationsprofil Wirtschafts- und Sozialkunde gewerblich-technischer Ausbildungsberufe (Beschluss 17.06.2021, 40 Unterrichtsstunden)](https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2021/2021_06_17-Berufsschule-Unterricht-Wirtschafts-Sozialkunde.pdf) | rahmenlehrplan | 2026-10-03 |
| `bibb-51121` | [BIBB Berufesuche – Maschinen- und Anlagenführer/in (51121)](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121) | berufsinformation | 2026-10-03 |

Abruf über Exa-Web-Fetch, weil der Netzwerk-Proxy der Cloud-Agent-Umgebung `gesetze-im-internet.de` und `kmk.org` sperrt (siehe DECISIONS D-26). Die Verordnungstexte wurden zusätzlich gegen die BIBB-Kopie des Bundesgesetzblatts gelesen.

**Besonderheit beim Rahmenlehrplan:** Der KMK-RLP für den MAF hat keine eigenen Lernfelder. Er legt fest, dass nach den **ersten beiden Jahren der Rahmenlehrpläne der Fortsetzungsberufe** unterrichtet wird. Für den Schwerpunkt Metall sind das sechs Berufe. Referenz dieser Map ist der **RLP Industriemechaniker/in** (Lernfelder 1–4 sind laut RLP für alle Metallberufe inhaltsgleich; häufigste Fortsetzung nach § 10). Alternative für Zerspanungsbetriebe: RLP Zerspanungsmechaniker/in, dort unterscheiden sich die Lernfelder 5–9.

## 3. So ist die Map aufgebaut

Drei Ebenen, die der Agent genauso erzeugt:

1. **Modul** = ein Lernfeld (Schule), ein Kernbereich aus der Ausbildungsordnung (Betrieb) oder ein Prüfungstraining
2. **Block** = ein Themenblock innerhalb des Moduls mit Quellenangabe (AO-Nr. und/oder Lernfeld)
3. **Einheit** = 5–10 Minuten: kurze Erklärung, 5–8 Fragen (Auswahl, Zuordnen, Lückentext, Reihenfolge, Rechnen), jede Antwort mit Erklärung und Quelle

Jedes Modul trägt: Ausbildungsjahr, Niveau für den Richter, AO-Berufsbildpositionen, Prüfungsgebiete nach § 9, Einheiten-Ziel, Fragetypen-Mix und ob Sicherheitsthemen enthalten sind (dann 10 % Stichprobe durch einen Menschen).

## 4. Betrieblicher Zeitrahmen (Anlage zu § 5)

Die Anlage verteilt die 14 Berufsbildpositionen auf Wochen. Das ist die Gewichtung aus Sicht des Betriebs.

**Jahr 1 – Berufliche Grundbildung (alle Schwerpunkte)**

| Lfd. Nr. | Berufsbildposition (§ 4 Nr.) | Wochen |
| --- | --- | --- |
| 1, 2, 3, 4 | Nr. 1 Berufsbildung, Arbeits- und Tarifrecht; Nr. 2 Aufbau und Organisation des Ausbildungsbetriebes; Nr. 3 Sicherheit und Gesundheitsschutz bei der Arbeit; Nr. 4 Umweltschutz | während der gesamten Ausbildung zu vermitteln |
| 5 | Nr. 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen | 4 |
| 6 | Nr. 6 Betriebliche und technische Kommunikation | 8 |
| 7 | Nr. 7 Planen und Vorbereiten von Arbeitsabläufen | 4 |
| 8 | Nr. 8 Prüfen | 6 |
| 9, 10, 11 | Nr. 9 Branchenspezifische Fertigungstechniken; Nr. 10 Steuerungs- und Regelungstechnik; Nr. 11 Einrichten und Bedienen von Produktionsanlagen | 22 |
| 12 | Nr. 12 Steuern des Materialflusses | 2 |
| 13 | Nr. 13 Warten und Inspizieren von Maschinen und Anlagen | 4 |
| 14 | Nr. 14 Durchführen von qualitätssichernden Maßnahmen | 2 |
| | **Summe** | **52** |

**Jahr 2 – Fachbildung, Schwerpunkt Metall- und Kunststofftechnik**

| Lfd. Nr. | Berufsbildposition (§ 4 Nr.) | Wochen |
| --- | --- | --- |
| 1, 2 | Nr. 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Nr. 7 Planen und Vorbereiten von Arbeitsabläufen | 8 |
| 3 | Nr. 9 Branchenspezifische Fertigungstechniken | 18 |
| 4, 5 | Nr. 10 Steuerungs- und Regelungstechnik; Nr. 11 Einrichten und Bedienen von Produktionsanlagen | 18 |
| 6 | Nr. 12 Steuern des Materialflusses | 2 |
| 7 | Nr. 13 Warten und Inspizieren von Maschinen und Anlagen | 4 |
| 8 | Nr. 14 Durchführen von qualitätssichernden Maßnahmen | 2 |
| | **Summe** | **52** |

Lesehilfe: Mehrere Nummern in einer Zeile teilen sich die Wochen (Klammer in der Anlage).

## 5. Schulische Lernfelder (RLP Industriemechaniker, Jahr 1–2)

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
| | **Summe Jahr 1 / Jahr 2** | | **320 / 280** | |

## 6. Prüfungen (§ 8, § 9) und was wohin gehört

**Zwischenprüfung (§ 8):** zu Beginn des zweiten Ausbildungsjahres; praktische Aufgabe höchstens 3 Stunden, schriftlich höchstens 60 Minuten; Beispielaufgabe „Positionieren von Maschinenelementen“. Geprüft wird der Stoff des 1. Ausbildungsjahres. → Modul `ZP`.

**Abschlussprüfung praktisch (§ 9 Abs. 2):** höchstens 7 Stunden, bis zu 2 Aufgaben: Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage; Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme. → Module `PA`, `LF9`, `LF6`.

**Abschlussprüfung schriftlich (§ 9 Abs. 3–6):**

| Bereich | Minuten | Gewicht | Gebiete (Schwerpunkt Metall) | Module |
| --- | --- | --- | --- | --- |
| Produktionstechnik | 120 | 50 % | PT-a: technische Unterlagen; PT-b: Werkstoffe; PT-c: Werkzeuge; PT-d: Funktion von Maschinen und Anlagen; PT-e: Prüfverfahren und Prüfmittel; PT-f: Fertigungstechniken | `LF1`, `LF2`, `LF3`, `LF4`, `LF5`, `LF7`, `LF6`, `PA`, `LF8`, `APPT` |
| Produktionsplanung | 60 | 30 % | PP-a: Arbeitsschritte; PP-b: Qualitätssicherung; PP-c: vorbeugende Instandhaltung; PP-d: Produktionsanlagen; PP-e: Übergabeprotokoll | `LF1`, `LF3`, `LF4`, `LF5`, `LF7`, `LF6`, `PA`, `LF8`, `LF9`, `QS`, `APPP` |
| Wirtschafts- und Sozialkunde | 60 | 20 % | allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO` |

Bestehen: Praktischer und schriftlicher Teil jeweils mindestens ausreichend; in zwei schriftlichen Prüfungsbereichen mindestens ausreichend, im dritten nicht ungenügend (§ 9 Abs. 7). Mündliche Ergänzungsprüfung möglich, Gewichtung 2:1 (§ 9 Abs. 5).

Gebiet → Module im Detail:

| Gebiet | Module |
| --- | --- |
| PT-a technische Unterlagen | `LF1`, `LF2`, `LF3`, `LF7`, `LF8`, `APPT` |
| PT-b Werkstoffe | `LF1`, `LF5`, `APPT` |
| PT-c Werkzeuge | `LF1`, `LF2`, `LF3`, `LF5`, `APPT` |
| PT-d Funktion von Maschinen und Anlagen | `LF2`, `LF4`, `LF6`, `PA`, `APPT` |
| PT-e Prüfverfahren und Prüfmittel | `LF1`, `LF2`, `LF5`, `LF8`, `APPT` |
| PT-f Fertigungstechniken | `LF1`, `LF2`, `LF5`, `LF8`, `APPT` |
| PP-a Arbeitsschritte | `LF1`, `LF3`, `LF7`, `PA`, `APPP` |
| PP-b Qualitätssicherung | `LF5`, `LF8`, `QS`, `APPP` |
| PP-c vorbeugende Instandhaltung | `LF4`, `LF9`, `APPP` |
| PP-d Produktionsanlagen | `LF6`, `PA`, `LF9`, `APPP` |
| PP-e Übergabeprotokoll | `PA`, `APPP` |
| WISO allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `WISO` |

## 7. Die Module im Überblick

16 Module, **870 Einheiten** (bei 7,5 Minuten im Schnitt ≈ 109 Stunden Lernzeit; 4350–6960 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt | 1 | querschnitt | 60 | ja | WISO |
| 1 | `LF1` | Fertigen von Bauelementen mit handgeführten Werkzeugen | 1 | lernfeld | 80 | ja | PT-a, PT-b, PT-c, PT-e, PT-f, PP-a |
| 2 | `LF2` | Fertigen von Bauelementen mit Maschinen | 1 | lernfeld | 80 | nein | PT-a, PT-c, PT-d, PT-e, PT-f |
| 3 | `LF3` | Herstellen von einfachen Baugruppen | 1 | lernfeld | 80 | nein | PT-a, PT-c, PP-a |
| 4 | `LF4` | Warten technischer Systeme | 1 | lernfeld | 80 | ja | PT-d, PP-c |
| 5 | `ZP` | Zwischenprüfung: Training (§ 8) | 1 | pruefung | 20 | ja | ZP |
| 6 | `LF5` | Fertigen von Einzelteilen mit Werkzeugmaschinen | 2 | lernfeld | 80 | nein | PT-b, PT-c, PT-e, PT-f, PP-b |
| 7 | `LF7` | Montieren von technischen Teilsystemen | 2 | lernfeld | 40 | nein | PT-a, PP-a |
| 8 | `LF6` | Installieren und Inbetriebnehmen steuerungstechnischer Systeme | 2 | lernfeld | 60 | ja | PT-d, PP-d |
| 9 | `PA` | Produktionsanlagen einrichten, bedienen und übergeben (MAF-Kern) | 2 | ao-kern | 60 | ja | PT-d, PP-a, PP-d, PP-e |
| 10 | `LF8` | Fertigen auf numerisch gesteuerten Werkzeugmaschinen | 2 | lernfeld | 60 | ja | PT-a, PT-e, PT-f, PP-b |
| 11 | `LF9` | Instandsetzen von technischen Systemen | 2 | lernfeld | 40 | ja | PP-c, PP-d |
| 12 | `QS` | Qualitätssichernde Maßnahmen | 2 | ao-kern | 20 | nein | PP-b |
| 13 | `WISO` | Wirtschafts- und Sozialkunde | 2 | wiso | 40 | nein | WISO |
| 14 | `APPT` | Abschlussprüfung: Training Produktionstechnik (§ 9) | 2 | pruefung | 40 | nein | PT-a, PT-b, PT-c, PT-d, PT-e, PT-f |
| 15 | `APPP` | Abschlussprüfung: Training Produktionsplanung (§ 9) | 2 | pruefung | 30 | nein | PP-a, PP-b, PP-c, PP-d, PP-e |
| | | **Summe** | | | **870** | | |

Reihenfolge = Lernreihenfolge im Kurs. `M0` wird nicht am Stück gelernt, sondern über alle Module gestreut (etwa jede fünfte Einheit), weil die Anlage diese Inhalte „während der gesamten Ausbildung“ vorsieht.

## 8. Module und Blöcke im Detail

### M0 · Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt

- Jahr 1 · querschnitt · 60 Einheiten · Niveau: Grundbildung – wird über beide Jahre verteilt wiederholt
- AO-Berufsbild: Anlage I Nr. 1 → § 4 Nr. 1 Berufsbildung, Arbeits- und Tarifrecht; Anlage I Nr. 2 → § 4 Nr. 2 Aufbau und Organisation des Ausbildungsbetriebes; Anlage I Nr. 3 → § 4 Nr. 3 Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → § 4 Nr. 4 Umweltschutz
- Prüfungsgebiete: WISO
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5
- Hinweis: Laut Anlage während der gesamten Ausbildung zu vermitteln. Der Plan-Agent streut diese Einheiten über alle Lernfelder (etwa jede fünfte Einheit). Vorhandener Seed: Lernfeld 'Sicherheit' (3 Einheiten) gehört zu M0-3.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `M0-1` | Ausbildung, Ausbildungsvertrag und Berufsbild | 15 | Ausbildungsvertrag: Abschluss, Dauer (2 Jahre, § 2), Beendigung; Rechte und Pflichten aus dem Ausbildungsvertrag; Berichtsheft als Ausbildungsnachweis (§ 7); Ausbildungsrahmenplan und betrieblicher Ausbildungsplan (§ 5, § 6); Die 14 Berufsbildpositionen (§ 4); Fünf Schwerpunkte (§ 5) und Fortsetzung der Ausbildung (§ 10); Berufliche Fortbildung; Arbeitsvertrag und Tarifvertrag: wesentliche Teile | `ao`, `ao-anlage`, `bibb-51121` |  |
| `M0-2` | Ausbildungsbetrieb: Aufbau, Grundfunktionen, Mitbestimmung | 10 | Aufbau und Aufgaben des Betriebes; Grundfunktionen: Beschaffung, Fertigung, Absatz, Verwaltung; Wirtschaftsorganisationen, Berufsvertretungen, Gewerkschaften; Betriebsrat, Jugend- und Auszubildendenvertretung | `ao-anlage` |  |
| `M0-3` | Sicherheit und Gesundheitsschutz bei der Arbeit | 20 | Gefährdungen am Arbeitsplatz erkennen, Gefährdungsbeurteilung, Betriebsanweisung; Persönliche Schutzausrüstung; Arbeitsschutz- und Unfallverhütungsvorschriften; Verhalten bei Unfällen, erste Maßnahmen; Vorbeugender Brandschutz, Verhalten bei Bränden; Schutzeinrichtungen, Not-Halt, Freischalten und gegen Wiedereinschalten sichern, Restenergie | `ao-anlage` | Sicherheit |
| `M0-4` | Umweltschutz in der Fertigung | 15 | Umweltbelastungen durch den Betrieb an Beispielen; Betriebliche Umweltschutz-Regelungen; Wirtschaftliche und umweltschonende Energie- und Materialverwendung; Abfälle vermeiden, Stoffe trennen und fachgerecht entsorgen (Späne, Kühlschmierstoff, Altöl) | `ao-anlage` |  |

### LF1 · Fertigen von Bauelementen mit handgeführten Werkzeugen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 1 (80 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage I Nr. 5 → § 4 Nr. 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage I Nr. 6 → § 4 Nr. 6 Betriebliche und technische Kommunikation; Anlage I Nr. 7 → § 4 Nr. 7 Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 8 → § 4 Nr. 8 Prüfen; Anlage I Nr. 9 → § 4 Nr. 9 Branchenspezifische Fertigungstechniken
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

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 2 (80 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage I Nr. 8 → § 4 Nr. 8 Prüfen; Anlage I Nr. 9 → § 4 Nr. 9 Branchenspezifische Fertigungstechniken; Anlage I Nr. 11 → § 4 Nr. 11 Einrichten und Bedienen von Produktionsanlagen
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

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 3 (80 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage I Nr. 6 → § 4 Nr. 6 Betriebliche und technische Kommunikation; Anlage I Nr. 7 → § 4 Nr. 7 Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 9 → § 4 Nr. 9 Branchenspezifische Fertigungstechniken; Anlage I Nr. 10 → § 4 Nr. 10 Steuerungs- und Regelungstechnik
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

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundbildung (Zwischenprüfungsniveau) · RLP LF 4 (80 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage I Nr. 13 → § 4 Nr. 13 Warten und Inspizieren von Maschinen und Anlagen; Anlage I Nr. 10 → § 4 Nr. 10 Steuerungs- und Regelungstechnik; Anlage I Nr. 3 → § 4 Nr. 3 Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → § 4 Nr. 4 Umweltschutz
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
- AO-Berufsbild: Anlage I Nr. 7 → § 4 Nr. 7 Planen und Vorbereiten von Arbeitsabläufen; Anlage I Nr. 3 → § 4 Nr. 3 Sicherheit und Gesundheitsschutz bei der Arbeit; Anlage I Nr. 4 → § 4 Nr. 4 Umweltschutz; Anlage I Nr. 6 → § 4 Nr. 6 Betriebliche und technische Kommunikation
- Prüfungsgebiete: ZP
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene Übungsaufgaben nach der Struktur von § 8. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `ZP-1` | Aufbau und Ablauf der Zwischenprüfung | 4 | Zeitpunkt: Beginn 2. Ausbildungsjahr; Praktische Aufgabe höchstens 3 Stunden, schriftlich höchstens 60 Minuten; Was nachzuweisen ist | `ao-p8` |  |
| `ZP-2` | Planungsaufgabe: Arbeitsschritte, Arbeitsmittel, Unterlagen | 6 | Arbeitsschritte planen; Arbeitsmittel auswählen; Technische Unterlagen nutzen | `ao-p8`, `ao-anlage` |  |
| `ZP-3` | Positionieren von Maschinenelementen | 6 | Vorgehen beim Positionieren und Ausrichten; Prüfen und dokumentieren; Sicherheit und Umweltschutz im Auftrag | `ao-p8` | Sicherheit |
| `ZP-4` | Gemischte Wiederholung Jahr 1 | 4 | Fragen quer über LF1–LF4 und M0 | `ao-anlage`, `rlp-im` |  |

### LF5 · Fertigen von Einzelteilen mit Werkzeugmaschinen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 5 (80 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage II.A Nr. 1 → § 4 Nr. 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen; Anlage II.A Nr. 3 → § 4 Nr. 9 Branchenspezifische Fertigungstechniken; Anlage II.A Nr. 8 → § 4 Nr. 14 Durchführen von qualitätssichernden Maßnahmen
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

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 7 (40 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage II.A Nr. 3 → § 4 Nr. 9 Branchenspezifische Fertigungstechniken; Anlage II.A Nr. 2 → § 4 Nr. 7 Planen und Vorbereiten von Arbeitsabläufen
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

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 6 (60 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage II.A Nr. 4 → § 4 Nr. 10 Steuerungs- und Regelungstechnik; Anlage II.A Nr. 5 → § 4 Nr. 11 Einrichten und Bedienen von Produktionsanlagen
- Prüfungsgebiete: PT-d, PP-d
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
- AO-Berufsbild: Anlage I Nr. 11 → § 4 Nr. 11 Einrichten und Bedienen von Produktionsanlagen; Anlage I Nr. 12 → § 4 Nr. 12 Steuern des Materialflusses; Anlage II.A Nr. 5 → § 4 Nr. 11 Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 6 → § 4 Nr. 12 Steuern des Materialflusses
- Prüfungsgebiete: PT-d, PP-a, PP-d, PP-e
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Berufskern laut Anlage II.A Nr. 5 (18 Wochen zusammen mit Nr. 4). Der RLP Industriemechaniker deckt das nicht 1:1 ab, darum eigenes Modul direkt aus der Ausbildungsordnung. Deckt auch die praktischen Prüfungsaufgaben nach § 9 Abs. 2.

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

- Jahr 2 · lernfeld · 60 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 8 (60 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage II.A Nr. 5 → § 4 Nr. 11 Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 3 → § 4 Nr. 9 Branchenspezifische Fertigungstechniken
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

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung) · RLP LF 9 (40 Std., `rlp-im` via `rlp-maf`)
- AO-Berufsbild: Anlage II.A Nr. 7 → § 4 Nr. 13 Warten und Inspizieren von Maschinen und Anlagen; Anlage II.A Nr. 5 → § 4 Nr. 11 Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 6 → § 4 Nr. 12 Steuern des Materialflusses
- Prüfungsgebiete: PP-c, PP-d
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
- AO-Berufsbild: Anlage I Nr. 14 → § 4 Nr. 14 Durchführen von qualitätssichernden Maßnahmen; Anlage II.A Nr. 8 → § 4 Nr. 14 Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-b
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `QS-1` | Aufgaben und Ziele qualitätssichernder Maßnahmen | 6 | Qualitätsbegriff; Aufgaben und Ziele der Qualitätssicherung; Prüfen, Abweichung erkennen, Korrektur, Dokumentation | `ao-anlage` |  |
| `QS-2` | Ursachen von Qualitätsabweichungen, Korrekturmaßnahmen | 8 | Ursachen feststellen; Korrekturmaßnahmen einleiten; Qualitätsdaten dokumentieren | `ao-anlage`, `ao-p9` |  |
| `QS-3` | Kontinuierliche Verbesserung und kundenorientiertes Arbeiten | 6 | Zur Verbesserung von Arbeitsvorgängen beitragen; Kundenorientiert arbeiten | `ao-anlage` |  |

### WISO · Wirtschafts- und Sozialkunde

- Jahr 2 · wiso · 40 Einheiten · Niveau: Prüfungsbereich WiSo (20 %, 60 Minuten)
- AO-Berufsbild: Anlage I Nr. 1 → § 4 Nr. 1 Berufsbildung, Arbeits- und Tarifrecht; Anlage I Nr. 2 → § 4 Nr. 2 Aufbau und Organisation des Ausbildungsbetriebes
- Prüfungsgebiete: WISO
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5
- Hinweis: Inhalt nach dem KMK-Qualifikationsprofil 2021 (40 Unterrichtsstunden). Keine Personendaten in Beispielen.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `WISO-1` | Junge Menschen in Ausbildung und Beruf | 16 | Duales System: Beteiligte, Ausbildungsordnung, Rahmenlehrplan; Rechte und Pflichten aus Ausbildungs- und Arbeitsverhältnis (Jugendarbeitsschutz, Arbeitszeit, Urlaub, Kündigungsschutz); Tarifliche Auseinandersetzung und betriebliche Mitbestimmung; Wandel der Arbeitswelt, Digitalisierung, lebenslanges Lernen; Leben, Lernen und Arbeiten in Europa | `kmk-wiso`, `ao-anlage` |  |
| `WISO-2` | Nachhaltige Existenzsicherung | 12 | Säulen der sozialen Sicherung, Versicherungsprinzipien; Positionen der Entgeltabrechnung; Private Vorsorge; Karriere- und Lebensplanung, Existenzgründung | `kmk-wiso` |  |
| `WISO-3` | Unternehmen, Organisationen und private Marktteilnehmende | 12 | Ziele, Aufbau und Perspektiven von Unternehmen, Wertschöpfungskette, Wirtschaftskreislauf; Bedürfnisse, Bedarf, Kaufkraft; Rechtsgeschäfte: Kauf-, Miet-, Kreditvertrag, Verbraucherschutz; Soziale Marktwirtschaft, Europa, globale Vernetzung, Standortwettbewerb | `kmk-wiso` |  |

### APPT · Abschlussprüfung: Training Produktionstechnik (§ 9)

- Jahr 2 · pruefung · 40 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.A Nr. 3 → § 4 Nr. 9 Branchenspezifische Fertigungstechniken; Anlage II.A Nr. 1 → § 4 Nr. 5 Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen
- Prüfungsgebiete: PT-a, PT-b, PT-c, PT-d, PT-e, PT-f
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 Nr. 1.1. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPT-1` | Technische Unterlagen und Werkstoffe (PT a, b) | 12 | Fälle zu Zeichnungen, Stücklisten, Arbeitsplänen; Fälle zu Werkstoffwahl und Werkstoffeigenschaften | `ao-p9`, `rlp-im` |  |
| `APPT-2` | Werkzeuge, Funktion von Maschinen und Anlagen (PT c, d) | 12 | Fälle zu Werkzeugwahl und Schneidstoffen; Fälle zu Funktion und Aufbau von Maschinen und Anlagen | `ao-p9`, `rlp-im` |  |
| `APPT-3` | Prüfverfahren, Prüfmittel, Fertigungstechniken (PT e, f) | 12 | Fälle zu Prüfmittelwahl und Toleranzen; Fälle zu Fertigungsverfahren und Technologiedaten | `ao-p9`, `rlp-im` |  |
| `APPT-4` | Prüfungsformat und Zeitplanung | 4 | 120 Minuten, 50 Prozent Gewicht; Praxisbezogene Fälle lesen und strukturieren | `ao-p9` |  |

### APPP · Abschlussprüfung: Training Produktionsplanung (§ 9)

- Jahr 2 · pruefung · 30 Einheiten · Niveau: Fachbildung (Niveau schriftliche Abschlussprüfung)
- AO-Berufsbild: Anlage II.A Nr. 2 → § 4 Nr. 7 Planen und Vorbereiten von Arbeitsabläufen; Anlage II.A Nr. 5 → § 4 Nr. 11 Einrichten und Bedienen von Produktionsanlagen; Anlage II.A Nr. 7 → § 4 Nr. 13 Warten und Inspizieren von Maschinen und Anlagen; Anlage II.A Nr. 8 → § 4 Nr. 14 Durchführen von qualitätssichernden Maßnahmen
- Prüfungsgebiete: PP-a, PP-b, PP-c, PP-d, PP-e
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Eigene praxisbezogene Fälle nach den Gebieten aus § 9 Abs. 3 Nr. 1.2. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `APPP-1` | Arbeitsschritte und Produktionsanlagen (PP a, d) | 12 | Fälle zur Planung von Arbeitsschritten; Fälle zu Rüsten, Bedienen und Überwachen von Produktionsanlagen | `ao-p9`, `ao-anlage` |  |
| `APPP-2` | Qualitätssicherung und vorbeugende Instandhaltung (PP b, c) | 10 | Fälle zu Qualitätsabweichung und Korrektur; Fälle zu Wartungsplanung und vorbeugender Instandhaltung | `ao-p9`, `ao-anlage` |  |
| `APPP-3` | Übergabeprotokoll und Prüfungsformat (PP e) | 8 | Übergabeprotokoll ausfüllen und bewerten; 60 Minuten, 30 Prozent Gewicht | `ao-p9`, `ao-anlage` |  |

## 9. Mengengerüst, Phasen und Kosten

**Erzeugung in vier Phasen.** Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md). Phase A reicht für einen spielbaren Pilot.

| Phase | Module | Einheiten | Warum |
| --- | --- | --- | --- |
| A | `M0`, `LF1`, `LF2`, `PA` | 280 | Schnell spielbarer Kern: Sicherheit/Betrieb, Fertigen von Hand und mit Maschinen, Produktionsanlagen (das, was den MAF ausmacht). Das vorhandene Goldset deckt M0 und PA bereits teilweise ab. |
| B | `LF3`, `LF4`, `ZP`, `QS` | 200 | Baugruppen, Warten, Zwischenprüfungs-Training, Qualitätssicherung. |
| C | `LF5`, `LF7`, `LF6` | 180 | Werkzeugmaschinen, Montage von Teilsystemen, Steuerungstechnik. |
| D | `LF8`, `LF9`, `WISO`, `APPT`, `APPP` | 210 | CNC, Instandsetzen, WiSo und beide schriftlichen Prüfungstrainings. |
| | **Summe** | **870** | |

**Kostenschätzung pro Phase** (Preise aus D-06/D-07, Batch-Rabatt 50 %; Schätzung, wird in AP-15 in Langfuse gemessen):

| Posten | Annahme | Phase A (280 Einheiten) |
| --- | --- | --- |
| Erzeugen, `claude-sonnet-5-5` Batch | ca. 3.000 Token Eingabe + 2.500 Token Ausgabe je Einheit | ca. 4–5 USD |
| Prüfen, `gpt-5.4-mini` | ca. 1.700 Token je Frage, 6 Fragen je Einheit | ca. 4–5 USD |
| Nachbesserung | 20 % der Fragen einmal neu | ca. 1–2 USD |
| **Summe** | | **ca. 10–12 USD, unter dem Deckel** |

Passt zu den zwei Lernvarianten aus PRODUCT.md: „Prüfungsvorbereitung 2 Monate“ (40 Tage × 2,5 h = 100 h) nutzt alle 870 Einheiten einmal; „Weiterbildung 3 Monate“ (60 Tage × 2 h = 120 h) hat zusätzlich Platz für Wiederholung nach 1, 3 und 7 Tagen.

## 10. So wird der Agent darauf eingestellt (Vorgabe für AP-14)

Heute ist der Plan-Agent generisch (`Erzeuge einen Lernplan für …`) und der Inhalts-Agent erzeugt nur das Lernfeld „Sicherheit“. Beide bekommen in AP-14 die Map als Eingabe. Konkret:

**Plan-Agent** (`src/lib/plan/plan-agent.ts`)

1. Liest `docs/content/maf-curriculum.json` statt der 24 Topic-Titel aus `maf-plan-seed.ts`.
2. Läuft die Module in `order` ab und streut `M0`-Einheiten ein (jede fünfte Einheit).
3. Füllt Tage mit 2–3 Stunden aus Einheiten zu 5–10 Minuten; Variante bestimmt Tage und Stunden pro Tag.
4. Jede Plan-Einheit trägt `moduleId`, `blockId`, `sourceKind` und `niveau`, damit Generate und Evaluate dieselbe Referenz nutzen.

**Inhalts-Agent** (`src/lib/generate/generate-agent.ts`)

1. Ein Batch-Request **pro Block**, nicht pro Kurs. Eingabe: Blocktitel, Themenliste, Quellen-URLs, Jahr und Niveau, Fragetypen-Mix, Anzahl Einheiten.
2. Ausgabe im bestehenden Schema (`GeneratedLernfeld` → `GeneratedUnit` → `GeneratedQuestion`), plus `moduleId` und `blockId`.
3. Pflicht im Prompt: nur die genannten Quellen zitieren, `sourceFetchedAt` setzen, keine IHK-Aufgaben, keine Personendaten, einfache Sprache (kurze Sätze, Fachwort mit Erklärung).
4. Blöcke mit `rechnen` liefern Rechenfragen mit Rechenweg in der Erklärung; Blöcke mit `safety` setzen `safetyFlag`.

Prompt-Gerüst für einen Block:

```text
Erzeuge {units} Lerneinheiten (je 5–10 Minuten) für den Block "{block.title}" im Modul "{module.title}"
der Ausbildung Maschinen- und Anlagenführer/in, Schwerpunkt Metall- und Kunststofftechnik, Ausbildungsjahr {year}.
Niveau: {niveau}. Themen, die abgedeckt werden müssen: {topics}.
Erlaubte Quellen (nur diese zitieren, URL in sourceUrl, Abrufdatum {fetchedAt} in sourceFetchedAt): {sourceUrls}.
Je Einheit: kurze Erklärung in einfacher Sprache, dann 5–8 Fragen. Fragetypen-Mix in Prozent: {questionMix}.
Jede Frage hat genau eine richtige Antwort, eine Erklärung mit Bezug zur Quelle und sourceUrl.
Verboten: IHK-Prüfungsaufgaben oder deren Umformulierung, Personendaten, Inhalte ohne Quelle.
Antworte nur mit JSON nach Schema: { ... }
```

**Richter / Qualitäts-Schranke** (`src/lib/quality/*`)

- `niveau` wird gegen das Modul-Niveau geprüft (Jahr 1 = Zwischenprüfung, Jahr 2 = Abschlussprüfung), nicht gegen einen Kurs-Mittelwert.
- `safetyFlag` ist bei Blöcken mit Sicherheitsmerker vorbelegt; 10 % Stichprobe durch einen Menschen vor `publish`.
- Goldset-Lücke: Die 70 Items decken vor allem Verordnung und Prüfungsstruktur ab, kaum Fachinhalt aus LF1–LF9. Für AP-15 mindestens 5 eigene Items pro Modul ergänzen, damit der Zielwert pro Modul kalibriert ist.

## 11. Annahmen (ohne Rückfrage, siehe D-26)

1. Referenz-Rahmenlehrplan ist Industriemechaniker/in; Betriebe mit Zerspanungsfokus brauchen später eine Variante mit RLP Zerspanungsmechaniker/in (LF 5–9).
2. Einheiten-Budget: 1 Einheit je Unterrichtsstunde des RLP; Querschnitt, MAF-Kern, WiSo und Prüfungstraining nach Gewicht in Anlage und § 9. Das ist ein Startwert, den die Lern-Schleife (AP-12) später verschiebt.
3. Wochenangaben der Anlage sind so gruppiert, wie die Klammern in der Verordnung sie zusammenfassen (Jahr 1: Nr. 9–11 zusammen 22 Wochen; Jahr 2: Nr. 1–2 zusammen 8 Wochen, Nr. 4–5 zusammen 18 Wochen).
4. Ein drittes Ausbildungsjahr wird nicht geplant (§ 2). Ein Anschlusskurs „Fortsetzung Industriemechaniker (LF 10–15)“ ist ein eigenes Produkt.
5. Die anderen vier Schwerpunkte (Textiltechnik, Textilveredelung, Lebensmitteltechnik, Druckweiter- und Papierverarbeitung) teilen Jahr 1 und `M0`; Jahr 2 braucht pro Schwerpunkt eine eigene Map.

## 12. Nächste Schritte

1. **Freigabe dieser Map** durch Sinan (Reihenfolge, Einheiten-Budget, Referenz-RLP). Änderungen direkt in `maf-curriculum.json`; `npm test` prüft die Summen.
2. **AP-14:** Plan- und Inhalts-Agent lesen die Map (siehe Abschnitt 10).
3. **AP-15:** Phase A erzeugen, bewerten, veröffentlichen; Kosten in Langfuse messen; Goldset um Fachitems erweitern.
