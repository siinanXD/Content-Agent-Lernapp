# SIN-483 — Video-Agent: Tutorial-Video aus den Playwright-Klickwegen

**Links:** [Revideo](https://github.com/redotvideo/revideo) (Lizenz MIT), [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT), [Playwright Video](https://playwright.dev/docs/videos), `.github/workflows/video.yml`, `video/`, `scripts/autonomy/video.mjs`, `supabase/migrations/20261018010000_sin483_werbemittel.sql`

## Entscheidung

1. **Aufnahme mit Playwright, kein KI-Videomodell.** Das Video zeigt die echte App, es kann keine erfundenen Knöpfe enthalten. Klickweg: Start → Beruf wählen → Lernpfad → erste Einheit → Ergebnis (aus `e2e/gesamtweg.spec.ts` abgeleitet).
2. **Schnitt mit Revideo** (MIT, fertige Lösung vor Eigenbau). Als eigenes Paket in `video/schnitt/`, nicht in der `package.json` der App: die App-Abhängigkeiten und `package-lock.json` bleiben unverändert, Typecheck und Lint der App ignorieren den Ordner. Farben kommen aus `docs/design/tokens.json`.
3. **Ablage:** privater Bucket `werbemittel` und Tabelle `werbemittel` (additive Migration, RLS ohne Richtlinie, nur Service-Role). Status immer `wartet_auf_freigabe`. Der Workflow veröffentlicht nichts.
4. **Tageslimit:** nach `production-deploy` höchstens 1 erfolgreicher Lauf pro UTC-Tag (`video.mjs limit`); von Hand immer möglich.
5. **Länge:** unter 90 Sekunden, sonst bricht der Lauf vor der Ablage ab (`video.mjs pruefen`).
6. **Ton: vorerst ohne.** Chatterbox ist nicht eingebaut. Die Laufzeit ohne Grafikkarte ist nicht gemessen, daher gilt laut Issue: ohne Ton, Texte als Einblendung. Messung und Einbau als Folge-Issue.

## Annahmen

- **Revideo-Kennzahlen nicht geprüft.** Sterne und letzter Commit stammen nur aus dem Issue-Text und sind hier nicht belegt; vor dem Einbau auf GitHub nachprüfen (Regel: MIT/Apache, Commit jünger als 6 Monate, über 500 Sterne).
- **Revideo-API nicht in dieser Umgebung geprüft.** Kein Netz- und Paketzugriff im Worker. `video/schnitt/` (Szene, `render.mjs`, Versionen `^0.10.4`) folgt der Revideo-Doku aus dem Gedächtnis des Autors und ist unbestätigt, bis der erste Workflow-Lauf es bestätigt. Fällt der Schnitt aus, ist der Lauf rot, nichts wird abgelegt. Reparatur im selben PR.
- Der Revideo-Ordner hat keine Lock-Datei (Installation per `npm install` im Lauf), weil sie ohne Registry-Zugriff nicht erzeugt werden konnte. Nachziehen, sobald der Lauf grün ist.
- Geist wird nur als Schriftname gesetzt; ohne Schriftdatei im Renderer fällt Revideo auf serifenlose Systemschrift zurück. Schriftdatei einbinden, sobald der Lauf grün ist.
- Logo: `public/icon-512.svg` (das vorhandene App-Symbol). Kein neues Logo erfunden.
- „mit KI erstellt“ steht im Abspann, weil die Lerninhalte KI-erzeugt sind.
- Keine Personendaten: nur öffentliche Lesezugriffe, kein Konto; `/api/progress` und `/api/demo` sind abgefangen, das Einwilligungsbanner wird abgelehnt.
- Neue Secrets im Workflow: nur die vorhandenen `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`. Das Gate wertet das je neuer Datei als „neues Secret“, daher wartet der PR auf `freigegeben`.
- Kosten: 0 € API; verbraucht werden nur Actions-Minuten (Zeitlimit 30 Minuten).

## Warum

Ein echtes Tutorial ohne Generierungskosten und ohne Halluzinationen; Revideo erspart einen eigenen Videoschnitt; die Freigabe bleibt beim Menschen.
