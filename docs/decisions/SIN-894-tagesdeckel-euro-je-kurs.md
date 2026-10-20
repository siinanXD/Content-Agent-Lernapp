# SIN-894: Tagesdeckel für run-task zählt Euro, Lauf je Kurs

- **Links:** Linear [SIN-894](https://linear.app/sinan-kahraman/issue/SIN-894); Vorgänger SIN-444 (schnelle Fehlschläge), Lehre in `docs/autonomy/LEHREN.md`. Keine externe Lösung nötig: reine Änderung an `scripts/autonomy/run-task.mjs`; Doku GitHub `workflow_dispatch` Eingaben (Typ `string`) und Repo-Variablen (`vars.*`).
- **Entscheidung:** Für `judge-backfill` zählt der Tagesdeckel Euro (Summe `judge_runs.cost_eur` des UTC-Tages) statt Läufe. Standard 40 €, änderbar über die Repo-Variable `TAGESDECKEL_EUR`. Summe ≥ Deckel stoppt den Lauf und schreibt den Grund in `loop_events` (Schritt `tagesdeckel`). Neue Eingabe `kurs` filtert auf einen Kurs (`courses.keyword`, ohne Groß-/Kleinschreibung). Der Deckel je Lauf (19 €, hart 20 €) bleibt.
- **Warum:** Ein Lauf kostet ca. 0,86 € je 1.750 Fragen; ein Lauf je Tag blockierte die nötigen Läufe für Industriemechaniker und Industriekaufmann, obwohl kaum Geld verbraucht war.

## Annahmen

- 40 € ist der Standard laut Issue; Sinan kann ihn per Repo-Variable ändern (keine Code-Änderung nötig). Der Betrag wird als zusätzliche Grenze neben Wochendeckel (40 €) und Lauf-Deckel gelesen, nicht als Erhöhung dieser.
- Andere bezahlte Aufgaben (`ab-*`) behalten „1 Lauf je Aufgabe und Tag“; sie schreiben nicht nach `judge_runs`.
- Fehlt der Supabase-Zugang, wird der Euro-Deckel nicht geprüft (kein Stopp); der Lauf selbst braucht dieselben Secrets und bricht dann ohnehin ab.
- Ein laufender Lauf, der noch nicht in `judge_runs` steht, zählt erst nach seinem Ende; die Gruppe `run-task-<task>` verhindert Parallelläufe.
