# SIN-768: Industriemechaniker veröffentlichen, Befund und Blocker

- Issue: https://linear.app/sinan-kahraman/issue/SIN-768
- Davor: `docs/decisions/SIN-621-industriemechaniker-eigener-kurs.md` (Kurs `7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65`, Quelle KMK-RLP, Abruf 03.10.2026)

## Entscheidung

Dieser Lauf ändert keinen Code und nichts an der Datenbank. Der Auftrag lässt sich nicht als reine Veröffentlichung erledigen; die Lücken stehen unten. Das Issue bleibt offen (Done heißt live, SIN-616).

## Befund (aus dem Code gelesen)

1. Der Lernpfad ist fest an einen Kurs gebunden: `src/lib/learner/phase-a-index.json` (`courseId` = MAF `e22073de-…`), gelesen von `loadPathUnitsServer` (`phase-a-server.ts`) und `/api/learner/phase-a`. Der Kurs `7c3e9a14-…` kommt nirgends vor.
2. `BERUFE` in `src/lib/learner/onboarding.ts` kennt nur `maf` und `indkfl`. Industriemechaniker hat keine Kachel, und `courseModules()` in `src/app/lernpfad/page.tsx` liest nur die MAF-Map.
3. Es gibt keine Karte `industriemechaniker` in `docs/content/` (SIN-621 nennt das als offen); die Modul-Titel der 485 Einheiten stammen aus der MAF-Metall-Map.
4. `courses.status = 'published'` für den neuen Kurs und die Richter-Bewertung der kopierten Fragen lassen sich ohne Supabase-Zugang nicht prüfen oder setzen. Die Zahlen 485 und 3.149 sind der Befund aus dem Issue, nicht selbst gemessen.

## Annahmen

- Die Kopie aus SIN-621 hat die Bewertungen (`question_evaluations`) mitgenommen; „nur bestandene Fragen sichtbar“ gilt dann über `dropDiscardedQuestions` (SIN-395) ohne neuen Code.
- Eine Beruf-Kachel mit bestehenden Feldern ist ohne Design-Issue erlaubt (AGENTS.md, nur vorhandene Komponenten). Eine eigene Industriemechaniker-Kurswahl oder ein neuer Screen wäre ein Design-Issue.

## Vorschlag für die Teil-Issues

1. Lernpfad je Beruf: Kurs-Kennung aus dem gewählten Beruf statt aus `phase-a-index.json` (Server und `/api/learner/phase-a`), Module aus der Karte des Kurses. Berührt Auslieferung, braucht Live-Check-Anpassung (`live/live.spec.ts`).
2. Karte `industriemechaniker` und Eintrag in `BERUFE`.
3. Veröffentlichen: Status `published` setzen und Stichprobe Quelle/Abrufdatum je Einheit prüfen (Datenbankzugang nötig).
4. Live-Check nach dem Deploy, erst dann Done.

## Warum

Ein Merge, der nur den Status setzt, würde nichts zeigen: der Lernpfad liest den Kurs nicht. Ein breiter Umbau der Auslieferung ohne Datenbankzugang und ohne Live-Prüfung wäre unbelegt und würde „Done heißt live“ verletzen.
