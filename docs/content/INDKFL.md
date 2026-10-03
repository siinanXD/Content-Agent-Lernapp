# Curriculum-Map: Industriekaufmann / Industriekauffrau (IndKflAusbV 2024, 3 Jahre, 13 Lernfelder, Einsatzgebiete)

Stand: 2026-10-03 · Status: **Entwurf – Freigabe durch Sinan offen** · Familie: `indkfl` · Map-ID: `indkfl` · Maschinenlesbar: [`indkfl.json`](indkfl.json) · Vorgaben für die Agenten: [README](README.md)

> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.

## 1. Beruf, Dauer, Variante

- **Beruf:** Industriekaufmann
- **Variante:** Monoberuf mit sieben Einsatzgebieten (§ 4 Abs. 4); alle Einsatzgebiete als Blöcke im Modul EG
- **Dauer:** 3 Jahre. § 2 IndKflAusbV: Die Berufsausbildung dauert drei Jahre. Gestreckte Abschlussprüfung: Teil 1 im 4. Halbjahr, Teil 2 am Ende (§ 6). Die Verordnung vom 12.03.2024 ersetzt die IndKfmAusbV 2002 ab 1.8.2024.
- **Referenz-Rahmenlehrplan:** `rlp-indkfl`. Der KMK-RLP Industriekaufmann und Industriekauffrau vom 15.12.2023 ist mit der Verordnung 2024 abgestimmt: 13 Lernfelder, 880 Std. (320/280/280). Lernfelder 1–7 sind vor Teil 1 der Abschlussprüfung zu unterrichten.

## 2. Amtliche Quellen

