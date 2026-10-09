# SIN-447: Goldset Industriekaufleute

- **Links:** Linear [SIN-447](https://linear.app/sinan-kahraman/issue/SIN-447); Vorlage `docs/quality/maf-goldset-phase-a.json` (AP-15); Lücke benannt in `docs/content/README.md` („etwa 20 geprüfte Fragen“). Quellen: [IndKflAusbV](https://www.gesetze-im-internet.de/indkflausbv/BJNR05E0A0024.html), [Anlage](https://www.gesetze-im-internet.de/indkflausbv/anlage.html), [§ 4](https://www.gesetze-im-internet.de/indkflausbv/__4.html), [§ 8](https://www.gesetze-im-internet.de/indkflausbv/__8.html), [§ 11](https://www.gesetze-im-internet.de/indkflausbv/__11.html), [§ 12](https://www.gesetze-im-internet.de/indkflausbv/__12.html), [§ 14](https://www.gesetze-im-internet.de/indkflausbv/__14.html), [KMK-Rahmenlehrplan 15.12.2023](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriekaufleute_2023-12-15-mitEL.pdf).
- **Entscheidung:** 35 statt 20 Fragen im Format des MAF-Goldsets: 12 zu Verordnung und Prüfung, je 5 Fachfragen zu Phase A (M0, LF1, LF2, LF3; gleiche Phase, die die Fabrik zuerst erzeugt) und 3 Gegenproben. Ein Satz Begründung: Ohne Gegenproben misst die Kalibrierung nur, ob der Richter durchwinkt, nicht ob er Fehler erkennt.
- **Fertige Lösung gesucht:** Ein offenes Goldset für die IndKflAusbV 2024 gibt es nicht; IHK-Prüfungsaufgaben sind verboten (AGENTS.md). Darum eigene Fragen.

## Annahmen

- Fakten zu Verordnung und Prüfung stammen aus der Map `docs/content/indkfl.json` (Rechtsstand geprüft 03.10.2026). gesetze-im-internet.de und kmk.org waren in diesem Lauf nicht abrufbar (robots/Proxy); `sourceFetchedAt` ist darum das Abrufdatum der Map.
- Fachfragen (Kaufvertrag, Verjährung, Kalkulation, Kennzahlen) sind allgemeines Fachwissen zu den Themen des Rahmenlehrplans; die Quelle ist das Lernfeld, das das Thema verlangt (wie beim MAF-Goldset).
- Erwartete Werte: Niveau 4, Sprache 4 oder 5, Sicherheitsmerkmal nur beim Block mit `safety` (M0-2).
- **Status Entwurf:** Das Goldset gilt erst als geprüft, wenn Sinan die 35 Fragen durchgesehen hat. Danach: Langfuse-Datensatz `indkfl-goldset` anlegen und den Richter damit kalibrieren.
