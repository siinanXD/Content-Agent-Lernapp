# SIN-267 — Tages-Update: Wiederholungsschutz nach Zeit statt nach Tag

- **Links:** Linear [SIN-267](https://linear.app/sinan-kahraman/issue/SIN-267/bug-tages-update-1000-kam-nicht-testlaufe-haben-den-tag-schon); [GitHub: `workflow_dispatch`-Eingaben](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch); baut auf [SIN-246](SIN-246-tages-update.md) auf. Eigenbau, eine Zeitprüfung im vorhandenen `digest.mjs`.
- **Entscheidung:** Derselbe Slot wird nur unterdrückt, wenn der letzte Merker dieses Slots weniger als 6 h alt ist. Neue Workflow-Eingabe `force` (Standard `false`) überspringt den Schutz; der Merker eines Force-Laufs trägt `force:true` und zählt weder für den Schutz noch als Beginn von „seit dem letzten Update“. Der Tag wird weiter in Europe/Berlin berechnet (`berlinDay`).
- **Annahmen:**
  1. 6 h passen zu den Zeiten 10:00 und 20:00 (10 h Abstand) und fangen Doppelaufrufe von cron-job.org ab.
  2. Alte Merker ohne `force` bleiben gültig; die Testläufe vom 05.10. liegen mehr als 6 h vor 10:00 Berlin und sperren nichts mehr.
  3. Testläufe von Hand: `gh workflow run digest.yml -f slot=morgen -f force=true`.
- **Warum:** Ein Merker pro Kalendertag ließ Testläufe um Mitternacht den ganzen Tag verbrauchen; Zeitabstand plus `force` trennt Wiederholungsschutz und Testen sauber.
