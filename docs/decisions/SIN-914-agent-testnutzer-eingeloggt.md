# SIN-914 Agent-Testnutzer: Crawler und PR-Crawler prüfen eingeloggt

- Issue: https://linear.app/sinan-kahraman/issue/SIN-914
- Gleiches Muster wie SIN-913 (Leitstand, anderes Repo; dort keine Entscheidungsdatei in diesem Repo). Verwandt: SIN-640 (Testnutzer), SIN-906 (PR-Crawler)
- Geprüft: Supabase [`auth.admin.generateLink`](https://supabase.com/docs/reference/javascript/auth-admin-generatelink) liefert `hashed_token`, [`verifyOtp`](https://supabase.com/docs/reference/javascript/auth-verifyotp) mit `token_hash` erzeugt die Sitzung ohne E-Mail und ohne Passwort. Playwright [`storageState`](https://playwright.dev/docs/auth) übernimmt `localStorage` je Herkunft; supabase-js im Browser liest die Sitzung aus `sb-<Projekt>-auth-token`. Fertige Auth-Helfer wären eine neue Abhängigkeit für rund 80 Zeilen.
- Freigabe: Sinan, 21.10.2026, „Testnutzer ok“ (Auth-Änderung, `risk:high` vorab freigegeben; Label `freigegeben` setzt Sinan am PR).

## Entscheidung

1. `scripts/agent-testnutzer/sitzung.mjs`: legt `agent-lernend` und `agent-ausbilder` idempotent per Admin-API an (`app_metadata.agent = true`, Ausbilder zusätzlich `role: "ausbilder"`), holt je eine Sitzung (generateLink → verifyOtp) und schreibt einen Playwright-`storageState` nach `$RUNNER_TEMP/agent`. Kein Admin-Konto, kein neues Secret (vorhandene `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Die Sitzung wird nie hochgeladen: die Artefakte nennen nur ihre eigenen Pfade.
2. Adressen sind Repo-Variablen `AGENT_LERNEND_EMAIL`, `AGENT_AUSBILDER_EMAIL` (Adressen ohne Postfach, z. B. auf `.invalid`-ähnlicher eigener Domain), optional `AGENT_ORGANISATION_ID` für den Ausbilder. Fehlen sie, überspringt der Helfer und alles läuft wie bisher ohne Login.
3. Testdaten-Markierung: der `storageState` setzt `cal-anonymous-id` auf `agent-test-<rolle>`; alle Fortschrittszeilen der Konten tragen das Präfix. `ohneTestdaten` filtert sie aus den Kennzahlen (`content-metrics.mjs`, damit Planer und Lern-Schleife). Neue Auswertungen über `learning_progress` müssen denselben Filter nutzen.
4. `testnutzer.yml` (Crawler): zusätzlicher Durchgang nur für Routen hinter dem Login (`hinterLogin`), Funde mit Präfix `[eingeloggt]`; führt eine Seite zurück zu `/anmelden`, ist das ein Fund. `pr-crawler.yml`: geänderte Routen hinter dem Login laufen mit der passenden Sitzung (Ausbilder-Bereich: Ausbilder, sonst Lernende), Bild und Video entstehen aus dieser Sitzung.
5. Playwright-Smoke `e2e/agent-eingeloggt.spec.ts` öffnet `/lernpfad` mit demselben `storageState`-Bau (Attrappen-Sitzung in CI ohne Supabase, echte Sitzung über `AGENT_STORAGE_STATE`).

## Annahmen

- Die Vorschau-Deployments kennen dieselbe Supabase-Instanz (`NEXT_PUBLIC_SUPABASE_*`), sonst erkennt die App die Sitzung nicht und der Crawler meldet „Sitzung wird nicht erkannt“.
- Fortschritt wird über `anonymous_id` gespeichert, nicht über die Konto-ID; die Kennung im localStorage ist deshalb die belastbare Markierung. Schreibende `/api`-Anfragen sind im Crawler ohnehin abgefangen.
- `docs/abnahme.yml` gab es noch nicht; es startet mit dem Format `proben` (Datei-Check) und der Probe für den Helfer.
- Die Organisation des Test-Ausbilders legt Sinan bei Bedarf an (Variable `AGENT_ORGANISATION_ID`); ohne sie sieht der Ausbilder-Bereich nur den leeren Zustand.

## Warum

Der Crawler sah nur Seiten ohne Login; Fehler in Lernpfad, Profil, Prüfung und Ausbilder-Bereich fielen erst bei echten Nutzern auf. Magic-Link-Hash und Service-Role-Key vorhanden: keine Kosten, keine neue Abhängigkeit.

## Nachtrag: Beleg im PR-Kommentar

Der PR-Crawler prüft nach jeder Seite hinter dem Login, ob die Sitzung griff: landet sie auf `/anmelden`, ist das ein roter Fund (Kategorie `login`) statt eines Bilds der Anmeldung. Gegriffene Sitzungen stehen im Kommentar als „Eingeloggt geprüft als Testkonto …“ über den Bildern der Route.
