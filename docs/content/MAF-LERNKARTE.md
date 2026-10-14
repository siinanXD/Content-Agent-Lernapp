# Lernkarte MAF Metall (SIN-652)

Stand der Map: 2026-10-03. Erzeugt aus [`maf-metall.json`](maf-metall.json) mit `node scripts/maf-lernkarte.mjs`. KI-erzeugt, Prüfung und Freigabe macht ein Mensch; nicht von Hand ändern.

## 1. Ausbildungsinhalte (Berufsbildpositionen)

Quelle jeder Zeile: `ao-anlage`, [MaschFüAusbV Anlage (zu § 5) – Ausbildungsrahmenplan mit zeitlichen Richtwerten, Abschnitte I und II.A–E](https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html), Abruf 2026-10-03. Wochen je Abschnitt der Anlage; Einheiten = Summe der Soll-Einheiten der Module, die die Position nennen.

| Nr. | Berufsbildposition | Wochen (Anlage) | Module | Einheiten (Soll) |
| --- | --- | --- | --- | --- |
| 1 | Berufsbildung, Arbeits- und Tarifrecht | anlage-I: ganze Ausbildung | `M0`, `WISO`, `SBP` | 120 |
| 2 | Aufbau und Organisation des Ausbildungsbetriebes | anlage-I: ganze Ausbildung | `M0`, `WISO` | 100 |
| 3 | Sicherheit und Gesundheitsschutz bei der Arbeit | anlage-I: ganze Ausbildung | `M0`, `LF4`, `ZP` | 160 |
| 4 | Umweltschutz | anlage-I: ganze Ausbildung | `M0`, `LF4`, `ZP`, `SBP` | 180 |
| 5 | Zuordnen und Handhaben von Werk-, Betriebs- und Hilfsstoffen | anlage-I: 4; anlage-II-A: 8 | `LF1`, `LF5`, `APPT` | 200 |
| 6 | Betriebliche und technische Kommunikation | anlage-I: 8 | `LF1`, `LF3`, `ZP` | 180 |
| 7 | Planen und Vorbereiten von Arbeitsabläufen | anlage-I: 4; anlage-II-A: 8 | `LF1`, `LF3`, `ZP`, `LF7`, `APPP` | 250 |
| 8 | Prüfen | anlage-I: 6 | `LF1`, `LF2` | 160 |
| 9 | Branchenspezifische Fertigungstechniken | anlage-I: 22; anlage-II-A: 18 | `LF1`, `LF2`, `LF3`, `LF5`, `LF7`, `LF8`, `APPT` | 460 |
| 10 | Steuerungs- und Regelungstechnik | anlage-I: 22; anlage-II-A: 18 | `LF3`, `LF4`, `LF6` | 220 |
| 11 | Einrichten und Bedienen von Produktionsanlagen | anlage-I: 22; anlage-II-A: 18 | `LF2`, `LF6`, `PA`, `LF8`, `LF9`, `APPP` | 330 |
| 12 | Steuern des Materialflusses | anlage-I: 2; anlage-II-A: 2 | `PA`, `LF9` | 100 |
| 13 | Warten und Inspizieren von Maschinen und Anlagen | anlage-I: 4; anlage-II-A: 4 | `LF4`, `LF9`, `APPP` | 150 |
| 14 | Durchführen von qualitätssichernden Maßnahmen | anlage-I: 2; anlage-II-A: 2 | `LF5`, `QS`, `APPP` | 130 |

## 2. Lernfelder (Rahmenlehrplan)

Quelle: `rlp-maf`, [KMK Rahmenlehrplan Maschinen- und Anlagenführer/in (Beschluss 25.03.2004 i. d. F. 31.03.2023) – verweist je Schwerpunkt auf die RLP der Fortsetzungsberufe](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf), Abruf 2026-10-03. Laut Map hat der RLP MAF keine eigenen Lernfelder und verweist auf die Rahmenlehrpläne der Fortsetzungsberufe. Der Verweistext ist in diesem Lauf nicht gelesen worden (kmk.org war im Lauf nur als PDF ohne auslesbaren Text erreichbar), die Lernfeld-Zeilen bleiben darum **offen**.

| Modul | Titel | Jahr | Std. | Quelle heute | Status |
| --- | --- | --- | --- | --- | --- |
| `LF1` | Fertigen von Bauelementen mit handgeführten Werkzeugen | 1 | 80 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF2` | Fertigen von Bauelementen mit Maschinen | 1 | 80 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF3` | Herstellen von einfachen Baugruppen | 1 | 80 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF4` | Warten technischer Systeme | 1 | 80 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF5` | Fertigen von Einzelteilen mit Werkzeugmaschinen | 2 | 80 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF7` | Montieren von technischen Teilsystemen | 2 | 40 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF6` | Installieren und Inbetriebnehmen steuerungstechnischer Systeme | 2 | 60 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF8` | Fertigen auf numerisch gesteuerten Werkzeugmaschinen | 2 | 60 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |
| `LF9` | Instandsetzen von technischen Systemen | 2 | 40 | `rlp-im` via `rlp-maf` | offen: Industriemechaniker-RLP |

## 3. Lücken

- Jede Berufsbildposition der Anlage hat mindestens ein Modul.
- 9 Lernfeld-Module (LF1, LF2, LF3, LF4, LF5, LF7, LF6, LF8, LF9) beruhen auf dem Industriemechaniker-RLP (`rlp-im`). Sie müssen gegen den RLP MAF und die Fortsetzungsberufe neu belegt werden; bis dahin bleiben sie unverändert.

