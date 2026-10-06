# SIN-252: Gate lockern, risk:high nur bei echten Risiken

- **Links:** Linear [SIN-252](https://linear.app/sinan-kahraman/issue/SIN-252), Vorgänger SIN-223 (Gate), SIN-234 (Workflow-Freigabe, abgelöst), SIN-247, SIN-246 (Tages-Update); [npm Registry API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md), [GitHub REST: Repository](https://docs.github.com/en/rest/repos/repos#get-a-repository), [workflow_run](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)
- **Entscheidung:**
  1. **`risk:high` nur noch bei:** Secret-Leak; Datenverlust (`drop`/`delete`/`truncate`, Spalte löschen oder umbenennen, bestehende Migration geändert); Sicherheit (RLS/Policies geschwächt, Auth/Middleware, Service-Role-Key in Client-Dateien oder `NEXT_PUBLIC_*SERVICE_ROLE*`); Geld (Pfade billing/payment/stripe/checkout/pricing, Live-Schalter wie `sk_live`, `STRIPE_*LIVE*`, `livemode: true`); das Gate selbst (`pr-gate.yml`, `risk.mjs`, Rulesets); Rechte in Workflows; `docs/PRODUCT.md`; Framework-/DB-Wechsel; Fork-PR.
  2. **Rechte in Workflows (Punkt 6)** sind: neue `write`-Rechte oder `write-all`, neues `pull_request_target`, ein neues Secret (außer `GITHUB_TOKEN`), erweiterte `allowedTools`/`allowed_bots` (ein neues Wort in der Zeile), eine neue Action außerhalb von `actions/*` und `anthropics/*`. Alles andere an Workflows ist `risk:medium`.
  3. **`risk:medium` neu:** normale Workflow-Änderungen, `docs/design/` und `docs/ARCHITECTURE.md` (Figma-Tokens), Docs, Tests, Refactorings.
  4. **Neue npm-Abhängigkeit:** `medium` nur mit Lizenz MIT oder Apache-2.0 und mehr als 500 GitHub-Sternen, sonst (auch bei Abruf-Fehler) `high`. `pr-gate` fragt npm-Registry und GitHub-API ab (`fetchDependencyInfo`), `classifyRisk` bleibt rein und bekommt das Ergebnis als `depInfo`.
  5. **Sicherheitsnetz:** neuer Workflow `revert-guard.yml`: Wird `ci` auf `main` nach einem Push rot, öffnet er einen Revert-PR (`revert: … zurücknehmen (SIN-x)`), der als `risk:medium` automatisch mergt. Kein Revert eines Reverts, nur ein PR je Commit, nur wenn der rote Commit noch die Spitze von `main` ist.
- **Annahmen:**
  - „Design-Tokens aus Figma“ lässt sich nicht aus dem Diff erkennen. Wir stufen alle Änderungen unter `docs/design/` und `docs/ARCHITECTURE.md` auf `medium`. Die Figma-Pflicht prüfen weiter AGENTS.md und der Planer, nicht das Gate.
  - Service-Role im Client erkennen wir heuristisch (`*.tsx`/`*.jsx`/`components/` mit `service_role`). Server-Dateien bleiben `medium`.
  - Eine verkleinerte `allowedTools`-Liste oder ein schon genutztes Secret zählt nicht als Erweiterung.
  - „Neue kostenpflichtige Dienste“ erkennt das Gate nur über neue Secrets, neue Drittanbieter-Actions und neue npm-Pakete.
  - Der Revert-Wächter läuft mit `AGENT_WORKFLOW_TOKEN`; fehlt er, warnt er nur. Er wurde hier nicht live getestet. Die Meldung an Sinan läuft über den PR-Titel `revert:` im Tages-Update.
  - Dieser PR ändert `pr-gate.yml` und `risk.mjs` und ist daher selbst `risk:high`; die neuen Regeln gelten erst ab dem Merge.
- **Warum:** Am 05./06.10. waren fast alle Freigaben nur „ändert Workflows“ oder „Design-Tokens“ und bremsten den Loop. Jeder Auto-Merge bleibt per Revert-PR umkehrbar, und ein roter `main` wird automatisch zurückgenommen. Die Handfreigabe ist also nur noch bei echten Risiken nötig.
