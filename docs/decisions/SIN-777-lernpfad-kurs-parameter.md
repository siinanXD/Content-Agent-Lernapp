# SIN-777: Lernpfad lädt den Kurs über einen Parameter

- Issue: https://linear.app/sinan-kahraman/issue/SIN-777
- Vorarbeit: SIN-768 (Befund, PR #391)

## Entscheidung

- Neue Route `/lernpfad/[kurs]` (Kurs-Id) liest den Kurs aus `courses` mit `status = 'published'`; unbekannt, unveröffentlicht oder ohne spielbare Einheit ergibt 404.
- `GET /api/kurse` listet veröffentlichte Kurse mit mindestens einer spielbaren Einheit. Die Berufswahl (`/beruf`) zeigt sie als weitere Kacheln (vorhandene Kachel-Gestaltung, kein neuer Screen).
- `GET /api/learner/phase-a?kurs=<id>` liefert Einheiten eines anderen veröffentlichten Kurses. Einheit und Wiederholung laden den zuletzt gewählten Kurs (`localStorage` `cal-kurs`).
- `/lernpfad` bleibt unverändert der Standardkurs (MAF, `phase-a-index.json`). Kein Redirect: Die URL ist in Onboarding, Navigation und E2E überall verlinkt und liefert weiter dasselbe.

## Annahmen

- Keine Figma-Änderung nötig: Kacheln und Pfad nutzen vorhandene Bausteine.
- Modul- und Blocktitel fremder Kurse fallen auf die Ids zurück (Titel-Tabelle gilt nur für MAF); eigener Folge-Schritt, falls gewünscht.
- `listCourses` lädt jeden Kurs vollständig; bei wenigen Kursen und 5 Minuten Zwischenspeicher vertretbar.

## Warum

Jeder veröffentlichte Beruf wird ohne Code-Änderung lernbar. Keine Datenbankänderung.
