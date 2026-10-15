# Sicherheits-Stichprobe MAF Metall (SIN-272)

Erzeugt mit `node --import tsx scripts/safety-sample.mjs`. Das Skript prüft nur, ob Quelle und Abrufdatum vorhanden und plausibel sind und ob die Quelle in der Quellenliste der Lehrplan-Karte steht. **Es bewertet nicht, ob der Inhalt fachlich stimmt.** Das macht ein Mensch (Spalte „Mensch“).

- Datum: 2026-10-15
- Seed: 272
- Stichprobengröße: 15 (angefragt 15)
- Veröffentlichte Einheiten: 669, davon sicherheitsrelevant: 393
- Datenquelle: https://content-agent-ashen-nu.vercel.app/api/learner/phase-a (supabase)
- Reproduzieren: gleiche Einheiten und gleicher Seed ergeben dieselbe Liste.

## Ergebnis je Einheit

| Einheit | Titel | Modul | Quelle | Abruf | Befund | Mensch |
| --- | --- | --- | --- | --- | --- | --- |
| LF6-6-u8 | Anlagensicherheit: Schutzeinrichtungen und Störungsbeseitigung | LF6 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF8-3-u7 | Einrichteblatt: Sicher einrichten vor dem Maschinenstart | LF8 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| PA-1-u2 | Trennen, Umformen, Urformen: Maschinen nach Funktion unterscheiden – und sicher bedienen | PA | https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html (ausbildungsordnung) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF9-3-u5 | Teilsysteme fachgerecht demontieren | LF9 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF6-4-u5 | Näherungsschalter und Sensorauswahl | LF6 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF8-6-u8 | Variable Prüfung und Fertigungsparameter: Maß, Oberfläche, Zeit | LF8 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF9-1-u1 | Ausfallbedingter Eingriff: erst sichern, dann öffnen | LF9 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| M0-2-u9 | Gefahr melden: Ausbilder, Betriebsrat und JAV als Ansprechpartner | M0 | https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html (ausbildungsordnung) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| M0-2-u3 | Beschaffung: Material, Lager und sichere Wege | M0 | https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html (ausbildungsordnung) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF8-5-u7 | Programm durch Simulation prüfen | LF8 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| PA-2-u3 | Rüstvorgang nach Vorgabe: sicher beginnen, sicher ausführen | PA | https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html (ausbildungsordnung) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| ZP-3-u2 | Prüfen, dokumentieren und Umwelt schützen | ZP | https://www.gesetze-im-internet.de/maschf_ausbv/__8.html (pruefung) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF8-4-u14 | Technologiedaten festlegen und Programmstart sicher freigeben | LF8 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF1-3-u11 | Metalle nach Verwendungszweck wählen – sicher sägen, feilen, entgraten | LF1 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |
| LF1-3-u1 | Einteilung der Werkstoffe: erst erkennen, dann bearbeiten | LF1 | https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf (rahmenlehrplan) | 2026-10-03 | Quelle und Abrufdatum vorhanden | offen |

## Fehlende oder auffällige Angaben

Keine.

## Bestätigung durch einen Menschen

Offen. Die Prüfperson gleicht jede Einheit mit der amtlichen Quelle (Ausbildungsordnung, Rahmenlehrplan) ab, trägt Name, Datum und Ergebnis hier ein und setzt danach `content-safety` in `docs/product-readiness.json` mit Datum und Beleg auf diesen Bericht.
