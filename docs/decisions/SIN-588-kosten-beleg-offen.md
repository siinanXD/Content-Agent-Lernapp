# SIN-588: Kosten-Beleg für den nächsten Content-Lauf steht aus

- Links: https://linear.app/sinan-kahraman/issue/SIN-588, `docs/decisions/SIN-569-kosten-deckel-befund.md`, `docs/decisions/SIN-563-kosten-deckel-beleg.md`, `docs/decisions/SIN-493-teilbatches.md`, `docs/quality/runs/cost-report-2026-10-13.json`, `docs/ops/content-runs/2026-10-12T09-44-47-533Z.json`, `.github/workflows/content-grow.yml` (Zeitplan Mo/Mi/Fr 05:47 UTC), `.github/workflows/run-task.yml` (Aufgabe `cost-report`)
- Entscheidung: Kein Eintrag „bestätigt“ oder „gelaufen“ für `betrieb-kosten` in `docs/product-readiness.json`. Der Punkt bleibt auf dem Stand des Berichts vom 13.10. (3 Läufe, höchster 21,78 €, `ok: false`). Der Beleg kommt, sobald der nächste Lauf nach dem Stichtag gemessen ist. Kein neuer Code: Die Schranke (`partGate`, Teilbatches) steht seit SIN-493 und SIN-563.
- Stand 2026-10-13, 16:19 UTC: Seit dem Stichtag `TEILBATCH_SEIT` (2026-10-13) gibt es keinen gemessenen `content-grow`-Lauf. Der nächste planmäßige Lauf ist Mi 14.10. 05:47 UTC.
- Akzeptanzkriterien (SIN-588):
  - [ ] Nächster Content-Lauf nach SIN-569 mit Kosten je Lauf ausgewiesen: offen, Lauf steht aus.
  - [ ] Höchster Lauf unter 20 € oder Ursache der Überschreitung benannt: offen.
  - [ ] Beleg in `docs/product-readiness.json`: offen, wird erst mit der Messung gesetzt.
- Nachholen, sobald der Mittwochslauf erledigt ist:
  1. Actions → `run-task` → Aufgabe `cost-report` starten (liest nur das Ledger in Supabase, kein Claude-Aufruf).
  2. Den erzeugten Bericht `docs/quality/runs/cost-report-<Datum>.json` lesen. `ok: true` heißt: Alle Läufe seit dem Stichtag liegen unter 20 €.
  3. Den Lauf mit Kosten je Lauf (`costEur`, `repair.costEur`, `stopReason`) und Lauf-URL in `docs/product-readiness.json` unter `bestaetigt` oder `gelaufen` eintragen, mit Datum.
  4. Bei Überschreitung: Ursache aus dem Lauf-Bericht benennen, Akzeptanzkriterium bleibt offen.
- Annahmen:
  - Ein Live-Lauf kostet bis 20 € API-Budget und braucht Secrets (`ANTHROPIC_API_KEY`, Supabase). Der Agent startet ihn nicht, weil er in dieser Sandbox keinen Zugriff hat und die Ausgabe eine Freigabe braucht.
  - Der Lauf vom 12.10. (21,78 €, eine Batch-ID, kein Teilbatch) gilt als vor dem neuen Mechanismus und ist kein Beleg dafür.
  - Die Nachholschritte laufen bei Sinan oder beim nächsten Worker, nicht automatisch: Der Kostenbericht startet nicht nach `content-grow`, sondern nur über `run-task` (von Hand oder durch den Planer).
- Warum: Ein Beleg ohne Messung wäre erfunden. Ein eigener Trigger für einen Live-Lauf würde API-Kosten auslösen, ohne dass dafür eine Freigabe vorliegt.
