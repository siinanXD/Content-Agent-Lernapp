# SIN-286: Lighthouse, axe und WCAG 2.2 AA je Screen

Stand: 2026-10-06, Build von `claude/sin-286`, `next start`, Chromium (Playwright), Handy 390 px.

## Wie gemessen wurde

| Prüfung | Befehl | Rohdaten |
| --- | --- | --- |
| Lighthouse (4 Kategorien, Median aus 3 Läufen, Schwelle 0,9) | `npm run test:lighthouse -- --serve --runs 3 --out docs/quality/SIN-286-lighthouse.json` | [SIN-286-lighthouse.json](SIN-286-lighthouse.json) |
| axe-core (wcag2a, wcag2aa, wcag21a/aa, wcag22aa) je Route | `npx playwright test e2e/a11y.spec.ts` | CI-Stufe `build` |
| Tastatur: Fokus sichtbar, Ziele ≥ 44 px je Route | `npx playwright test e2e/tastatur.spec.ts` | CI-Stufe `build` |
| Tastatur: kompletter Lernweg ohne Maus | `npx playwright test e2e/tastatur-lernweg.spec.ts` | CI-Stufe `build` |
| Hex-Farben | `npm test` (`src/lib/design/no-hex.test.ts`) | CI-Stufe `build` |

Alle 20 Routen unter `src/app` sind abgedeckt (Start, Lernpfad, Einheit, Ergebnis, Wiederholung,
Prüfungsmodus, Prüfungsergebnis, Onboarding, Ausbilder, Profil, Einstellungen, Rechtstexte).
Fehler-, Leer- und Ladezustände sind Zustände dieser Seiten (`StateView`); axe prüft sie in
`e2e/ausbilder.spec.ts` (Gruppenübersicht mit Daten) und `e2e/a11y.spec.ts` (Ladezustand).

## Ergebnis Lighthouse (nach den Korrekturen)

Alle Routen: Barrierefreiheit 100, SEO 100. Performance und Best Practices:

| Route | Performance | Best Practices | LCP |
| --- | --- | --- | --- |
| `/` | 97 | 100 | 2,6 s |
| `/start` | 99 | 100 | 2,0 s |
| `/anmelden` | 99 | 100 | 2,1 s |
| `/ausbilder` | 95 | 96 | 2,7 s |
| `/demo` | 96 | 100 | 2,6 s |
| `/willkommen`, `/einwilligung`, `/schwerpunkt` | 99 | 100 | 2,0 s |
| `/lernpfad` | 99 | 100 | 2,0 s |
| `/einheit/unit-03` | 98 | 100 | 2,1 s |
| `/ergebnis` | 99 | 100 | 2,0 s |
| `/wiederholung` | 95 | 100 | 2,8 s |
| `/pruefung` | 96 | 100 | 2,7 s |
| `/pruefung/ergebnis` | 99 | 100 | 2,0 s |
| `/profil`, `/einstellungen` | 98–99 | 100 | 2,0–2,4 s |
| `/impressum`, `/datenschutz`, `/ki-hinweis`, `/quellen` | 99–100 | 100 | 1,8–2,0 s |

Alle Werte ≥ 90 in allen vier Kategorien. Vollständige Zahlen in der JSON-Datei.

## Gefundene Fehler und Behebung

Vor den Korrekturen (Lauf mit einem Durchgang): `/ausbilder` Performance 87, `/pruefung`,
`/wiederholung` und `/anmelden` zwischen 89 und 91, also unsicher an der Schwelle.

- Ursache: `@sentry/nextjs`, `posthog-js` und `@supabase/supabase-js` lagen statisch im Bundle jeder
  Seite („unused JavaScript“ 750–1200 ms), auch ohne DSN, Key oder Supabase-Konfiguration.
- Behebung: Alle drei werden nur noch bei gesetzter Konfiguration per dynamischem Import nachgeladen
  (`src/instrumentation-client.ts`, `src/components/analytics/posthog-provider.tsx`,
  `src/lib/auth/browser-client.ts`). Verhalten bei gesetzter Konfiguration bleibt gleich.
- Ergebnis: Total Blocking Time von rund 100–190 ms auf 40–100 ms, Performance überall ≥ 95.

## Ergebnis axe, Tastatur, Kontrast

- axe-core: 0 Verstöße auf allen 20 Routen (Regeln inkl. `color-contrast` 4,5:1, `target-size`).
- Tastatur: Tab erreicht jedes bedienbare Element, sichtbarer Fokus (Outline oder Schatten), Ziele
  ≥ 44 px (Links im Fließtext nach WCAG 2.5.8 ausgenommen).
- Lernweg ohne Maus: Willkommen → Einwilligung → Schwerpunkt → Lernpfad → Einheit (Fragen) →
  Ergebnis → Wiederholung → Prüfungsmodus, nur Tab, Enter, Leertaste.

## Grenzen

- Lighthouse läuft lokal gegen `next start` ohne Supabase-, Sentry- und PostHog-Konfiguration. Mit
  Konfiguration lädt die Seite die jeweilige Bibliothek zusätzlich nach.
- axe findet rund ein Drittel der WCAG-Probleme automatisch. Der WCAG-2.2-AA-Beleg stützt sich
  deshalb zusätzlich auf die Tastatur-Tests; eine manuelle Prüfung mit Screenreader steht aus.
- Hex-Werte stehen nur in `globals.css` (Token-Definition), im `theme-color`-Meta-Tag und in den
  generierten SVG-Bildern (eigenständige Dateien, lesen keine Seiten-CSS). Der Unit-Test hält das fest.