| ID | Quelle | Art | Abruf |
| --- | --- | --- | --- |
| `indkfl` | [IndKflAusbV – Industriekaufleuteausbildungsverordnung vom 12. März 2024 (BGBl. 2024 I Nr. 94), in Kraft 1.8.2024 – Volltext](https://www.gesetze-im-internet.de/indkflausbv/BJNR05E0A0024.html) | ausbildungsordnung | 2026-10-03 |
| `indkfl-anlage` | [IndKflAusbV Anlage (zu § 3 Abs. 1) – Ausbildungsrahmenplan, Abschnitte A und B mit zeitlichen Richtwerten in Wochen](https://www.gesetze-im-internet.de/indkflausbv/anlage.html) | ausbildungsordnung | 2026-10-03 |
| `indkfl-p4` | [IndKflAusbV § 4 Struktur der Berufsausbildung, Ausbildungsberufsbild und Einsatzgebiete](https://www.gesetze-im-internet.de/indkflausbv/__4.html) | ausbildungsordnung | 2026-10-03 |
| `indkfl-p8` | [IndKflAusbV § 8 Prüfungsbereich des Teiles 1 „Leistungserstellung, Logistik, Beschaffung und Buchhaltung“](https://www.gesetze-im-internet.de/indkflausbv/__8.html) | pruefung | 2026-10-03 |
| `indkfl-p11` | [IndKflAusbV § 11 Prüfungsbereich „Marketing, Vertrieb, Personalwesen und kaufmännische Steuerung und Kontrolle“](https://www.gesetze-im-internet.de/indkflausbv/__11.html) | pruefung | 2026-10-03 |
| `indkfl-p12` | [IndKflAusbV § 12 Prüfungsbereich „Fachaufgabe im Einsatzgebiet“](https://www.gesetze-im-internet.de/indkflausbv/__12.html) | pruefung | 2026-10-03 |
| `indkfl-p14` | [IndKflAusbV § 14 Gewichtung der Prüfungsbereiche und Bestehen](https://www.gesetze-im-internet.de/indkflausbv/__14.html) | pruefung | 2026-10-03 |
| `rlp-indkfl` | [KMK Rahmenlehrplan Industriekaufmann und Industriekauffrau (Beschluss 15.12.2023) – Lernfelder 1–13, 880 Std.](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriekaufleute_2023-12-15-mitEL.pdf) | rahmenlehrplan | 2026-10-03 |

Abruf: Exa web_fetch (Cloud-Agent-Egress zu gesetze-im-internet.de und kmk.org gesperrt); Verordnungstexte gegen BIBB-Kopie des BGBl. gegengelesen

## 3. Betrieblicher Zeitrahmen (Ausbildungsrahmenplan)

**Anlage Abschnitt A – berufsprofilgebend, 1. bis 15. Monat (vor Teil 1 der Abschlussprüfung)** (Quelle `indkfl-anlage`)

| Lfd. Nr. | Berufsbildposition | Wochen |
| --- | --- | --- |
| A 1 | A1 Leistungserstellung planen und koordinieren | 18 |
| A 2 | A2 Logistik und Lagerprozesse planen und steuern | 14 |
| A 3 | A3 Beschaffung planen und steuern | 14 |
| A 7 a | A7 kaufmännische Steuerung und Kontrolle durchführen | 5 |
| B 5 a–b | B5 digitale Geschäftsprozesse im Unternehmen gestalten | 5 |
| B 6 a–d | B6 Zusammenarbeit, Kommunikation und individuelle Arbeitsorganisation gestalten | 8 |
| | **Summe** | **64** (erwartet 64) |

**Anlage Abschnitt A – berufsprofilgebend, 16. bis 36. Monat** (Quelle `indkfl-anlage`)

| Lfd. Nr. | Berufsbildposition | Wochen |
| --- | --- | --- |
| A 4 | A4 Marketingmaßnahmen planen und umsetzen | 12 |
| A 5 | A5 Vertriebsprozesse umsetzen | 14 |
| A 6 | A6 Personalprozesse umsetzen | 14 |
| A 7 b–e | A7 kaufmännische Steuerung und Kontrolle durchführen | 10 |
| A 8 | A8 einsatzgebietsspezifische Lösungen erarbeiten | 13 |
| A 9 | A9 einsatzgebietsspezifische Aufgaben und Prozesse koordinieren | 13 |
| B 5 c–f | B5 digitale Geschäftsprozesse im Unternehmen gestalten | 8 |
| B 6 e–h | B6 Zusammenarbeit, Kommunikation und individuelle Arbeitsorganisation gestalten | 8 |
| | **Summe** | **92** (erwartet 92) |

**Anlage Abschnitt B – integrativ, während der gesamten Ausbildung** (Quelle `indkfl-anlage`)

| Lfd. Nr. | Berufsbildposition | Wochen |
| --- | --- | --- |
| B 1, B 2, B 3, B 4 | B1 Organisation des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht; B2 Sicherheit und Gesundheit bei der Arbeit; B3 Umweltschutz und Nachhaltigkeit; B4 digitalisierte Arbeitswelt | während der gesamten Ausbildung |
| | **Summe** | **0** |

Mehrere Nummern in einer Zeile teilen sich die Wochen (Klammer in der Anlage).

## 4. Schulische Lernfelder (Referenz-Rahmenlehrplan)

| LF | Titel | Jahr | Std. | Modul |
| --- | --- | --- | --- | --- |
| 1 | Das Unternehmen vorstellen und die eigene Rolle mitgestalten | 1 | 80 | `LF1` |
| 2 | Projekte planen und durchführen | 1 | 40 | `LF2` |
| 3 | Kundenaufträge bearbeiten und überwachen | 1 | 80 | `LF3` |
| 4 | Beschaffungsprozesse planen und steuern | 1 | 40 | `LF4` |
| 5 | Wertströme buchhalterisch dokumentieren und auswerten | 1 | 80 | `LF5` |
| 6 | Leistungserstellung planen, steuern und kontrollieren | 2 | 80 | `LF6` |
| 7 | Logistik- und Lagerprozesse koordinieren, umsetzen und überwachen | 2 | 40 | `LF7` |
| 8 | Kosten- und Leistungsrechnung zur Vorbereitung unternehmerischer Entscheidungen durchführen | 2 | 80 | `LF8` |
| 9 | Marketingkonzepte planen und umsetzen | 2 | 80 | `LF9` |
| 10 | Jahresabschluss vorbereiten, auswerten und für Finanzierungsentscheidungen nutzen | 3 | 80 | `LF10` |
| 11 | Geschäftsprozesse an gesamtwirtschaftlichen Rahmenbedingungen ausrichten | 3 | 80 | `LF11` |
| 12 | Personalprozesse planen, steuern und kontrollieren | 3 | 80 | `LF12` |
| 13 | Betriebliche Problemlösungsprozesse innovativ durchführen | 3 | 40 | `LF13` |
| | **Summe je Jahr** | | **J1: 320 · J2: 280 · J3: 280** | |

## 5. Prüfungen und Zuordnung der Gebiete

Gestreckte Abschlussprüfung (§ 6): Teil 1 im vierten Ausbildungshalbjahr über die ersten 15 Monate (ein schriftlicher Prüfungsbereich, 25 %), Teil 2 am Ende mit drei Prüfungsbereichen (35 % schriftlich, 30 % betriebliche Fachaufgabe im Einsatzgebiet, 10 % WiSo). Keine Zwischenprüfung.

| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |
| --- | --- | --- | --- | --- | --- | --- |
| Teil 1 | Leistungserstellung, Logistik, Beschaffung und Buchhaltung | schriftlich | 90 Minuten | 25 % | T1-1: Leistungserstellung entlang der Wertschöpfungskette planen, koordinieren, bewerten; T1-2: Bedarfe ermitteln, Beschaffung einleiten, Logistik- und Lagerprozesse planen und steuern; T1-3: Geschäftsfälle nach Grundsätzen der Buchführung und Bilanzierung prüfen und bewerten; T1-4: mit internen und externen Partnern zusammenarbeiten; T1-5: Informationsbeschaffung, Datenschutz, Datensicherheit, Digitalisierung von Geschäftsprozessen | `M0`, `LF1`, `LF2`, `LF3`, `LF4`, `LF5`, `LF6`, `LF7`, `T1`, `DIG` |
| Teil 2 | Marketing, Vertrieb, Personalwesen und kaufmännische Steuerung und Kontrolle | schriftlich | 150 Minuten | 35 % | T2A-1: Marketingmaßnahmen zielgruppenorientiert planen, umsetzen, bewerten; T2A-2: Vertriebsprozesse koordinieren, Kundenzufriedenheit und Kundenbindung; T2A-3: Personalprozesse nach Arbeits-, Sozial- und Tarifrecht planen und umsetzen; T2A-4: Kosten- und Leistungsrechnung, Kennzahlen, kaufmännische Steuerung, Jahresabschluss; T2A-5: englischsprachige Informationen und Fachbegriffe anwenden | `LF3`, `LF8`, `LF9`, `LF10`, `LF12`, `T2A` |
| Teil 2 | Fachaufgabe im Einsatzgebiet | betrieblich | Dokumentation (bis 16 Std.) und Präsentation (bis 8 Std.) vorbereiten; Präsentation bis 10 Min. und Fachgespräch zusammen 30 Min. | 30 % | T2B-1: komplexe berufstypische Fachaufgabe prozessorientiert planen, durchführen, auswerten; T2B-2: einsatzgebietsspezifische Lösungen analysieren und begründet auswählen; T2B-3: Vorgehen reflektieren, dokumentieren, präsentieren, bewerten (Gewichtung 10/20/70) | `EG`, `LF13`, `FA` |
| Teil 2 | Wirtschafts- und Sozialkunde | schriftlich | 60 Minuten | 10 % | WISO-1: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt | `M0`, `LF1`, `LF11`, `WISO` |

Bestehen: Gesamtergebnis aus Teil 1 und Teil 2 mindestens ausreichend; Teil 2 mindestens ausreichend; in mindestens zwei Prüfungsbereichen von Teil 2 mindestens ausreichend; kein Prüfungsbereich von Teil 2 ungenügend (§ 14 Abs. 2). Mündliche Ergänzungsprüfung in T2A oder WiSo möglich, Gewichtung 2:1 (§ 15).

## 6. Module im Überblick

20 Module, **1160 Einheiten** (bei 7.5 Minuten im Schnitt ≈ 145 Stunden Lernzeit; 5800–9280 Fragen).

| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `M0` | Querschnitt: Betrieb, Ausbildung, Sicherheit, Nachhaltigkeit, digitale Arbeitswelt | 1 | querschnitt | 60 | ja | WISO-1, T1-5, T1-4 |
| 1 | `LF1` | Das Unternehmen vorstellen und die eigene Rolle mitgestalten | 1 | lernfeld | 80 | nein | T1-4, T1-1, WISO-1 |
| 2 | `LF2` | Projekte planen und durchführen | 1 | lernfeld | 40 | nein | T1-4, T1-5 |
| 3 | `LF3` | Kundenaufträge bearbeiten und überwachen | 1 | lernfeld | 80 | nein | T1-1, T2A-2, T2A-5 |
| 4 | `LF4` | Beschaffungsprozesse planen und steuern | 1 | lernfeld | 40 | nein | T1-2 |
| 5 | `LF5` | Wertströme buchhalterisch dokumentieren und auswerten | 1 | lernfeld | 80 | nein | T1-3 |
| 6 | `LF6` | Leistungserstellung planen, steuern und kontrollieren | 2 | lernfeld | 80 | nein | T1-1 |
| 7 | `LF7` | Logistik- und Lagerprozesse koordinieren, umsetzen und überwachen | 2 | lernfeld | 40 | nein | T1-2 |
| 8 | `T1` | Abschlussprüfung Teil 1: Training „Leistungserstellung, Logistik, Beschaffung und Buchhaltung“ | 2 | pruefung | 40 | nein | T1 |
| 9 | `LF8` | Kosten- und Leistungsrechnung zur Vorbereitung unternehmerischer Entscheidungen durchführen | 2 | lernfeld | 80 | nein | T2A-4 |
| 10 | `LF9` | Marketingkonzepte planen und umsetzen | 2 | lernfeld | 80 | nein | T2A-1, T2A-5 |
| 11 | `DIG` | Digitale Geschäftsprozesse im Unternehmen gestalten | 2 | ao-kern | 20 | nein | T1-5 |
| 12 | `EG` | Einsatzgebiet: Lösungen erarbeiten, Aufgaben und Prozesse koordinieren | 2 | ao-kern | 70 | nein | T2B-1, T2B-2, T2B-3 |
| 13 | `LF10` | Jahresabschluss vorbereiten, auswerten und für Finanzierungsentscheidungen nutzen | 3 | lernfeld | 80 | nein | T2A-4 |
| 14 | `LF11` | Geschäftsprozesse an gesamtwirtschaftlichen Rahmenbedingungen ausrichten | 3 | lernfeld | 80 | nein | WISO-1 |
| 15 | `LF12` | Personalprozesse planen, steuern und kontrollieren | 3 | lernfeld | 80 | nein | T2A-3 |
| 16 | `LF13` | Betriebliche Problemlösungsprozesse innovativ durchführen | 3 | lernfeld | 40 | nein | T2B-1, T2B-3 |
| 17 | `T2A` | Abschlussprüfung Teil 2: Training „Marketing, Vertrieb, Personalwesen und kaufmännische Steuerung und Kontrolle“ | 3 | pruefung | 40 | nein | T2A |
| 18 | `FA` | Fachaufgabe im Einsatzgebiet: Antrag, Dokumentation, Präsentation, Fachgespräch | 3 | pruefung | 20 | nein | T2B |
| 19 | `WISO` | Wirtschafts- und Sozialkunde | 3 | wiso | 30 | nein | WISO-1, T2C |
| | | **Summe** | | | **1160** | | |

Reihenfolge = Lernreihenfolge. Querschnitt-Module werden über den Kurs gestreut (etwa jede fünfte Einheit).

## 7. Module und Blöcke im Detail

### M0 · Querschnitt: Betrieb, Ausbildung, Sicherheit, Nachhaltigkeit, digitale Arbeitswelt

- Jahr 1 · querschnitt · 60 Einheiten · Niveau: Grundstufe (vor Teil 1 der Abschlussprüfung)
- AO-Berufsbild: Anlage B Nr. 1 → Organisation des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht; Anlage B Nr. 2 → Sicherheit und Gesundheit bei der Arbeit; Anlage B Nr. 3 → Umweltschutz und Nachhaltigkeit; Anlage B Nr. 4 → digitalisierte Arbeitswelt; Anlage B Nr. 6 → Zusammenarbeit, Kommunikation und individuelle Arbeitsorganisation gestalten
- Prüfungsgebiete: WISO-1, T1-5, T1-4
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5
- Hinweis: Anlage B Nr. 1–4 während der gesamten Ausbildung; der Plan-Agent streut diese Einheiten über alle Lernfelder.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `M0-1` | Ausbildungsbetrieb, Berufsbildung, Arbeits- und Tarifrecht | 16 | Aufbau und Geschäftsprozesse des Betriebes; Rechte und Pflichten aus dem Ausbildungsvertrag, Dauer (3 Jahre, § 2), Beendigung; Ausbildungsordnung und betrieblicher Ausbildungsplan; Arbeits-, Sozial-, Tarif- und Mitbestimmungsrecht; Betriebsrat, Gewerkschaften, Wirtschaftsorganisationen; Positionen der eigenen Entgeltabrechnung; Beruflicher Aufstieg und Weiterentwicklung | `indkfl-anlage`, `indkfl` |  |
| `M0-2` | Sicherheit und Gesundheit bei der Arbeit | 12 | Arbeitsschutz- und Unfallverhütungsvorschriften; Gefährdungen am Arbeitsplatz und auf dem Arbeitsweg; Ergonomie, psychische und physische Belastungen; Verhalten bei Unfällen, vorbeugender Brandschutz | `indkfl-anlage` | Sicherheit |
| `M0-3` | Umweltschutz und Nachhaltigkeit | 10 | Belastungen für Umwelt und Gesellschaft vermeiden; Material und Energie nachhaltig nutzen; Abfälle vermeiden, Wiederverwertung; Vorschläge für nachhaltiges Handeln | `indkfl-anlage` |  |
| `M0-4` | Digitalisierte Arbeitswelt | 12 | Datenschutz und Datensicherheit; Risiken digitaler Medien, betriebliche Regelungen; Informationen recherchieren, prüfen, bewerten; Lern- und Arbeitstechniken, digitale Lernmedien; Zusammenarbeit über Bereichsgrenzen, gesellschaftliche Vielfalt | `indkfl-anlage` |  |
| `M0-5` | Zusammenarbeit, Kommunikation, Arbeitsorganisation | 10 | Wertschätzende, lösungsorientierte Kommunikation, auch fremdsprachlich; Kulturelle Unterschiede; Kommunikationswege wählen; Reporte, Präsentationen, Gesprächsunterlagen; Aufgaben strukturieren und priorisieren, Besprechungen moderieren; Projektarbeit, Fehlerkultur, Konfliktlösung | `indkfl-anlage` |  |

### LF1 · Das Unternehmen vorstellen und die eigene Rolle mitgestalten

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundstufe (vor Teil 1 der Abschlussprüfung) · RLP LF 1 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage B Nr. 1 → Organisation des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht; Anlage A Nr. 1 → Leistungserstellung planen und koordinieren; Anlage B Nr. 6 → Zusammenarbeit, Kommunikation und individuelle Arbeitsorganisation gestalten
- Prüfungsgebiete: T1-4, T1-1, WISO-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF1-1` | Duales System: Beteiligte, Rechte und Pflichten, Vollmachten | 14 | Berufsbildungsgesetz, Ausbildungsordnung, Jugendarbeitsschutzgesetz; Rechte und Pflichten in der Ausbildung; Grenzen betrieblicher Vollmachten | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF1-2` | Industriebetrieb in der Gesamtwirtschaft, Leistungsprogramm, Produktionsfaktoren | 12 | Einordnung als Industriebetrieb; Leistungsprogramm; Betriebliche Produktionsfaktoren | `rlp-indkfl` |  |
| `LF1-3` | Güter-, Dienstleistungs-, Geld- und Informationsströme | 10 | Ströme von der Beschaffung bis zum Absatz; Darstellung | `rlp-indkfl` |  |
| `LF1-4` | Aufbauorganisation und Geschäftsprozesse | 14 | Organisationsformen; Ereignisgesteuerte Prozessketten; Kern- und Supportprozesse | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF1-5` | Betriebliches Umfeld: Anspruchsgruppen, Verflechtungen, Eigentümer, Rechtsformen | 10 | Interessen der Anspruchsgruppen; Internationale Verflechtungen; Eigentümerstruktur und Rechtsform | `rlp-indkfl` |  |
| `LF1-6` | Unternehmenskultur, Zielsystem, Kennzahlen | 12 | Ökonomische, soziale, ökologische, ethische Ziele; Produktivität, Wirtschaftlichkeit, Rentabilität berechnen | `rlp-indkfl` | rechnen |
| `LF1-7` | Rolle und Arbeitsplatz gestalten, Betriebsverfassung | 8 | Ergonomisch, sicher, gesundheitsgerecht arbeiten; Ziel- und adressatengerechte Kommunikation; Mitwirkung nach Betriebsverfassungsgesetz | `rlp-indkfl`, `indkfl-anlage` |  |

### LF2 · Projekte planen und durchführen

- Jahr 1 · lernfeld · 40 Einheiten · Niveau: Grundstufe (vor Teil 1 der Abschlussprüfung) · RLP LF 2 (40 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage B Nr. 6 → Zusammenarbeit, Kommunikation und individuelle Arbeitsorganisation gestalten; Anlage B Nr. 4 → digitalisierte Arbeitswelt
- Prüfungsgebiete: T1-4, T1-5
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF2-1` | Projektauftrag analysieren: Ziele und Rahmenbedingungen | 8 | Auftrag und Auftraggebende; Ziele und Rahmenbedingungen | `rlp-indkfl` |  |
| `LF2-2` | Projektmanagementmethoden: Struktur, Ablauf, Meilensteine | 12 | Projektmanagementmethode anwenden; Projektablauf planen und strukturieren; Informations- und Kommunikationsstrukturen | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF2-3` | Teamorganisation: Rollen, Regeln, Konflikte | 8 | Aufgaben im Team; Regeln der Zusammenarbeit; Konflikte erkennen und lösen | `rlp-indkfl` |  |
| `LF2-4` | Kreativitätstechniken, Fortschritt dokumentieren, Status überwachen | 6 | Kreativitätstechniken; Arbeitsfortschritt dokumentieren; Termine und Zielerreichung überwachen, Abweichungen | `rlp-indkfl` |  |
| `LF2-5` | Präsentation, Feedback, Reflexion | 6 | Projektergebnisse präsentieren; Feedbackregeln; Projektablauf bewerten und optimieren | `rlp-indkfl` |  |

### LF3 · Kundenaufträge bearbeiten und überwachen

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundstufe (vor Teil 1 der Abschlussprüfung) · RLP LF 3 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 5 → Vertriebsprozesse umsetzen; Anlage A Nr. 1 → Leistungserstellung planen und koordinieren; Anlage B Nr. 4 → digitalisierte Arbeitswelt
- Prüfungsgebiete: T1-1, T2A-2, T2A-5
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF3-1` | Kundenanfrage analysieren: Kundenstatus, Bedarf, Leistungsangebot | 10 | Kundenstatus; Kundenbedarf; Betriebliches Leistungsangebot | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF3-2` | Teilprozesse der Auftragsabwicklung | 10 | Prozessschritte von Anfrage bis Rechnung; Schnittstellen | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF3-3` | Kaufvertrag: Zustandekommen, Inhalte, Besitz und Eigentum, AGB | 14 | Zustandekommen und Inhalte; Besitz und Eigentum; Allgemeine Geschäftsbedingungen | `rlp-indkfl` |  |
| `LF3-4` | Bonität, Leistungsangebot, Services, Zahlungs- und Lieferbedingungen | 10 | Bonitätsprüfung; Zusätzliche Services; Zahlungs- und Lieferbedingungen, Nachhaltigkeit | `rlp-indkfl` |  |
| `LF3-5` | Verkaufspreis aus Selbstkosten kalkulieren, Angebot erstellen | 14 | Kalkulation auf Basis der Selbstkosten; Angebot erstellen; Kaufvertrag abschließen | `rlp-indkfl`, `indkfl-anlage` | rechnen |
| `LF3-6` | Datenschutz, Kommunikation auch in der Fremdsprache | 6 | Vorschriften zum Datenschutz bei der Auftragserfassung; Interkulturelle, fremdsprachliche Kommunikation | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF3-7` | Kaufvertragsstörungen und Beschwerdemanagement | 16 | Schlechtleistung; Nicht-Rechtzeitig-Zahlung, Verjährung, außergerichtliches Mahnverfahren; Aktives Beschwerdemanagement, Kundenzufriedenheit, Kundenbindung | `rlp-indkfl`, `indkfl-anlage` |  |

### LF4 · Beschaffungsprozesse planen und steuern

- Jahr 1 · lernfeld · 40 Einheiten · Niveau: Grundstufe (vor Teil 1 der Abschlussprüfung) · RLP LF 4 (40 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 3 → Beschaffung planen und steuern; Anlage A Nr. 2 → Logistik und Lagerprozesse planen und steuern
- Prüfungsgebiete: T1-2
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF4-1` | Bedarfsanalyse und Verbrauchsstruktur | 8 | Bedarfsanforderungen analysieren; Wert- und mengenmäßiger Anteil (ABC-Analyse) | `rlp-indkfl`, `indkfl-anlage` | rechnen |
| `LF4-2` | Materialbereitstellung, Bestellverfahren, optimale Bestellmenge | 10 | Mit und ohne Vorratshaltung; Bestellpunkt- und Bestellrhythmusverfahren; Optimale Bestellmenge | `rlp-indkfl`, `indkfl-anlage` | rechnen |
| `LF4-3` | Bezugsquellen und Lieferantenauswahl, digitale Beschaffung | 6 | Regional, national, international; Ein, zwei, mehrere Lieferanten; Digitale Beschaffung von Unternehmen zu Unternehmen | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF4-4` | Anfrage, quantitativer Angebotsvergleich, Währung und Wechselkursrisiko | 8 | Anfrage auch fremdsprachlich; Bezugskalkulation; Währungen und Wechselkursrisiko | `rlp-indkfl` | rechnen |
| `LF4-5` | Nutzwertanalyse, Bestellung, Wareneingang, Rechnungsprüfung | 4 | Qualitativer Angebotsvergleich; Bestellen, Wareneingang kontrollieren; Eingangsrechnungen prüfen, Zahlung veranlassen | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF4-6` | Vertragsstörungen: Nicht-Rechtzeitig-Lieferung, Schlechtleistung | 4 | Rechtliche und ökonomische Handlungsspielräume; Mahnschreiben, Mängelrüge | `rlp-indkfl` |  |

### LF5 · Wertströme buchhalterisch dokumentieren und auswerten

- Jahr 1 · lernfeld · 80 Einheiten · Niveau: Grundstufe (vor Teil 1 der Abschlussprüfung) · RLP LF 5 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 7 → kaufmännische Steuerung und Kontrolle durchführen
- Prüfungsgebiete: T1-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF5-1` | Aufgaben der Finanzbuchhaltung, gesetzliche Pflichten, Organisation | 10 | Ziele der Finanzbuchhaltung; Dokumentationspflicht; Organisation der Buchführung | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF5-2` | Bestands- und Erfolgskonten, Buchungssatz | 16 | Bestandskonten; Erfolgskonten; Buchungssätze bilden | `rlp-indkfl` | rechnen |
| `LF5-3` | Belege, Umsatzsteuer und Vorsteuer | 14 | Belege identifizieren; Umsatzsteuer; Vorsteuer | `rlp-indkfl` | rechnen |
| `LF5-4` | Eingangs- und Ausgangsrechnungen, Bezugskosten, Preisnachlässe, Rücksendungen | 14 | Rechnungen buchen; Bezugskosten; Preisnachlässe und Rücksendungen | `rlp-indkfl` | rechnen |
| `LF5-5` | Planmäßige Abschreibung, Anschaffungskosten, Bestandsveränderungen | 14 | Anschaffungskosten ermitteln; Planmäßige Wertminderung; Bestandsveränderungen | `rlp-indkfl` | rechnen |
| `LF5-6` | Abgleich mit Istbeständen, Korrekturen, Ergebnis beurteilen | 12 | Soll-Ist-Vergleich; Korrekturbuchungen; Ergebnis unter Unternehmenszielen beurteilen | `rlp-indkfl`, `indkfl-anlage` |  |

### LF6 · Leistungserstellung planen, steuern und kontrollieren

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachstufe (Teil 1 im 4. Halbjahr, danach Niveau Teil 2) · RLP LF 6 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 1 → Leistungserstellung planen und koordinieren; Anlage A Nr. 9 → einsatzgebietsspezifische Aufgaben und Prozesse koordinieren
- Prüfungsgebiete: T1-1
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF6-1` | Auftrag zur Leistungserstellung analysieren | 8 | Inhaltliche, technische, zeitliche Aspekte; Veränderte Kundenbedürfnisse | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF6-2` | Produktionsprogramm, Fertigungsverfahren, Digitalisierung, Nachhaltigkeit | 14 | Produktionsprogramm; Fertigungsverfahren aus ökonomischer Sicht; Digitalisierung, Nachhaltigkeit, Gesundheitsschutz | `rlp-indkfl` |  |
| `LF6-3` | Arbeitspläne und Stücklisten | 10 | Arbeitspläne lesen; Stücklisten | `rlp-indkfl` |  |
| `LF6-4` | Kapazitätsplanung, Durchlaufzeiten, optimale Losgröße | 14 | Ressourcen und Kapazitätspläne; Durchlaufzeiten ermitteln; Optimale Losgröße | `rlp-indkfl` | rechnen |
| `LF6-5` | Produktion veranlassen und überwachen, Störungen | 12 | Termine, Kosten, Mengen, Qualität überwachen; Lösungsvorschläge für Störungen; Informationstechnische Systeme der Produktion | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF6-6` | Kennzahlen und Abweichungsanalyse | 8 | Erfolg der Leistungserstellung messen; Abweichungen analysieren | `rlp-indkfl` | rechnen |
| `LF6-7` | Gewinnschwellenanalyse, Eigenfertigung oder Fremdbezug | 14 | Gewinnschwelle berechnen; Eigenfertigung oder Fremdbezug; Rationalisierung und Nachhaltigkeit | `rlp-indkfl` | rechnen |

### LF7 · Logistik- und Lagerprozesse koordinieren, umsetzen und überwachen

- Jahr 2 · lernfeld · 40 Einheiten · Niveau: Fachstufe (Teil 1 im 4. Halbjahr, danach Niveau Teil 2) · RLP LF 7 (40 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 2 → Logistik und Lagerprozesse planen und steuern
- Prüfungsgebiete: T1-2
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF7-1` | Aufgaben und Ziele der Logistik, Informations- und Materialfluss | 8 | Logistikziele; Zusammenhang Informations- und Materialfluss | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF7-2` | Transport, Umschlag, Lagerung; Lagersysteme, Kommissionierung | 10 | Logistische Teilaufgaben; Lagersysteme und Lagereinrichtungen; Kommissioniermethoden | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF7-3` | Transportmittel, multimodale Verkehrswege, Supply-Chain-Management | 8 | Innerbetriebliche Transportsysteme, auch autonome; Multimodale Verkehrswege; Supply-Chain-Management | `rlp-indkfl` |  |
| `LF7-4` | Push und Pull, Lagerhaltungs- und Transportkosten, Logistikdienstleister | 8 | Push- und Pull-Prinzip; Kosten der Lagerhaltung und des Transports; Dienstleister auswählen | `rlp-indkfl`, `indkfl-anlage` | rechnen |
| `LF7-5` | Gefahrstoffe, Sicherheit, Nachhaltigkeit, Lagerkennzahlen | 6 | Gesetzliche Vorgaben, Datenschutz; Lagerkennzahlen | `rlp-indkfl` | rechnen |

### T1 · Abschlussprüfung Teil 1: Training „Leistungserstellung, Logistik, Beschaffung und Buchhaltung“

- Jahr 2 · pruefung · 40 Einheiten · Niveau: Fachstufe (Teil 1 im 4. Halbjahr, danach Niveau Teil 2)
- AO-Berufsbild: Anlage A Nr. 1 → Leistungserstellung planen und koordinieren; Anlage A Nr. 2 → Logistik und Lagerprozesse planen und steuern; Anlage A Nr. 3 → Beschaffung planen und steuern; Anlage A Nr. 7 → kaufmännische Steuerung und Kontrolle durchführen
- Prüfungsgebiete: T1
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach § 8. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `T1-1` | Fälle zur Leistungserstellung | 10 | Praxisbezogene Fälle: Planen, Koordinieren, Bewerten entlang der Wertschöpfungskette | `indkfl-p8`, `rlp-indkfl` |  |
| `T1-2` | Fälle zu Beschaffung, Logistik und Lager | 10 | Bedarfe, Beschaffung, Logistik- und Lagerprozesse | `indkfl-p8`, `rlp-indkfl` |  |
| `T1-3` | Fälle zu Buchführung und Bilanzierung | 10 | Geschäftsfälle prüfen und bewerten; Maßnahmen bei Abweichungen | `indkfl-p8`, `rlp-indkfl` | rechnen |
| `T1-4` | Zusammenarbeit, Information, Datenschutz, Digitalisierung | 6 | Kommunikation mit internen und externen Partnern; Informationsbeschaffung, Datenschutz, Datensicherheit, Nutzen und Risiken der Digitalisierung | `indkfl-p8` |  |
| `T1-5` | Prüfungsformat | 4 | 90 Minuten, 25 Prozent Gewicht, 4. Ausbildungshalbjahr; Praxisbezogene Fälle lesen und strukturieren | `indkfl-p8`, `indkfl-p14` |  |

### LF8 · Kosten- und Leistungsrechnung zur Vorbereitung unternehmerischer Entscheidungen durchführen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachstufe (Teil 1 im 4. Halbjahr, danach Niveau Teil 2) · RLP LF 8 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 7 → kaufmännische Steuerung und Kontrolle durchführen
- Prüfungsgebiete: T2A-4
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF8-1` | Externes und internes Rechnungswesen, Abgrenzungsrechnung | 12 | Aufgaben des internen Rechnungswesens; Abgrenzung von Aufwand und Kosten | `rlp-indkfl`, `indkfl-anlage` | rechnen |
| `LF8-2` | Kostenkategorien: variabel und fix, Einzel- und Gemeinkosten | 10 | Kostenarten; Entscheidungsrelevante Kategorien | `rlp-indkfl` |  |
| `LF8-3` | Mehrstufige Kostenstellenrechnung, Maschinenstundensatz | 16 | Betriebsabrechnungsbogen; Maschinenstundensatz | `rlp-indkfl` | rechnen |
| `LF8-4` | Kostenträgerrechnung: Zuschlagskalkulation, Ist-, Normal-, Plankosten | 16 | Selbstkosten auf Vollkostenbasis; Ist- und Planwerte | `rlp-indkfl` | rechnen |
| `LF8-5` | Deckungsbeitragsrechnung: Zusatzauftrag, Preisuntergrenze, Engpass | 16 | Deckungsbeitrag; Zusatzaufträge und Preisuntergrenzen; Optimales Produktionsprogramm bei einem Engpass | `rlp-indkfl` | rechnen |
| `LF8-6` | Statische Investitionsrechnung | 10 | Kostenvergleich, Gewinnvergleich, Rentabilität, Amortisation | `rlp-indkfl` | rechnen |

### LF9 · Marketingkonzepte planen und umsetzen

- Jahr 2 · lernfeld · 80 Einheiten · Niveau: Fachstufe (Teil 1 im 4. Halbjahr, danach Niveau Teil 2) · RLP LF 9 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 4 → Marketingmaßnahmen planen und umsetzen; Anlage A Nr. 5 → Vertriebsprozesse umsetzen
- Prüfungsgebiete: T2A-1, T2A-5
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF9-1` | Marketingkonzept: Bestandteile, Projektvorgehen | 6 | Bestandteile eines Marketingkonzepts; Arbeitsschritte mit Projektmanagement | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF9-2` | Markt- und Unternehmensanalyse | 16 | Zielgruppen, Marktsegmente, Wettbewerb; Produktlebenszyklus, Portfolioanalyse, SWOT-Analyse | `rlp-indkfl` |  |
| `LF9-3` | Marktforschung | 8 | Marktanalyse und Marktbeobachtung; Primär- und Sekundärforschung | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF9-4` | Marketingziele und -strategien | 8 | Ziele festlegen; Strategien, Kreativitätstechniken | `rlp-indkfl` |  |
| `LF9-5` | Marketinginstrumente und Wettbewerbsrecht | 20 | Produktpolitik; Preis- und Konditionenpolitik; Kommunikationspolitik, Online-Marketing; Distributionspolitik; Wettbewerbsrechtliche Grenzen | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF9-6` | Außenhandel: Incoterms, Dokumentenakkreditiv, Dokumenteninkasso | 10 | Chancen und Risiken des Außenhandels; Incoterms; Dokumentenakkreditiv und -inkasso | `rlp-indkfl` |  |
| `LF9-7` | Marketing-Mix, Präsentation, Kennzahlen | 12 | Marketing-Mix kombinieren; Präsentation, Urheberrecht, Datenschutz; Zielerreichung mit Kennzahlen bewerten | `rlp-indkfl`, `indkfl-anlage` | rechnen |

### DIG · Digitale Geschäftsprozesse im Unternehmen gestalten

- Jahr 2 · ao-kern · 20 Einheiten · Niveau: Fachstufe (Teil 1 im 4. Halbjahr, danach Niveau Teil 2)
- AO-Berufsbild: Anlage B Nr. 5 → digitale Geschäftsprozesse im Unternehmen gestalten; Anlage B Nr. 4 → digitalisierte Arbeitswelt
- Prüfungsgebiete: T1-5
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `DIG-1` | Anwendungssysteme, Nutzen und Risiken der Digitalisierung, Datenquellen | 8 | Betriebliche Anwendungssysteme; Nutzen und Risiken digitaler Geschäftsprozesse; Datenquellen nach Aktualität, Seriosität, Verwendbarkeit prüfen | `indkfl-anlage` |  |
| `DIG-2` | Prozesse analysieren und digital weiterentwickeln | 8 | Vorhandene Prozesse analysieren; Schnittstellenoptimierte, automatisierte Teilprozesse konzipieren; Betriebliche Vorgaben, Recht, Wirtschaftlichkeit | `indkfl-anlage` |  |
| `DIG-3` | Digitalisierungskonzepte umsetzen, Daten zusammenführen | 4 | Umsetzung mit internen und externen Schnittstellen; Informationen und Datenmengen zusammenführen und auswerten | `indkfl-anlage` |  |

### EG · Einsatzgebiet: Lösungen erarbeiten, Aufgaben und Prozesse koordinieren

- Jahr 2 · ao-kern · 70 Einheiten · Niveau: Fachstufe (Teil 1 im 4. Halbjahr, danach Niveau Teil 2)
- AO-Berufsbild: Anlage A Nr. 8 → einsatzgebietsspezifische Lösungen erarbeiten; Anlage A Nr. 9 → einsatzgebietsspezifische Aufgaben und Prozesse koordinieren; § 4 Abs. 4 → einsatzgebietsspezifische Lösungen erarbeiten
- Prüfungsgebiete: T2B-1, T2B-2, T2B-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Der Betrieb legt ein Einsatzgebiet nach § 4 Abs. 4 fest (sieben Gebiete oder ein abweichendes). Der Plan-Agent nimmt EG-0 plus den Block des gewählten Gebiets; bei abweichendem Gebiet nur EG-0.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `EG-0` | Methodik für jedes Einsatzgebiet | 14 | Informationen für einsatzgebietsspezifische Anforderungen beschaffen und auswerten; Aufgaben kennzahlengestützt analysieren, Lösungen erarbeiten; Entscheidungsvorlagen strukturieren und präsentieren; Mit internen und externen Partnern kooperieren; Ressourcen und Leistungen planen, überwachen, steuern; Qualitätssicherungssysteme anwenden | `indkfl-anlage`, `indkfl-p4` |  |
| `EG-1` | Einsatzgebiet Vertrieb | 8 | Vertriebsprozesse und Schnittstellen; Kennzahlen des Vertriebs; Typische Fachaufgaben | `indkfl-anlage`, `indkfl-p4` |  |
| `EG-2` | Einsatzgebiet Marketing | 8 | Marketingprozesse; Kennzahlen; Typische Fachaufgaben | `indkfl-anlage`, `indkfl-p4` |  |
| `EG-3` | Einsatzgebiet Beschaffung | 8 | Beschaffungsprozesse; Lieferantenkennzahlen; Typische Fachaufgaben | `indkfl-anlage`, `indkfl-p4` |  |
| `EG-4` | Einsatzgebiet Logistik | 8 | Logistikprozesse; Lager- und Transportkennzahlen; Typische Fachaufgaben | `indkfl-anlage`, `indkfl-p4` |  |
| `EG-5` | Einsatzgebiet Personalwirtschaft | 8 | Personalprozesse; Personalkennzahlen; Typische Fachaufgaben | `indkfl-anlage`, `indkfl-p4` |  |
| `EG-6` | Einsatzgebiet Leistungserstellung | 8 | Produktionsprozesse; Produktionskennzahlen; Typische Fachaufgaben | `indkfl-anlage`, `indkfl-p4` |  |
| `EG-7` | Einsatzgebiet kaufmännische Steuerung und Kontrolle | 8 | Controllingprozesse; Kennzahlen und Berichte; Typische Fachaufgaben | `indkfl-anlage`, `indkfl-p4` |  |

### LF10 · Jahresabschluss vorbereiten, auswerten und für Finanzierungsentscheidungen nutzen

- Jahr 3 · lernfeld · 80 Einheiten · Niveau: Fachstufe (Niveau Teil 2 der Abschlussprüfung) · RLP LF 10 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 7 → kaufmännische Steuerung und Kontrolle durchführen
- Prüfungsgebiete: T2A-4
- Fragetypen-Mix (%): auswahl 35, zuordnen 15, lueckentext 10, reihenfolge 15, rechnen 25

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF10-1` | Bilanz und Gewinn- und Verlustrechnung einer Kapitalgesellschaft | 10 | Inhalte der Bilanz; Gewinn- und Verlustrechnung | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF10-2` | Bewertungsgrundsätze, -prinzipien und -maßstäbe | 14 | Niederstwert-, Anschaffungswert-, Realisations-, Imparitätsprinzip; Anschaffungs- und Herstellungskosten, Tageswert | `rlp-indkfl` |  |
| `LF10-3` | Inventurdifferenzen, Rechnungsabgrenzung, Rückstellungen | 14 | Bereinigte Salden; Antizipative und transitorische Posten; Rückstellungen | `rlp-indkfl` | rechnen |
| `LF10-4` | Bewertung von Vermögen, Schulden, Eigenkapital | 12 | Bewertung nach Handelsrecht; Mitwirkung an Bilanz und GuV | `rlp-indkfl` | rechnen |
| `LF10-5` | Kennzahlen des Jahresabschlusses | 16 | Vermögens- und Kapitalstruktur; Anlagenfinanzierung, Liquidität; Rentabilität, Cash-Flow | `rlp-indkfl` | rechnen |
| `LF10-6` | Finanzierung und Kreditsicherheiten | 14 | Finanz- und Liquiditätsplanung; Innen- und Außenfinanzierung, Eigen- und Fremdfinanzierung; Sicherungsübereignung, Eigentumsvorbehalt, Grundschuld | `rlp-indkfl`, `indkfl-anlage` |  |

### LF11 · Geschäftsprozesse an gesamtwirtschaftlichen Rahmenbedingungen ausrichten

- Jahr 3 · lernfeld · 80 Einheiten · Niveau: Fachstufe (Niveau Teil 2 der Abschlussprüfung) · RLP LF 11 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 1 → Leistungserstellung planen und koordinieren; Anlage B Nr. 1 → Organisation des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht
- Prüfungsgebiete: WISO-1
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF11-1` | Wirtschaftskreislauf einer offenen Volkswirtschaft | 12 | Wirtschaftssubjekte; Modell des Wirtschaftskreislaufs | `rlp-indkfl` |  |
| `LF11-2` | Wirtschaftsordnung und soziale Marktwirtschaft | 12 | Ordnungsrahmen der Bundesrepublik; Einfluss auf einzelbetriebliches Handeln | `rlp-indkfl` |  |
| `LF11-3` | Märkte: Polypol, Angebotsoligopol, Preis- und Mengenpolitik | 12 | Unternehmen als Anbieter und Nachfrager; Marktformen; Preis- und mengenpolitische Spielräume | `rlp-indkfl` | rechnen |
| `LF11-4` | Kooperation, Konzentration, Wettbewerbs- und Kartellrecht | 10 | Chancen und Risiken; Nationales und europäisches Wettbewerbsrecht | `rlp-indkfl` |  |
| `LF11-5` | Konjunkturphasen, Stabilität und Wachstum | 10 | Konjunkturzyklus; Staatliche Maßnahmen | `rlp-indkfl` |  |
| `LF11-6` | Wirtschafts- und Geldpolitik | 14 | Konjunktur-, Prozess-, Struktur-, Fiskalpolitik; Offenmarktpolitik der Europäischen Zentralbank | `rlp-indkfl` |  |
| `LF11-7` | Globalisierung, europäische und weltweite Organisationen | 10 | Einflüsse der Globalisierung; Organisationen; Geschäftsprozess adressatengerecht präsentieren | `rlp-indkfl` |  |

### LF12 · Personalprozesse planen, steuern und kontrollieren

- Jahr 3 · lernfeld · 80 Einheiten · Niveau: Fachstufe (Niveau Teil 2 der Abschlussprüfung) · RLP LF 12 (80 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 6 → Personalprozesse umsetzen; Anlage B Nr. 1 → Organisation des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht
- Prüfungsgebiete: T2A-3
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF12-1` | Personalbedarf und Stellenbeschreibung | 10 | Quantitativer und qualitativer Bedarf; Interne und externe Einflussfaktoren; Gesellschaftliche Verantwortung | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF12-2` | Personalbeschaffung, Personalauswahl, Arbeitgebermarke | 14 | Beschaffungswege; Auswahlinstrumente; Stellenausschreibung, auch fremdsprachig und digital | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF12-3` | Individual- und Kollektivarbeitsrecht, Inklusion | 12 | Personalrechtliche Regelungen; Inklusion und Integration | `rlp-indkfl` |  |
| `LF12-4` | Arbeitszeit- und Arbeitsortmodelle, Entgeltformen | 8 | Flexible Modelle; Formen des betrieblichen Entgelts | `rlp-indkfl` |  |
| `LF12-5` | Einstellung, Arbeitsvertrag, Personalakte, Datenschutz | 10 | Auswahl- und Einstellungsverfahren; Arbeitsverträge erstellen; Personalakte unter Datenschutz | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF12-6` | Personaleinsatz, Arbeitszeit, Urlaub, Brutto- und Nettoentgelt | 14 | Arbeitszeitregelungen und Urlaub; Bruttoentgelt ermitteln; Nettoentgelt berechnen | `rlp-indkfl`, `indkfl-anlage` | rechnen |
| `LF12-7` | Beurteilung, Personalentwicklung, Beendigung von Arbeitsverhältnissen | 12 | Mitarbeiterbeurteilung; Personalentwicklung, Motivation; Beendigung von Arbeitsverhältnissen | `rlp-indkfl`, `indkfl-anlage` |  |

### LF13 · Betriebliche Problemlösungsprozesse innovativ durchführen

- Jahr 3 · lernfeld · 40 Einheiten · Niveau: Fachstufe (Niveau Teil 2 der Abschlussprüfung) · RLP LF 13 (40 Std., `rlp-indkfl`)
- AO-Berufsbild: Anlage A Nr. 8 → einsatzgebietsspezifische Lösungen erarbeiten; Anlage A Nr. 9 → einsatzgebietsspezifische Aufgaben und Prozesse koordinieren; Anlage B Nr. 6 → Zusammenarbeit, Kommunikation und individuelle Arbeitsorganisation gestalten
- Prüfungsgebiete: T2B-1, T2B-3
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `LF13-1` | Komplexe Fragestellung analysieren: Prozesse, Schnittstellen, Wechselwirkungen | 8 | Fragestellung erschließen; Betroffene Prozesse und Schnittstellen | `rlp-indkfl`, `indkfl-anlage` |  |
| `LF13-2` | Recherche, Trends, Innovationen, digitale Anwendungen | 8 | Lösungsorientierte Recherche, auch fremdsprachlich; Entwicklungstrends und Innovationen | `rlp-indkfl` |  |
| `LF13-3` | Ziele festlegen, Lösungsprozess planen | 8 | Ziele definieren; Planung mit Projektmanagementmethoden | `rlp-indkfl` |  |
| `LF13-4` | Methodengeleitet bearbeiten, Kreativitätstechniken | 8 | Innovative Ideen aufgreifen; Informationen zusammenführen; Termine und Zuständigkeiten beachten | `rlp-indkfl` |  |
| `LF13-5` | Dokumentieren, präsentieren, bewerten, reflektieren | 8 | Vorgehen und Ergebnis zielgruppengerecht darstellen; Zielerreichung bewerten; Verbesserungspotenziale | `rlp-indkfl`, `indkfl-anlage` |  |

### T2A · Abschlussprüfung Teil 2: Training „Marketing, Vertrieb, Personalwesen und kaufmännische Steuerung und Kontrolle“

- Jahr 3 · pruefung · 40 Einheiten · Niveau: Fachstufe (Niveau Teil 2 der Abschlussprüfung)
- AO-Berufsbild: Anlage A Nr. 4 → Marketingmaßnahmen planen und umsetzen; Anlage A Nr. 5 → Vertriebsprozesse umsetzen; Anlage A Nr. 6 → Personalprozesse umsetzen; Anlage A Nr. 7 → kaufmännische Steuerung und Kontrolle durchführen
- Prüfungsgebiete: T2A
- Fragetypen-Mix (%): auswahl 40, zuordnen 20, lueckentext 15, reihenfolge 10, rechnen 15
- Hinweis: Eigene praxisbezogene Fälle nach § 11. Keine IHK-Prüfungsaufgaben.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `T2A-1` | Fälle zu Marketing | 8 | Marketingmaßnahmen planen, umsetzen, bewerten; Rechtliche, ökonomische, ökologische, soziale Aspekte | `indkfl-p11`, `rlp-indkfl` |  |
| `T2A-2` | Fälle zu Vertrieb und Kundenbindung | 8 | Vertriebsprozesse mit Schnittstellen; Kundenzufriedenheit und Kundenbindung | `indkfl-p11`, `rlp-indkfl` |  |
| `T2A-3` | Fälle zu Personalprozessen | 8 | Arbeits- und sozialrechtliche Bestimmungen; Betriebliche und tarifliche Regelungen | `indkfl-p11`, `rlp-indkfl` |  |
| `T2A-4` | Fälle zu Kosten- und Leistungsrechnung, Kennzahlen, Jahresabschluss | 12 | KLR anwenden; Kennzahlen ermitteln und analysieren; Instrumente der Steuerung und Kontrolle | `indkfl-p11`, `rlp-indkfl` | rechnen |
| `T2A-5` | Englische Fachbegriffe und Prüfungsformat | 4 | Englischsprachige Informationen situationsbezogen anwenden; 150 Minuten, 35 Prozent Gewicht | `indkfl-p11`, `indkfl-p14` |  |

### FA · Fachaufgabe im Einsatzgebiet: Antrag, Dokumentation, Präsentation, Fachgespräch

- Jahr 3 · pruefung · 20 Einheiten · Niveau: Fachstufe (Niveau Teil 2 der Abschlussprüfung)
- AO-Berufsbild: Anlage A Nr. 8 → einsatzgebietsspezifische Lösungen erarbeiten; Anlage A Nr. 9 → einsatzgebietsspezifische Aufgaben und Prozesse koordinieren
- Prüfungsgebiete: T2B
- Fragetypen-Mix (%): auswahl 35, zuordnen 20, lueckentext 10, reihenfolge 25, rechnen 10
- Hinweis: Übungsformat nach § 12; die reale Fachaufgabe entsteht im Betrieb. Keine Personendaten in Beispielen.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `FA-1` | Antrag an den Prüfungsausschuss | 6 | Kurzbeschreibung der Aufgabenstellung; Zielsetzung; Zu berücksichtigende Prozesse; Bestätigung der eigenständigen Durchführung | `indkfl-p12` |  |
| `FA-2` | Dokumentation (3 bis 5 Seiten) | 6 | Aufgabenstellung, Zielsetzung, Planung; Durchführung und Begründung der Vorgehensweise; Ergebnis und Bewertung; Bis zu drei Seiten praxisübliche Anlagen | `indkfl-p12` |  |
| `FA-3` | Präsentation und fallbezogenes Fachgespräch | 8 | Präsentation bis 10 Minuten; Fachgespräch, zusammen 30 Minuten; Gewichtung: Dokumentation 10, Präsentation 20, Fachgespräch 70 Prozent | `indkfl-p12`, `indkfl-p14` |  |

### WISO · Wirtschafts- und Sozialkunde

- Jahr 3 · wiso · 30 Einheiten · Niveau: Fachstufe (Niveau Teil 2 der Abschlussprüfung)
- AO-Berufsbild: Anlage B Nr. 1 → Organisation des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht; Anlage A Nr. 6 → Personalprozesse umsetzen
- Prüfungsgebiete: WISO-1, T2C
- Fragetypen-Mix (%): auswahl 40, zuordnen 25, lueckentext 20, reihenfolge 10, rechnen 5
- Hinweis: § 13: allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge; Inhalt aus Anlage B Nr. 1 und Lernfeldern 1, 11, 12.

| Block | Titel | Einheiten | Themen | Quellen | Merker |
| --- | --- | --- | --- | --- | --- |
| `WISO-1` | Berufs- und Arbeitswelt: Ausbildung, Arbeitsrecht, Mitbestimmung, Tarif | 10 | Duales System; Arbeits- und Tarifrecht; Betriebliche Mitbestimmung | `indkfl`, `indkfl-anlage` |  |
| `WISO-2` | Soziale Sicherung, Entgeltabrechnung, Vorsorge | 10 | Sozialversicherung; Entgeltabrechnung; Private Vorsorge | `indkfl`, `indkfl-anlage` |  |
| `WISO-3` | Wirtschaftsordnung, Wirtschaftskreislauf, Europa, Globalisierung | 10 | Soziale Marktwirtschaft; Wirtschaftskreislauf; Europa und globale Vernetzung | `indkfl`, `rlp-indkfl` |  |

## 8. Erzeugungsphasen

Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md).

| Phase | Module | Einheiten | Warum |
| --- | --- | --- | --- |
| A | `M0`, `LF1`, `LF2`, `LF3` | 260 | Einstieg: Unternehmen, Rolle, Projektarbeit, Auftragsabwicklung. |
| B | `LF4`, `LF5`, `LF6`, `LF7`, `T1` | 280 | Beschaffung, Buchführung, Leistungserstellung, Logistik, Training Teil 1 (LF 1–7 vor Teil 1). |
| C | `LF8`, `LF9`, `DIG`, `EG` | 250 | KLR, Marketing, digitale Geschäftsprozesse, Einsatzgebiete. |
| D | `LF10`, `LF11`, `LF12`, `LF13`, `T2A`, `FA`, `WISO` | 370 | Jahresabschluss, Gesamtwirtschaft, Personal, Problemlösung, Training Teil 2, Fachaufgabe, WiSo. |
| | **Summe** | **1160** | |

## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)

1. Einsatzgebiete (§ 4 Abs. 4) sind keine Fachrichtungen: Lernfelder und Teil 1/Teil 2 schriftlich sind für alle gleich. Darum eine Map mit einem Modul EG, das pro Einsatzgebiet einen Block hat; Lernende wählen ihr Gebiet.
2. Betriebe dürfen ein abweichendes Einsatzgebiet festlegen; dafür gilt nur der Methodikblock EG-0.
3. Wochen der Anlage A: 1.–15. Monat 64 Wochen, 16.–36. Monat 92 Wochen (Summen der Richtwerte, inkl. Anlage B Nr. 5 und 6).
4. Der RLP 2023 ist kompetenzorientiert ohne Inhaltslisten; die Themen je Block sind aus den Lernfeldbeschreibungen abgeleitet (verbindliche Mindestinhalte sind dort kursiv).
5. Einheiten-Budget: 1 Einheit je Unterrichtsstunde; M0, DIG, EG, Prüfungstrainings und WiSo nach Gewicht in Anlage und § 14.
6. WiSo (§ 13) hat im kaufmännischen RLP kein eigenes KMK-Qualifikationsprofil; Inhalt aus Anlage B Nr. 1 und Lernfeldern 1, 11, 12.

