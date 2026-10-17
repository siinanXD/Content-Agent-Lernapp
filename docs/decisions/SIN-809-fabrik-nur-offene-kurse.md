# SIN-809: Fabrik erzeugt im Durchlauf nur für offene Content-Punkte

- Issue: https://linear.app/sinan-kahraman/issue/SIN-809/content-fabrik-erzeugt-weiter-maf-statt-industriekaufmann-26-neue-maf
- Vorgänger: `docs/decisions/SIN-769-indkfl-vorrang.md`, `SIN-431-indkfl-fabrik.md`
- Code: `offeneContentMaps`, `chooseRunMap(…, nurMaps)` in `src/lib/generate/content-grow.ts`, `scripts/content-grow.ts`, `recordFactoryRun` in `factory-status.ts`; Test `content-grow.test.ts`

## Entscheidung

- Solange `docs/FERTIG.md` offene Content-Punkte hat (Durchlauf), wählt die Fabrik nur Maps dieser Punkte: „Industriekaufmann“ → `indkfl`. Abgehakte Kurse (MAF Metall) kommen nicht dran. Ist in diesen Maps nichts offen, endet der Lauf sauber mit Exit 0, statt auf Metall auszuweichen.
- Ursache: SIN-769 griff nur mit `resumeModuleId`. Ohne Fortsetzung kam die Regel „Metall mit unberührten Modulen zuerst“ (SIN-469) vor Industriekaufmann.
- `recordFactoryRun` wiederholt bei „fetch failed“ bis zu 3-mal (2 s, 4 s Pause), danach bleibt es bei der Warnung im Lauf.

## Annahmen

- „Industriemechaniker veröffentlichen“ braucht keine Erzeugung (läuft über `content-publish`), darum keine Map dafür.
- Der Run-Link und die Zählung der Industriekaufmann-Einheiten in Supabase entstehen erst im ersten Lauf nach dem Merge.

## Warum

Der Lauf vom 17.10. erzeugte 26 MAF-Einheiten statt Industriekaufmann; das Geld floss in den falschen Kurs.
