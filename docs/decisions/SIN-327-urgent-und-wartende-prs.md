# SIN-327: Urgent zieht vor, wartende PRs geben ihren Platz frei

- Issue: https://linear.app/sinan-kahraman/issue/SIN-327
- Auslöser: SIN-322 (Urgent) wurde in der Nacht 06./07.10. zweimal übersprungen; SIN-315 und SIN-296 hielten mit roten PRs beide Plätze.

## Entscheidung

- `startOrder`: Priorität 1 (Urgent) kommt vor der Spuren-Rotation, älteste Nummer zuerst. Die Rotation gilt ab Priorität 2.
- Wartender PR (`scripts/autonomy/warten.mjs`): kein Worker läuft, PR offen (kein Draft) und Merge-Konflikt, oder `risk:high` ohne `freigegeben`, oder CI (`build`) rot mit `repair:3`/`needs-human`/`gate-bruch`. Das Issue bleibt „In Progress“, zählt in `pickMany` aber nicht als belegter Platz. Der Loop-Status zeigt „Wartende PRs“ getrennt von den Workern.
- Gate-Bruch: derselbe Check im selben Schritt rot in 2 oder mehr offenen PRs mit unterschiedlichem Head-Commit → ein Urgent-Bug-Issue (Titel `Bug: Gate-Bruch auf main: <Check> / <Schritt>`, Fehlerzeile, betroffene PRs), Duplikat-Schutz über den Titel (offen und letzte 24 h erledigt). Die PRs bekommen das Label `gate-bruch`; `repair.yml` überspringt sie.
- Nach dem Fix (kein offenes Gate-Bug-Issue mehr): Der Wächter (`status.mjs`) entfernt das Label und ruft `PUT /pulls/{n}/update-branch` auf (main einmergen, CI läuft neu). Alles mit `AGENT_WORKFLOW_TOKEN`, ohne neue Workflow-Rechte.

## Annahmen

- „Reparatur ohne Push“ lässt sich nicht von außen erkennen. Als Ersatz gilt das Label `needs-human` (setzt `repair.yml` nach der letzten Runde oder von Hand).
- Das Branch-Update trifft nur PRs mit Label `gate-bruch`; andere PRs hinter `main` aktualisiert weiter der bestehende Ablauf.
- Der CI-Stand ist der Check `build`; der Gate-Bruch liest die roten Schritte der Actions-Jobs je PR (nur bei rotem Check, wenige Anfragen).

## Warum

Gegenseitiges Warten (Fix kann nicht starten, weil die PRs ohne Fix nie grün werden) bricht nur, wenn blockierte PRs keinen Platz halten und Urgent die Rotation schlägt. Eigenbau, weil es nur eigene Linear- und GitHub-Logik betrifft; keine neuen Pakete.
