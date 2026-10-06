# SIN-247: Gate „wartet auf Freigabe“ gelb statt rot

- Issue: https://linear.app/sinan-kahraman/issue/SIN-247/gate-wartet-auf-freigabe-gelb-statt-rot-anzeigen
- Verwandt: SIN-248, SIN-207, SIN-246
- Doku: https://docs.github.com/en/rest/checks/runs#create-a-check-run

## Entscheidung

1. Der Job in `pr-gate.yml` heißt jetzt `gate`. Den Pflicht-Check `merge-gate` schreibt dessen letzter Schritt (`if: always()`) als Check-Run über die Checks-API (`checks: write`).
2. Zustände: `risk:high` ohne Freigabe → `in_progress` („wartet auf Freigabe von Sinan“, gelb); freigegeben oder `risk:medium` → `success`; Fork, Secret-Leak, veralteter Lauf, Skript-Fehler → `failure` (rot).
3. Der Merge bleibt gesperrt: Ein nicht abgeschlossener Pflicht-Check erfüllt die Branch-Protection nicht. Auto-Merge wird wie bisher nur bei Freigabe eingeschaltet.
4. Status-Seite und Tages-Update trennten „wartet auf Freigabe“ schon von „rot“ (`needsApproval`, `stale-gate` nur bei `failure`); der Steckbrief zeigt „gelb“.

## Annahmen

- Das Ruleset verlangt den Check nur per Name `merge-gate` (nicht an eine App gebunden). Ein Check-Run des `GITHUB_TOKEN` zählt dafür wie vorher der Job. Das Ruleset wird nicht angefasst (Einstellungen sind für Agenten tabu).
- Ein eigener Check `freigabe` wäre ein neuer Pflicht-Check im Ruleset und hätte die Einstellungen geändert. Darum bleibt der Name `merge-gate`.
- Der Check-Run ist nur im Live-Repo prüfbar. Hier belegt ihn kein Test; der erste `risk:high`-PR (dieser) zeigt die Wirkung.

## Warum

Ein Job kann nur grün oder rot enden. Ein Check-Run kann dagegen offen bleiben und blockiert trotzdem. So sieht ein wartender PR gelb aus und mergt nicht ohne Freigabe.
