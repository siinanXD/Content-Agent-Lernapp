# SIN-261: merge-gate wieder als echter Job

- Issue: https://linear.app/sinan-kahraman/issue/SIN-261/bug-pflicht-check-merge-gate-wird-nicht-gemeldet-kein-pr-mergt
- Ersetzt: SIN-247 (Check-Run per Checks-API)
- Doku: https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets

## Entscheidung

Variante B. `pr-gate.yml` hat wieder einen echten Job `merge-gate` (`needs: gate`, `if: always()`). Der Job `gate` liefert den Output `waiting`. `merge-gate` ist grün bei Erfolg, rot bei Gate-Fehler und rot mit Meldung „wartet auf Freigabe“ bei `risk:high` ohne Label. Der Schritt per `checks.create` und das Recht `checks: write` entfallen.

## Annahmen

- Ursache nicht aus den Logs belegt (kein Zugriff auf Actions-Logs und Ruleset). Wahrscheinlich ordnet das Ruleset den Check-Run nicht dem Workflow-Job zu. Ein echter Job löst das unabhängig davon.
- „Gelb statt rot“ (SIN-247) entfällt: Ein Job kann nicht offen bleiben, ohne den Concurrency-Slot des PRs zu blockieren (kein cancel-in-progress), und das Label-Ereignis käme nicht durch. Rot mit klarer Meldung ist robust. Steckbrief und Status-Seite trennen „wartet“ weiter von „Fehler“.
- Das Label `freigegeben` löst pr-gate neu aus; `merge-gate` im neuen Lauf wird grün und ersetzt das rote Ergebnis. `regate` startet nach CI den letzten Lauf neu.
- Ein echter End-to-End-Test geht nur im Live-Repo (Test-PR `risk:medium` mergt, `risk:high` nach Label). Lokal sichert ein Test, dass der Job `merge-gate` existiert und kein Check-Run mehr geschrieben wird.
- Dieser PR ändert das Gate selbst (`risk:high`) und wird vermutlich per Admin-Bypass gemergt.

## Warum

Ein echter Job mit dem Namen des Pflicht-Checks ist der einfachste Weg, den das Ruleset sicher erkennt.
