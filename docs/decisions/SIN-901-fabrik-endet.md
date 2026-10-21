# SIN-901: Content-Fabrik hört auf, wenn nichts mehr zu erzeugen ist

- Linear: SIN-901 (Sinan, 21.10.2026), Vorgänger SIN-797 (Durchlauf), SIN-807 (Anstoß), SIN-887 (Veröffentlichen als eigene Aufgabe)
- Code: `leerlaufGrund`, `erzeugteIds`, `FERTIG_STOP` in `src/lib/generate/content-grow.ts`; `repairZiele`, `repairRunden` in `src/lib/generate/repair-questions.ts`; `scripts/content-grow.ts`; `scripts/ap15-regen-dropped.ts`; `scripts/autonomy/fabrik-anstoss.mjs`; `kostenZeile` in `scripts/autonomy/fabrik.mjs`

## Entscheidung

- „Offen“ heißt nicht erzeugt und nicht endgültig verworfen. Ein Entwurf zählt als erzeugt: Er wartet auf das Veröffentlichen und wird nicht neu erzeugt.
- Findet `chooseRunMap` keine Map mit offenen Einheiten (im Durchlauf nur die Maps der offenen Punkte) und gibt es keine Quellenänderung, endet der Lauf vor Reparatur, Quellenauszug und Batch: 0 API-Aufrufe, 0 €, Zeile in `content_factory_runs` mit `stop_reason = "fertig: alle Einheiten erzeugt"` und `queue_open = false` (kein „hängt“).
- Der Durchlauf endet damit von selbst. Der Punkt bleibt auf der Fertig-Liste offen; der Dispatcher-Anstoß (`entscheideAnstoss`) ruht, solange der jüngste Lauf „fertig:“ meldete. Cron und `workflow_dispatch` laufen weiter und prüfen kostenlos neu.
- Reparatur nur mit Ziel: Eine Einheit mit mindestens `MAX_REPAIR_RUNDEN` (2) Richter-Läufen `<lauf>-repair<n>` in `question_evaluations` gilt als endgültig verworfen und wird nicht mehr repariert oder neu erzeugt. Im Lauf zählt die Runde mit (`repairRunden + Runde - 1 < 2`).
- Leitstand: Kennzahl `content_fabrik_kosten` (heute, 7 Tage, Einheiten je €, bezahlte Läufe ohne Einheiten) aus `content_factory_runs`.

## Annahmen

- Die Zählung der Reparatur-Runden über die Richter-Läufe braucht keine Migration; ein Reparatur-Batch ohne verwertbare Ersatzfragen hinterlässt keine Bewertung und zählt nicht (Restrisiko, selten).
- Der Workflow `content-grow.yml` bleibt unverändert (Workflow-Änderung wäre risk:medium); der 2-h-Cron schreibt im Leerlauf nur eine kostenlose Statuszeile.

## Warum

Am 20.10. kostete die Fabrik 28 € für 434 Einheiten, am 21.10. 0,88 € für 0: Entwürfe galten als offen, die Reparatur fasste dieselben Einheiten jedes Mal an.
