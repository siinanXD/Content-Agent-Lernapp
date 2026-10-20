# SIN-875: Schnell-Prüfung `check:fast` vor dem Push

- Issue: https://linear.app/sinan-kahraman/issue/SIN-875
- Code: `scripts/check-fast.mjs`, `package.json` (`check:fast`), `.github/workflows/ci.yml`

## Entscheidung

- `npm run check:fast` führt Lint und Typecheck parallel, danach die Unit-Tests allein aus (wie in CI; unter Last werden zeitabhängige Tests wackelig) und blendet dabei alle Secret-Variablen aus (Namen mit `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `DSN` am Ende oder Präfix `SUPABASE_`, `LANGFUSE_`, `SENTRY_`, `ANTHROPIC_`, `OPENAI_`, `LINEAR_`, `INFISICAL_`, `FIGMA_`, `POSTHOG_`). So kann kein Unit-Test aus einer Worker-Sitzung mit geladenen Infisical-Keys still einen echten Dienst aufrufen. Externe Dienste sind über die vorhandenen Mocks abgedeckt (`COURSE_STORAGE=mock`, Test-Doubles in `src/**/*.test.ts`).
- Worker (Claude, Codex) führen `check:fast` vor jedem Push aus. `ci` führt dieselbe Prüfung aus (ersetzt die drei Einzelschritte), damit Worker und CI nicht auseinanderlaufen. Build, Playwright, axe und Lighthouse bleiben nur in CI und sind weiterhin das Tor.
- Kein neuer Dienst, keine neue Abhängigkeit (nur `node:child_process`), keine Supabase-Branches (kosten Geld).

## Gemessen (20.10.2026, ohne Secrets)

- Nacheinander: Lint 16 s, Typecheck 14 s, Tests 61 s (1044 Tests).
- Ein Test (`worker-sicherung.test.ts`) war nur in GitHub Actions grün, weil er `GITHUB_REPOSITORY` brauchte. Er setzt jetzt `LEITSTAND_PROJEKT` selbst.

## Annahmen

- Die vorhandenen Mocks gelten als gemeinsamer Test-Ordner im Sinne des Issues; kein Umzug der Mocks (wäre reiner Umbau ohne Nutzen).
