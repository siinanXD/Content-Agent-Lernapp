# SIN-640 Testnutzer-Agent

- Issue: https://linear.app/sinan-kahraman/issue/SIN-640
- Geprüft: [Playwright Test Agents](https://playwright.dev/docs/test-agents) (Planner/Generator/Healer, offiziell), [Playwright MCP](https://github.com/microsoft/playwright-mcp) (Apache-2.0)
- Verwandt: SIN-319 (Live-Check), SIN-523 (Sichtprüfung), SIN-628 (Staging)

## Entscheidung

Zwei Ebenen, beide in `testnutzer.yml`, Auswertung in `scripts/autonomy/testnutzer.mjs`:

1. **Crawler** (`crawler.mjs`, ohne KI, nachts 21:40 UTC): alle Routen aus `e2e/routes.ts` auf Handy (390 px) und Desktop; HTTP, Konsolenfehler, 4xx/5xx, tote interne Links, Seitwärts-Scrollen, LCP unter 2,5 s, axe (WCAG 2.2 AA); auf dem Handy werden bis zu 8 Knöpfe je Seite angeklickt.
2. **Personas** (`personas.mjs`, montags): drei feste Wege (Azubi Metall, Azubi vor der Zwischenprüfung, Ausbilder). Playwright spielt, `claude-haiku-5-5` bewertet Bilder und Text nach fester Liste (verständlich, toter Weg, Barrierefreiheit, Ladezeit, Stil) und antwortet als JSON. Deckel 0,50 USD je Lauf.

Funde werden je Kategorie und Seite gebündelt, mit Marker `<!-- testnutzer:KEY -->` gegen Dubletten geprüft (offene und 14 Tage alte erledigte Issues), als Issue mit Label `frontend` bzw. `content` angelegt (höchstens 5 je Lauf). Der Bericht ist ein Kommentar in SIN-640; Screenshots liegen im Artefakt `testnutzer` (14 Tage).

## Annahmen

- Playwright Test Agents und Playwright MCP werden **nicht** eingesetzt: die Wege sind fest und müssen jede Woche gleich laufen, damit Funde vergleichbar bleiben; ein frei steuerndes Modell kostet mehr und streut. Das Modell bewertet nur. Bei Bedarf (Healer für kaputte Wege) später als eigenes Issue.
- „Nur Testkonten, nie in Produktionsdaten schreiben“: Die App hat für Lernende keine Konten. Alle schreibenden Anfragen an `/api/**` werden im Browser abgefangen und nie gesendet; der Ausbilder nutzt die Beispielansicht `?demo=1`. Damit braucht es weder Vercel Preview noch Supabase-Branch. Das Auslesen echter Kursinhalte (GET) ist gewollt, sonst bewertet der Agent keine echten Inhalte.
- Der Bericht liegt als Linear-Kommentar, nicht im Leitstand (`loop_events` kennt nur feste Schritte; neuer Schritt wäre Schema-/Registeränderung) und nicht im Gedächtnis (kein vorhandener Ort im Repo). Beides als Folge-Issue, falls Sinan es will.
- Bildvergleich gegen main bleibt bei `visual.yml`; der Crawler wiederholt ihn nicht.
- Stil-Urteil des Modells ist ein Hinweis, kein Beweis; deshalb nur Haiku-Hinweise mit Priorität 3, kein Gate vor Merge.
- Label `frontend` und `content` gibt es im Team (siehe `LANES` in `linear.mjs`).

## Warum

Tests prüfen Technik, nicht ob sich die App für einen Azubi gut anfühlt. Der Crawler ist billig und deterministisch, die Personas kosten wenige Cent je Woche und fangen Verständlichkeit und tote Wege ab.
