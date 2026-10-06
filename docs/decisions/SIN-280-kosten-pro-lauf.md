# SIN-280 — Kosten pro Kurslauf messen

- **Links:** Linear [SIN-280](https://linear.app/sinan-kahraman/issue/SIN-280/kosten-pro-kurslauf-messen-tabelle-pipeline-run-costs-anwenden-und); [Supabase: Migrationen](https://supabase.com/docs/guides/deployment/database-migrations); baut auf [SIN-258](SIN-258-kosten-ledger.md) und [SIN-268](SIN-268-kostenmessung.md) auf. Eigenbau, keine neue Abhängigkeit.
- **Entscheidung:** Ledger (`recordRunCost`), Deckel (`assertWithinRunCap`, 20 €) und Planer-Kennzahl `kosten_pro_lauf` bestehen schon und sind getestet. Neu: `content-grow.yml` führt vor dem Lauf `verify-supabase-schema.mjs` aus (`continue-on-error`), damit eine nicht angewendete Migration 20261006020000 als Warnung sichtbar wird. Neuer Test: Ein Lauf über 20 € landet mit `stopped=true` im Ledger. Die Migration bleibt unverändert und rein additiv.
- **Annahmen:**
  1. Das Anwenden (`supabase db push`) braucht Datenbankzugang (Zugangsdaten); das gehört nicht zu diesem PR. **Blocker:** Sinan oder ein berechtigter Ablauf wendet 20261006020000 an, danach `node scripts/verify-supabase-schema.mjs`.
  2. Kein Eintrag in `docs/product-readiness.json`: Ohne Live-Messung gäbe es keinen Beleg. Er folgt, sobald der Planer-Bericht eine Zahl zeigt.
  3. Die Prüfung blockiert den Lauf nicht, weil der Deckel im Speicher gilt, auch wenn das Ledger fehlt.
- **Warum:** Vorhandenes nutzen und die Lücke (Anwendung nicht geprüft) sichtbar machen, statt neue Secrets oder einen Migrations-Workflow einzuführen (das wäre risk:high).
