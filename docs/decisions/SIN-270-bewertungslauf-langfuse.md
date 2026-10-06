# SIN-270 — Bewertungslauf aller Fragen mit Langfuse-Meldung

- **Links:** Linear [SIN-270](https://linear.app/sinan-kahraman/issue/SIN-270); Langfuse [SDK](https://langfuse.com/docs/observability/sdk/overview); [SIN-260](SIN-260-bewertungslauf.md); [SIN-258](SIN-258-kosten-ledger.md); `src/lib/quality/judge-backfill.ts`; `docs/ops/LANGFUSE-DASHBOARD.md`
- **Entscheidung:** Der vorhandene Backfill (SIN-260) bleibt, ist schon wiederaufnehmbar (Inhalts-Hash) und hat den Deckel. Neu: ein optionaler `report`-Haken meldet je Frage einen Trace `judge-backfill-question` und je Kurslauf die Kosten (`pipeline-run-judge-backfill` über `recordRunCost`). Kein neues Paket.
- **Annahmen:**
  - Der Deckel von 19 € (hart 20 €) gilt über alle Kurse des Laufs; ein Test belegt, dass ein größerer `stopEur` auf 20 € begrenzt wird.
  - Melden an Langfuse ist best effort: Fehler stoppen den Lauf nicht; ohne Keys entfällt der Trace.
  - Langfuse bekommt nur Kennungen und Zahlen, keine Fragetexte.
  - Der Live-Lauf wurde hier nicht ausgeführt (keine Secrets); Start manuell nach dem Merge. Das Dashboard in Langfuse legt Sinan nach `docs/ops/LANGFUSE-DASHBOARD.md` an.
  - Verworfene Fragen werden nur als `passed = false` gespeichert; veröffentlicht wird nach `question_quality_latest`.
- **Warum:** Bewertung und Kosten je Lauf müssen sichtbar sein, ohne den bestehenden Lauf neu zu bauen.
