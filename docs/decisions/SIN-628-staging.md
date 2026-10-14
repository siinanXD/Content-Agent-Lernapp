# SIN-628 Staging für Inhalte

- Issue: https://linear.app/sinan-kahraman/issue/SIN-628
- Verwandt: SIN-337 (Migrationen vorher gegen wegwerfbare lokale Supabase), SIN-395 (verworfene Fragen), SIN-473 (Schema-Sperre)

## Entscheidung

Variante A (kein zweites Supabase-Projekt, keine Kosten). Jede Einheit hat den Status `entwurf | geprueft | veroeffentlicht` (`GeneratedUnit.status`, `src/lib/generate/staging.ts`).

- Die Fabrik (`scripts/content-grow.ts`) setzt den Status über `freigabe()`: Richter bestanden **und** Proben grün → `veroeffentlicht`; Richter bestanden, Proben rot → `geprueft`; sonst `entwurf`. Durchgefallene neue Einheiten werden als Entwurf gespeichert statt verworfen (sichtbar zur Prüfung, nichts gelöscht).
- Die App zeigt nur `veroeffentlicht`: `dropDiscardedQuestions` filtert zuerst mit `nurVeroeffentlicht`. Das ist die gemeinsame Stelle von Lernpfad, Einheit, Wiederholung, Prüfung und `/api/learner/phase-a`.
- Einheiten ohne Status (Bestand) gelten als `veroeffentlicht`: nichts verschwindet für Lernende, keine Datenumschreibung nötig.
- Eine bestehende veröffentlichte Einheit wird nie durch eine nicht freigegebene Fassung ersetzt (alte Fassung bleibt).

## Annahmen

- Der Status liegt im Inhalts-JSON (`courses.lernfeld`), weil die App nur dieses liest. Die normalisierten Tabellen `units`/`questions` werden von der App nicht gelesen. Deshalb **keine Migration**, keine Schema-Änderung, kein `drop`.
- „Abnahme-Proben“ gibt es im Repo nicht als eigene Prüfung. Annahme: Proben = (1) alle Fragen bestehen das Fragen-Schema, (2) mindestens `MIN_PASSED_QUESTIONS` Fragen, (3) kein interner Prüfhinweis im Text (`PRUEFHINWEIS_MUSTER`, SIN-620). Weitere Proben gehören in `probenGruen()`.
- Freigabe geschieht im selben Lauf unmittelbar nach dem Richter (ein Schreibvorgang); der Zwischenzustand „alles Neue ist Entwurf“ steckt in `freigabe()`, nicht in einem zweiten Schreibvorgang.
- Manuelle Freigabe eines `geprueft`/`entwurf`-Eintrags: Status im JSON von Hand auf `veroeffentlicht` setzen; ein eigenes Werkzeug ist nicht Teil dieses Issues.

## Warum

Ein fehlerhafter Fabrik-Lauf soll nicht sofort bei Lernenden landen. Variante A kostet nichts und braucht kein zweites Projekt; Variante B nur, wenn A nicht reicht.
