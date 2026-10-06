# SIN-308 — Robuste Env-Prüfung, Smoke-Test nach Deploy, Region fra1

- **Links:** Linear [SIN-308](https://linear.app/sinan-kahraman/issue/SIN-308/bug-alle-api-routen-500-langfuse-url-mit-anfuhrungszeichen-bringt); [Next.js: instrumentation](https://nextjs.org/docs/app/guides/instrumentation); [Vercel: `regions` in vercel.json](https://vercel.com/docs/project-configuration#regions); [GitHub: `deployment_status`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#deployment_status); Vorgänger [SIN-294](SIN-294-notbremse-erreichbarkeit-token.md).
- **Entscheidung:**
  1. `src/lib/env.ts` bereinigt Werte (Leerzeichen, umschließende Anführungszeichen) und prüft URLs. Ungültig → Warnung mit Variablennamen (nie dem Wert), Funktion bleibt aus, nichts wirft.
  2. `src/instrumentation.ts` fängt jeden Fehler je Baustein (Sentry, Langfuse) ab. `ensureLangfuseOtel` schaltet Tracing bei Fehler ab und warnt. Gleiche Bereinigung in `langfuse-client.ts`.
  3. `deploy-smoke.yml` prüft nach jedem Production-Deploy (Vercel `deployment_status`) `/api/health` und `/api/learner/phase-a` auf 200 (3 Versuche) und öffnet sonst einen Revert-PR nach dem Muster von `revert-guard`; der Lauf wird rot.
  4. `vercel.json`: `regions: ["fra1"]` (Frankfurt, EU-Hosting).
- **Annahmen:**
  1. Kein Zod: Es ist keine direkte Abhängigkeit; die Prüfung braucht nur `URL`. Weniger Abhängigkeiten gewinnt bei gleichem Ergebnis.
  2. Eine ungültige, aber gesetzte `LANGFUSE_BASE_URL` schaltet Tracing ab, statt auf die EU-Adresse zurückzufallen: Schlüssel könnten sonst an einen falschen Host gehen.
  3. Vercel meldet den Environment-Namen als `Production`; weicht er ab, startet der Smoke-Test nicht (Anpassung nötig). Live nicht prüfbar.
  4. Der Revert braucht `AGENT_WORKFLOW_TOKEN` (vorhanden, kein neues Secret). Ohne ihn wird der Lauf rot, aber kein PR geöffnet.
  5. Die Sofortmaßnahme (Wert in Infisical ohne Anführungszeichen) bleibt bei Sinan; der Code überlebt den Fehler jetzt auch so.
- **Warum:** Ein falscher Env-Wert darf nie die ganze App lahmlegen; Tracing ist Beiwerk. Der Smoke-Test nutzt vorhandene Bausteine (Revert-Muster, Health-Route) ohne neuen Dienst.
