# SIN-516: Bekannte Secrets in Workflows sind kein High-Grund mehr

- Issue: https://linear.app/sinan-kahraman/issue/SIN-516
- Verwandt: SIN-223 / SIN-252 (Risiko-Regeln)

## Entscheidung

- Ein Secret gilt als bekannt, wenn sein Name auf main in irgendeiner Datei unter `.github/workflows/` vorkommt. Bekannt → kein `workflow-recht`-Grund.
- Ein Name, der auf main nirgends vorkommt, bleibt `risk:high`. Alle anderen High-Gründe (Gate selbst, `permissions`, neue Actions, `allowedTools`, Datenverlust, Sicherheit, Geld) bleiben.
- `risk.mjs` bekommt `secretNames(texts)` (nur Namen, nie Werte) und `classifyRisk({ knownSecrets })`. `pr-gate` liest die Namen aus dem Checkout der PR-Basis und übergibt sie. `secretNames` ist dort optional geladen; vor dem Merge gilt der alte Stand.
- Tests: `LINEAR_API_KEY` neu in `revert-guard.yml`, sonst auf main genutzt → medium; `NEUES_SECRET_XY` → high; `pr-gate.yml` → high.

## Annahmen

- Der Checkout im Job `gate` ist die Basis (main), also zeigt `.github/workflows/` den Stand von main.

## Warum

Seit 05.10. waren 13 PRs `risk:high`, 8 davon nur wegen „neues Secret … in .github/workflows/X.yml“ (u. a. #150, #151, #214, #231, #295, #304, #312), obwohl die Secrets (`LINEAR_API_KEY`, `AGENT_WORKFLOW_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) längst existierten. Die alte Regel prüfte nur dieselbe Datei. Das spart etwa 60 % der Freigaben.
