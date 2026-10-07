# Figma-Abdeckung (SIN-349)

Datei `0SWGDO2ioBD3MyXiAnrbRz`. Zuordnung: `docs/quality/figma-abdeckung.json`, Prüfung: `node scripts/autonomy/figma-abdeckung.mjs` (läuft in `npm test`). Erzeugt mit `--write`, nicht von Hand ändern.

„umgesetzt“ heißt: Route oder Komponente existiert im Code. Der Abgleich der Werte (Farben, Abstände, Texte) ist `figma.mjs --node` und nicht Teil dieser Prüfung.

Abgleich mit der Figma-Datei: nicht verfügbar (FIGMA_ACCESS_TOKEN fehlt)

Umgesetzt: 48 von 51 Frames, fehlend: 0, kein App-Screen: 3.

| Frame | Route/Komponente | Code | Stand |
| --- | --- | --- | --- |
| `01 Start` | /start | `src/app/start/page.tsx` | umgesetzt |
| `02 Lernpfad` | /lernpfad | `src/app/lernpfad/page.tsx` | umgesetzt |
| `03 Einheit` | /einheit/[unitId] | `src/app/einheit/[unitId]/page.tsx` | umgesetzt |
| `04 Ergebnis` | /ergebnis | `src/app/ergebnis/page.tsx` | umgesetzt |
| `05 Profil` | /profil | `src/app/profil/page.tsx` | umgesetzt |
| `06 Wiederholung` | /wiederholung | `src/app/wiederholung/page.tsx` | umgesetzt |
| `07 Wiederholung · fällig` | /wiederholung | `src/app/wiederholung/page.tsx` | umgesetzt |
| `08 Prüfungsmodus` | /pruefung | `src/app/pruefung/page.tsx` | umgesetzt |
| `09 Prüfung · läuft` | /pruefung | `src/app/pruefung/page.tsx` | umgesetzt |
| `10 Frage · Lückentext` | Komponente QuestionPanel (Typ lueckentext) | `src/components/learner/question-panel.tsx` | umgesetzt |
| `11 Frage · Zuordnen` | Komponente QuestionPanel (Typ zuordnen) | `src/components/learner/question-panel.tsx` | umgesetzt |
| `12 Frage · Reihenfolge` | Komponente QuestionPanel (Typ reihenfolge) | `src/components/learner/question-panel.tsx` | umgesetzt |
| `13 Frage · Offen` | Komponente QuestionPanel (Typ rechnen, offene Antwort mit Musterlösung) | `src/components/learner/question-panel.tsx` | umgesetzt |
| `03b Einheit · Feedback richtig` | /einheit/[unitId] | `src/components/ui/answer-feedback.tsx` | umgesetzt |
| `03c Einheit · Feedback falsch` | /einheit/[unitId] | `src/components/ui/answer-feedback.tsx` | umgesetzt |
| `14 Einheit geschafft` | /ergebnis | `src/app/ergebnis/page.tsx` | umgesetzt |
| `02b Lernpfad · Karte` | /lernpfad | `src/app/lernpfad/page.tsx`, `src/components/ui/path-node.tsx` | umgesetzt |
| `00 Onboarding · Willkommen` | /willkommen | `src/app/willkommen/page.tsx` | umgesetzt |
| `00b Onboarding · Einwilligung` | /einwilligung | `src/app/einwilligung/page.tsx` | umgesetzt |
| `15 Schwerpunkt wählen` | /schwerpunkt | `src/app/schwerpunkt/page.tsx` | umgesetzt |
| `16 Einstellungen` | /einstellungen | `src/app/einstellungen/page.tsx` | umgesetzt |
| `17 Zustände (Laden · Leer · Fehler · Offline)` | Komponente StateView | `src/components/ui/state-view.tsx` | umgesetzt |
| `18 Startseite · Bildungsträger` | / | `src/app/page.tsx` | umgesetzt |
| `19 Gruppenübersicht · Ausbilder` | /ausbilder | `src/app/ausbilder/page.tsx` | umgesetzt |
| `20 Demo-Zugang anfragen · Anmelden` | /demo, /anmelden | `src/app/demo/page.tsx`, `src/app/anmelden/page.tsx` | umgesetzt |
| `21 Prüfung · Ergebnis` | /pruefung/ergebnis | `src/app/pruefung/ergebnis/page.tsx` | umgesetzt |
| `22 Lernpfad · Serie und Tagesziel` | /lernpfad | `src/app/lernpfad/page.tsx`, `src/components/ui/daily-goal.tsx`, `src/components/ui/stat-chip.tsx` | umgesetzt |
| `23 Ergebnis · Serie verlängert` | /ergebnis | `src/app/ergebnis/page.tsx`, `src/components/ui/stat-chip.tsx` | umgesetzt |
| `24 Zustände · Serie und Tagesziel` | Komponenten DailyGoal, StatChip | `src/components/ui/daily-goal.tsx`, `src/components/ui/stat-chip.tsx` | umgesetzt |
| `25 Einwilligung · Nutzungsdaten (Banner)` | Komponente ConsentBanner | `src/components/learner/consent-banner.tsx` | umgesetzt |
| `26 Einstellungen · Datennutzung` | /einstellungen (Abschnitt Datennutzung) | `src/app/einstellungen/page.tsx` | umgesetzt |
| `27 Impressum` | /impressum | `src/app/impressum/page.tsx` | umgesetzt |
| `28 Datenschutzerklärung` | /datenschutz | `src/app/datenschutz/page.tsx` | umgesetzt |
| `29 Hinweis zu KI-Inhalten` | /ki-hinweis | `src/app/ki-hinweis/page.tsx` | umgesetzt |
| `A1 Lernpfad · Bento` | /lernpfad | `src/app/lernpfad/page.tsx` | umgesetzt |
| `A2 Einheit · Frage mit „Warum?“` | /einheit/[unitId] | `src/app/einheit/[unitId]/page.tsx`, `src/components/learner/why-panel.tsx` | umgesetzt |
| `A3 Startseite · Hero 2026 (Desktop)` | / | `src/app/page.tsx` | umgesetzt |
| `W1 Willkommen` | /willkommen | `src/app/willkommen/page.tsx` | umgesetzt |
| `W2 Einwilligung` | /einwilligung | `src/app/einwilligung/page.tsx` | umgesetzt |
| `W3 Schwerpunkt` | /schwerpunkt | `src/app/schwerpunkt/page.tsx` | umgesetzt |
| `W4 Einheit · Erklärung` | /einheit/[unitId] | `src/app/einheit/[unitId]/page.tsx` | umgesetzt |
| `W5 Ergebnis` | /ergebnis | `src/app/ergebnis/page.tsx` | umgesetzt |
| `W6 Wiederholung` | /wiederholung | `src/app/wiederholung/page.tsx` | umgesetzt |
| `W7 Prüfung · läuft` | /pruefung | `src/app/pruefung/page.tsx` | umgesetzt |
| `W8 Prüfungsergebnis` | /pruefung/ergebnis | `src/app/pruefung/ergebnis/page.tsx` | umgesetzt |
| `W9 Profil` | /profil | `src/app/profil/page.tsx` | umgesetzt |
| `W10 Zustände · Offline und Fehler` | Komponente StateView | `src/components/ui/state-view.tsx` | umgesetzt |
| `W11 Ausbilder · Gruppe (Desktop)` | /ausbilder | `src/app/ausbilder/page.tsx` | umgesetzt |
| `Intern · Checkliste vor dem ersten Demo-Zugang` | – | interne Checkliste für Sinan, keine App-Seite | kein Screen |
| `00 Richtung 2026 · Lern-App` | – | Richtungsfolie der Variante 2026, kein App-Screen | kein Screen |
| `Bühne · Lern-App 2026` | – | Präsentationsfläche, kein App-Screen | kein Screen |

## Fehlende Screens

Keine.

## Routen ohne eigenen Frame

| Route | Code | Notiz |
| --- | --- | --- |
| /quellen | `src/app/quellen/page.tsx` | Gerüst, laut FIGMA.md zu Screen 16 |
