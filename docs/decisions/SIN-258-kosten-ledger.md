# SIN-258 — Kosten pro Kurslauf messen: Ledger und Langfuse

- **Links:** Linear [SIN-258](https://linear.app/sinan-kahraman/issue/SIN-258/kosten-pro-kurslauf-messen-ledger-und-langfuse-anbinden); [Langfuse: Scores (Data Model)](https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk); [Langfuse: Custom Dashboards](https://langfuse.com/docs/metrics/features/custom-dashboards); [Langfuse: Cost Tracking](https://langfuse.com/docs/model-usage-and-cost). Eine fertige Ledger-Lösung gibt es nicht, die Zählung (`cost-guard.ts`) und der Langfuse-Zugang (`langfuse-client.ts`) bestehen schon.
- **Entscheidung:**
  1. Neue Tabelle `pipeline_run_costs` (additive Migration, RLS an, nur Service-Role): eine Zeile je Pipeline-Lauf mit Token, USD, EUR, Deckel, Stopp-Flag und Langfuse-Trace-ID.
  2. `src/lib/quality/run-ledger.ts`: `recordRunCost` schreibt Trace (Langfuse EU) und Ledger-Zeile; `assertWithinRunCap` wirft `RunBudgetExceededError` ab 20 €. Ohne Supabase-Backend (Mock) bleibt das Ledger im Speicher, ohne Langfuse-Keys entfällt der Trace.
  3. Die Content-Fabrik (`scripts/content-grow.ts`) prüft den Deckel vor jedem bezahlten Batch, beendet bei Überschreitung sauber (Stopp-Grund, Rest im nächsten Lauf) und schreibt am Ende das Ledger.
  4. Der Planer liefert `kosten_pro_lauf` aus den letzten 20 Ledger-Zeilen.
  5. Langfuse-Kosten laufen als Scores (`costEur` usw.) am Trace statt über die Modell-Preis-Tabelle von Langfuse, weil die Preise der Batch-API und des Prompt-Cachings in `cost-guard.ts` liegen.
- **Annahmen:**
  1. Der Deckel von 20 € gilt je Lauf einschließlich der Reparaturstufe (eigener Prozess, dessen Kosten kommen über `totalEur` dazu).
  2. Bereits bezahlte Arbeit eines Laufs wird bei Stopp nicht verworfen: Einheiten, die den Richter bestanden haben, gehen live. Gestoppt wird vor dem nächsten bezahlten Schritt.
  3. Fehlschlag beim Schreiben des Ledgers bricht den Lauf nicht ab (Warnung im Log), da die Kosten sonst zusätzlich verloren gingen. Der Bericht unter `docs/ops/content-runs/` enthält die Kosten weiterhin.
  4. Ältere Skripte (`ap15-*`, `ap22-ab`) schreiben noch kein Ledger; sie sind einmalige Läufe und nicht Teil des Kurslaufs.
  5. Das Langfuse-Dashboard lässt sich in der Cloud nur von Hand anlegen; die Anleitung steht in `docs/ops/LANGFUSE-DASHBOARD.md`. Live-Keys und Supabase-Migration waren in der Agent-Umgebung nicht nutzbar, getestet wurde mit Mocks.
- **Warum:** Ohne Messung gibt es keine Aussage zum 20-€-Deckel. Ein Ledger in Supabase plus Scores in Langfuse nutzt die vorhandene Infrastruktur und braucht keine neue Abhängigkeit.
