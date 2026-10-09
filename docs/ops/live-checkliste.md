# Live-Checkliste (SIN-319)

Der Workflow `nach-deploy` prüft nach jedem Production-Deploy (und nachts um 21:05) diese Liste gegen die laufende App.
Er ändert keine echten Nutzerdaten: Schreib-Endpunkte sind abgefangen oder laufen mit Test-UUID (`f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0`).

**Pflege:** Jede neue Seite und jede neue Funktion kommt hier mit einer Kennung dazu und wird in `scripts/autonomy/live-check.mjs`
(API) oder `live/live.spec.ts` (Browser) geprüft. Ein Unit-Test (`src/lib/live-check.test.ts`) bricht, wenn eine Kennung hier steht,
aber nirgends geprüft wird, oder umgekehrt. Neue Seiten unter `src/app` kommen zusätzlich in `e2e/routes.ts` (dann prüft UI-01 sie auf Handy und Desktop).

Rot bei einer Prüfung ohne Vermerk „nur Hinweis“ = Lauf rot = Revert-PR des letzten Deploys (`revert-guard`, `risk:medium`).
Hilft der Revert nicht (zweiter Lauf rot), meldet der Status-Wächter es an Sinan.

## API

- API-01 `/api/health` antwortet 200, Datenbank erreichbar
- API-02 `/api/learner/phase-a` liefert den Kurs
- API-03 Kurs- und Einheiten-Abruf (`/api/courses/<id>/lernpfad`)
- API-04 Einheiten enthalten Quelle und Abrufdatum
- API-05 Fortschritt speichern mit Test-Kennung (201)
- API-06 Fortschritt ohne Kennung wird abgelehnt (400)
- API-07 Demo-Anfrage im Testmodus (Honigtopf-Feld, speichert und versendet nichts)
- API-08 Ausbilder-API ohne Anmeldung: 401 oder 503, nie Daten

## Seiten und Abläufe (Handy 390 px und Desktop 1280 px)

- UI-00 Die Browser-Prüfungen liefern ein Ergebnis (sonst ist der Lauf rot)
- UI-01 Jede Seite aus `e2e/routes.ts` lädt (HTTP < 400, Überschrift sichtbar), Konsole ohne Fehler (UI-02 ist darin enthalten):
  Startseite, Start, Demo, Anmelden, Ausbilder, Willkommen, Einwilligung, Schwerpunkt, Lernpfad, Einheit, Ergebnis, Wiederholung,
  Prüfung, Prüfungsergebnis, Profil, Einstellungen, Impressum, Datenschutz, KI-Hinweis, Quellen
- UI-03 axe (WCAG 2.2 AA) ohne Verstöße auf den Hauptseiten (nur Desktop)
- UI-04 Onboarding: Willkommen → Einwilligung → Beruf → Schwerpunkt → Lernpfad
- UI-05 Einheit: Erklärung und alle 5 Fragetypen (Auswahl, Lückentext, Zuordnen, Reihenfolge, Rechnen), danach Ergebnis
- UI-06 Wiederholung öffnet
- UI-07 Prüfung starten, abgeben, Ergebnis
- UI-08 Profil und Einstellungen/Datennutzung
- UI-09 Ausbilder-Ansicht mit Test-Gruppe (Antwort vorgegeben)
- UI-10 Demo-Anfrage im Testmodus (abgefangen, kein Versand)
- UI-11 Anmelden-Seite zeigt Formular oder klare Meldung
- UI-12 Offline-Modus: geladene Einheit bleibt offline lesbar
- UI-13 Service-Worker liefert die neue Version

## Beobachtung

- LH-01 Lighthouse-Kurzlauf Startseite und Lernpfad, Schwelle 0,9 (nur Hinweis, kein Revert: Messwerte schwanken)
- SE-01 Sentry ohne neue Fehler seit dem Deploy (nur Hinweis). Läuft erst, wenn `SENTRY_*` im Workflow stehen; bis dahin „nicht verfügbar“
  (Freigabe nötig, siehe `docs/decisions/SIN-319-live-check.md`)

## Ergebnis

- Artefakt `live-check` des Laufs: `bericht.md` (Häkchen-Liste) und Screenshots je Seite (Handy und Desktop)
- Status-Seite und Tages-Update: „Live-Check 21:05: 42/42 grün“; bei Rot mit den roten Kennungen: „Live-Check 21:05: 40/42 ROT (UI-12, API-03)“ (höchstens 5, danach „+N weitere“)
