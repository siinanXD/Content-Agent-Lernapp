# SIN-534 — Kennzahl kosten_woche mit Warnung

- **Links:** Linear [SIN-534](https://linear.app/sinan-kahraman/issue/SIN-534/wochenkosten-der-content-fabrik-als-kennzahl-mit-warnung-ausweisen); baut auf [SIN-280](SIN-280-kosten-pro-lauf.md) auf. Eigenbau, keine neue Abhängigkeit.
- **Entscheidung:** Neue Planer-Kennzahl `kosten_woche` (`summarizeWeekCosts` in `planner.mjs`): Summe der Läufe der letzten 7 Tage aus `pipeline_run_costs`, mit „WARNUNG“ im Text, wenn die Summe über 2 x Lauf-Deckel liegt. Der Deckel (20 € je Kurslauf) bleibt unverändert.
- **Annahmen:** „Statusbericht“ ist der Kennzahlen-Block des Planers. Abruf auf 100 Zeilen begrenzt (`kosten_pro_lauf` nutzt weiter die neuesten 20); reicht bei wenigen Läufen pro Woche.
- **Warum:** Einzelne Läufe bleiben unter 20 €, die Wochensumme war bisher unsichtbar.
