# Architekturentscheidungen

Stand: AP-00 abgeschlossen (2026-10-02). Modellnamen und Features nur aus aktuellen Docs/Repos, nie aus dem Gedächtnis.

## Blocker / offene Secrets

| Secret | Status (2026-10-02 agent env) | Auswirkung |
| --- | --- | --- |
| Anthropic (Claude) API | **absent** (not in injected secrets) | Live-Recherche/Generate/Batch blockiert; MAF-Seed AO/RLP/Prüfung aktiv |
| OpenAI API | **absent** | Richter-Modell / Evaluate blockiert bis gesetzt |
| Langfuse (EU) | **absent** | Tracing/Datasets/Prompt-Versionen blockiert bis gesetzt |
| Supabase (EU) | **absent** | Persistenz live blockiert; Mocks/OpenAPI weiter möglich |
| Railway | **present** (`RAILWAY_API_TOKEN`) | Nur für späteren Hermes-Deploy (AP-10) |
| Vercel team link | auth ok / **403** on `siinanxds-projects` | `list_teams` leer; Deploy blockiert bis Re-Auth |
| Netz Cloud-Agent (2026-10-03) | `gesetze-im-internet.de`, `kmk.org` **gesperrt** (Egress-Proxy 403) | Amtliche Quellen nur über Exa-Web-Fetch; Domains in der Umgebung freigeben |

Deckel: max. **20 € API-Kosten pro Kurslauf** (PRODUCT.md).

## Entscheidungen

### D-01 — OpenMAIC nur als Vorlage, kein Fork

- **Links:** [THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) (MIT, ~39k★, aktiv 2026-10-02); Konzept in `docs/PRODUCT.md`
- **Entscheidung:** Agenten-Aufteilung und Kurs-Idee als Inspiration; **nicht** als Code-Basis forken.
- **Warum:** Produktziel ist deutsche Ausbildungsordnungen + Duolingo-Lernpfad + eigene API-Pipeline; OpenMAIC ist Multi-Agent-Classroom, nicht IHK/AO-Pipeline.

### D-29 — AP-16 Hermes-Wochenjob: Maps statt Seed, Alerts soft-fail, selektives Refresh

- **Links:** Linear [SIN-194](https://linear.app/sinan-kahraman/issue/SIN-194/ap-16-quellen-monitor-rechtsstand-der-curriculum-maps-wochentlich); [Telegram Bot API sendMessage](https://core.telegram.org/bots/api#sendmessage); [Linear GraphQL issueCreate](https://developers.linear.app/docs/graphql/working-with-the-graphql-api); Repo: `src/lib/hermes/weekly-check.ts`, `scripts/hermes-weekly.mjs`, `scripts/content-check-sources.mjs`, `docs/content/sources.lock.json`, `docs/ops/HERMES.md`, `POST /courses/{id}/refresh` (`docs/api/openapi.yaml`)
- **Entscheidung:** (1) Hermes liest Quellen ausschließlich über `loadAllCurricula()` (alle `docs/content/*.json` außer Legacy `maf-curriculum.json`), nicht mehr `docs/research/maf-sources.json`. (2) Bei Änderung: Telegram-Kurzbericht + Linear-Issue-Titel **`Quelle geändert: <mapId>`** + Map-Feld `status` = **`Prüfung nötig`**; betroffene Module/Blöcke kommen aus Block-`sourceIds` und gehen als Body an `POST /courses/{id}/refresh`. (3) `TELEGRAM_*` und `LINEAR_API_KEY`/`LINEAR_TEAM_ID` sind optional — fehlende Secrets überspringen den Kanal mit `skippedReason`, der Check/die Tests bleiben grün. Live-HTTP nur auf Railway oder GHA-Cron (`source-check.yml`); im Cloud-Agent nur Fixture-/Offline-Pfad.
- **Warum:** SIN-194 verlangt den Hermes-Pfad explizit; Secrets und Domain-Egress sind in dieser Umgebung oft blockiert — Code muss trotzdem vollständig und testbar sein, ohne den Package-Lauf zu sprengen.
