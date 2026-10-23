# SIN-1001: Prüfer-Anstoß und Beleg-Gate (Weg A 4b/8)

Links: [SIN-1001](https://linear.app/sinan-kahraman/issue/SIN-1001), Herkunft SIN-939 (Empfänger im Leitstand).

## Entscheidung

- `pruefer-anstoss.yml` sendet bei `claude/`- und `codex/`-PRs nur `repository_dispatch` (`event_type=pruefer`, Repo, PR-Nummer) an `siinanXD/Leitstand`. Kein Checkout, keine Logik, Token `AGENT_WORKFLOW_TOKEN`.
- `merge-gate` in `pr-gate.yml` wird rot, wenn für den aktuellen Head kein Beleg mit Urteil `ok` vorliegt. Logik in `scripts/autonomy/beleg-gate.mjs`, aus der Basis geladen (fehlt sie dort, entfällt die Prüfung).

## Annahmen

- Der Leitstand-Quelltext war nicht lesbar. Belegformat angenommen: Bot-Kommentar `<!-- pruefer-beleg sha=<Head> urteil=ok run=<Lauf-Link> -->`. Weicht `beleg-gate.mjs` im Leitstand ab, hier angleichen.
- `event_type=pruefer` und die Payload-Felder `repo`/`pr` sind angenommen (SIN-939 nennt nur Repo und PR-Nummer).
- Der Prüfer startet `pr-gate` nach dem Beleg neu (reRun), sonst bewertet erst der nächste Lauf.
- `review.yml`/`review.mjs` bleiben bis zum Folge-Issue bestehen.

## Warum

Ein Prüfer für alle Produkt-Repos; das Gate hält den Merge, bis der Beleg zum Head passt.
