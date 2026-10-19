# SIN-848: loop_events.payload und Nachzug der Leitstand-Migrationen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-848
- Befund: Leitstand-Rollen (Prüfer, Trend, Markt, Lern-Schleife) schreiben ihre Ledger-Zeile mit `payload`; die Spalte fehlt in `loop_events`, PostgREST antwortet 400, der Lauf bleibt grün, der Beleg ist weg. Außerdem liegen fünf Leitstand-Migrationen (wirkung, kennzahlen_woche, einstellungen/wochencheck, aufgaben.haken_*, aufgaben.bezug) im Leitstand-Repo, sind aber nie angewendet (Leitstand prüft nur, `migrationen.yml`).
- Entscheidung: Eine additive Migration in diesem Repo (migrate.yml wendet nach Merge an): `payload jsonb` plus Nachzug der fünf Migrationen im Wortlaut. Weggelassen: `revoke truncate, references, trigger … from service_role` (Wort „truncate“ blockiert den Additiv-Wächter; die Grants geben service_role ohnehin nur select/insert/update).
- Warum hier: Beide Repos nutzen dasselbe Supabase-Projekt; nur dieses Repo wendet Migrationen automatisch an. Structured JSON je Rolle (Standing rule) braucht die Spalte.
- Annahme: `leitstand_nutzer` existiert live (geprüft am 19.10.), die Policies verweisen darauf.
