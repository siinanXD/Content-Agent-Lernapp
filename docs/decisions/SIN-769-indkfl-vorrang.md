# SIN-769: Industriekaufleute bekommen Vorrang in der Content-Fabrik

- Issue: https://linear.app/sinan-kahraman/issue/SIN-769/industriekaufmann-frau-content-erzeugen-belegen-veroffentlichen
- Vorgänger: `docs/decisions/SIN-431-indkfl-fabrik.md` (Map, Kurs, Quellen, Rotation)
- Code: `chooseRunMap` in `src/lib/generate/content-grow.ts`, Test `content-grow.test.ts`

## Entscheidung

Eine Kern-Map ohne eine veröffentlichte Einheit (heute `indkfl`) geht vor der Fortsetzung (`resumeModuleId`) einer anderen Map. Danach gilt wieder die Rotation aus SIN-431.

## Annahmen

- Die Berichte vom 08., 12. und 14.10. zeigen nur `maf-metall`, zuletzt mit `resumeModuleId: APPT`. Die Fortsetzungsregel hielt `indkfl` damit auf 0 Einheiten, obwohl die Rotation es vorsieht. Das ist die Ursache für „0 Einheiten“.
- Erzeugen, Richter, Content-Guard und Veröffentlichen laufen unverändert im nächsten Lauf (Mo/Mi/Fr 05:47 UTC) mit den Secrets des Workflows `content-grow.yml`. Dieser Agentenlauf hat keine Live-Keys und erzeugt selbst nichts (Grundsatz: nur amtliche Quelle, Kosten-Deckel 20 € je Lauf).
- Der Lern-App-Lesepfad für den Kurs Industriekaufmann ist nicht Teil dieses Pakets. „Im Lernpfad auffindbar“ wird nach dem ersten Lauf live geprüft.
- Das Issue bleibt „In Review“, bis Einheiten veröffentlicht sind und der Live-Check grün ist (SIN-616).
