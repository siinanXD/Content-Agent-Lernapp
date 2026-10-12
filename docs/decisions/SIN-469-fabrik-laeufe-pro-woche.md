# SIN-469: Content-Fabrik läuft dreimal pro Woche

- Linear: SIN-469, SIN-220 (Fabrik), SIN-431 (zwei Maps), SIN-450 (API-Sperre), SIN-444 (Tagesdeckel)
- Docs: GitHub Actions `schedule` (POSIX-Cron, UTC): https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule
- Code: `.github/workflows/content-grow.yml`, `src/lib/generate/content-grow.ts` (`runAllowed`, `chooseRunMap`), `scripts/content-grow.ts`

## Entscheidung

- Zeitplan `47 5 * * 1,3,5`: Montag, Mittwoch, Freitag (3 Läufe pro Woche). Der Quellen-Monitor läuft im selben Job vor jedem Lauf.
- `runAllowed` prüft vor dem Erzeugen die Berichte der echten Läufe: höchstens ein Lauf je UTC-Tag und Kosten der letzten 7 Tage unter 60 € (3 × 20 €). Sonst endet der Lauf mit Exit 0 und der Meldung „Fabrik übersprungen“, ohne Bericht, ohne roten Lauf. Probeläufe zählen nicht.
- Der Deckel je Lauf bleibt unverändert (20 €, Stopp bei 19 €). Die Pause bei gesperrter API (SIN-450) bleibt: Der Lauf endet mit Exit 0, hinterlässt keinen Bericht und zählt deshalb nicht für Tag und Woche.
- `chooseRunMap`: Hat MAF Metall noch Module ohne eine veröffentlichte Einheit (heute LF3 bis LF6), bedient der Lauf Metall, auch wenn sonst Industriekaufleute dran wäre. Eine angefangene Fortsetzung hat weiter Vorrang. Innerhalb der Map nimmt `nextOpenItems` schon unberührte Module vor Lücken in begonnenen Modulen.

## Annahmen

- Wochendeckel 60 € ist abgeleitet (3 Läufe × 20 €); AGENTS.md nennt nur 20 € je Kurslauf. `WEEK_CAP_EUR` lässt sich anpassen.
- Industriekaufleute pausiert, bis Metall keine unberührten Module mehr hat; danach wechseln die Läufe wieder ab.
- Der Status „läuft wöchentlich“ (Planer, jüngster Lauf höchstens 8 Tage alt) bleibt gültig.
- Eine Handauslösung (`workflow_dispatch`) fällt unter dieselbe Tagesgrenze, außer als Probelauf.

## Warum

16 Einheiten pro Woche aus einem Lauf füllen die 890 Einheiten nicht in absehbarer Zeit. Dreimal pro Woche verdreifacht den Durchsatz, ohne den Deckel je Lauf zu ändern; Tages- und Wochengrenze halten die Kosten begrenzt.
