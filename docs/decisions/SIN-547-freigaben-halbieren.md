# SIN-547: Freigaben halbieren, Einspruchsfrist statt Handfreigabe

- **Links:** Linear [SIN-547](https://linear.app/sinan-kahraman/issue/SIN-547), Vorgänger [SIN-252](SIN-252-gate-lockern.md), [SIN-511](SIN-511-freigabe-merge-main.md), [SIN-516](SIN-516-bekannte-secrets.md); [GitHub: schedule](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule), [Re-run workflow](https://docs.github.com/en/rest/actions/workflow-runs#re-run-a-workflow)
- **Anlass:** Auswertung vom 13.10. (301 gemergte PRs): 61 (20 %) waren `risk:high`, davon etwa 45 wegen des Loops selbst (Workflow-Recht, Gate), nicht wegen des Produkts. Sinan: „alles freigegeben“.
- **Entscheidung:**

| Kategorie | Vorher | Jetzt |
| --- | --- | --- |
| `secret` (gitleaks, Werte in Env-Dateien) | high | high |
| `datenverlust` (drop/delete/truncate/alter-drop, bestehende Migration geändert) | high | high |
| `sicherheit`: Auth/Middleware, RLS geschwächt, Service-Role-Key im Client, Fork, Branch-Protection als Datei | high | high |
| `zahlung` (Live-Schalter, Preise, Billing-Pfade) | high | high |
| `abhaengigkeit` (neues npm-Paket ohne MIT/Apache oder unter 500 Sterne) | high | high |
| `grundsatz`: `docs/PRODUCT.md`, Label `owner-approval-required` | high | high |
| `workflow-recht`: `pull_request_target`, neues Secret (nicht in den Workflows auf main), Action außerhalb `actions/*`, `anthropics/*` und `ERLAUBTE_ACTION_OWNER` | high | high |
| `workflow-recht`: `write`-Rechte, erweiterte `allowedTools`/`allowed_bots`, Secret aus der bekannten Liste, Action eines erlaubten Owners | high | **medium + Einspruchsfrist** |
| `gate`: `pr-gate.yml`, `risk.mjs`, `dispatch.yml` | high | **medium + Einspruchsfrist** |
| `grundsatz`: Framework-/DB-Abhängigkeit (`next`, `react`, `@supabase/supabase-js`) | high | **medium + Einspruchsfrist** |

- **Einspruchsfrist (2 h):** `classifyRisk` liefert neben `reasons` (nur High) die Liste `einspruch`. Ist sie nicht leer und der PR `risk:medium`, bekommt er das Label `einspruch:2h` und einen Kommentar `<!-- pr-gate-einspruch sha=… bis=… -->` mit Ende der Frist (2 h ab dem aktuellen Commit; ein neuer Commit setzt neu). Bis dahin schaltet `pr-gate` Auto-Merge aus und `merge-gate` endet rot („Einspruchsfrist läuft bis …“). Der Job `einspruch-ende` (Zeitplan alle 20 Min) startet danach den letzten `pr-gate`-Lauf neu; das Gate schaltet Auto-Merge ein. Sinan stoppt mit `no-automerge`. `revert-guard` bleibt.
- **Leitstand:** `loop_snapshot.open_prs[].einspruch_bis` (ISO-Zeit oder `null`) aus dem Fristkommentar. Die Anzeige „Läuft gleich durch“ gehört in den Leitstand (anderes Repo).
- **Annahmen:**
  - `ERLAUBTE_ACTION_OWNER` in `docs/autonomy/config.json` startet nur mit `github` (CodeQL und Dependabot-Actions). Weitere Owner trägt Sinan oder ein Folge-PR dort ein.
  - „Secrets, die in den Repo-Secrets existieren“ prüft das Gate wie in SIN-516 über die Namen, die auf main in Workflows vorkommen (die GitHub-API zeigt Secret-Namen nur mit Admin-Recht).
  - `owner-approval-required` bleibt high: Es ist eine ausdrückliche Bitte um Freigabe.
  - Schlägt der Zeitplan fehl, verlängert sich die Frist nur um die Ausfallzeit; ein späterer Lauf, Label-Ereignis oder Commit bewertet neu.
  - Dieser PR ändert `pr-gate.yml` und `risk.mjs` und ist selbst noch `risk:high`, weil das Gate die Regeln aus der Basis lädt; die neuen Regeln gelten ab dem Merge.
  - `AGENTS.md` des Schwester-Repos (Leitstand) ist von hier aus nicht erreichbar; dort nachziehen.
- **Warum:** Freigaben für Loop-interne Änderungen bremsten den Loop, ohne Produktrisiko zu senken. Eine kurze Frist mit Stopp-Label und `revert-guard` hält die Kontrolle bei Sinan, kostet aber keinen Handgriff im Normalfall. Erwartung: Freigaben pro Woche von etwa 30 auf unter 10.
