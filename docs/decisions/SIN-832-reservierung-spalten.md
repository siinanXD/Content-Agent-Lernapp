# SIN-832: Reservierungsspalten für den Leitstand-Dispatcher

- Issue: https://linear.app/sinan-kahraman/issue/SIN-832 · Leitstand-PR https://github.com/siinanXD/Leitstand/pull/294
- Entscheidung: additive Spalten auf der vorhandenen Tabelle `leitstand_aufgaben` (`claim_revision`, `claim_provider`, `claim_id`, `claim_at`, `reparaturen`, `claim_nachweis`). Der Leitstand reserviert damit je Issue per Compare-and-swap, bevor ein Worker startet, und zählt Reparaturrunden issueweit über PRs und Provider.
- Warum hier: Beide Repos nutzen dasselbe Supabase-Projekt, nur dieses Repo wendet Migrationen automatisch an (gleiches Vorgehen wie SIN-848, #431). Keine neue Tabelle, keine Policy, keine Rechte.
- Annahme: Die Migration läuft vor dem Merge von Leitstand #294; ohne die Spalten startet der Leitstand-Dispatcher nach #294 nichts (bewusst: ohne Sperre kein Start).
