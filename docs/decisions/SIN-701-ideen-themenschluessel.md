# SIN-701: Ideen-Sperre nach Thema statt nach Titel

- Linear: https://linear.app/sinan-kahraman/issue/SIN-701
- Folge-Issue im Leitstand: SIN-700

## Entscheidung

Jede Idee des Planers trägt einen Themenschlüssel (`thema`, z. B. `wcag-screenreader`, `beruf/modul/fragetyp`, `wochenkosten`), abgeleitet aus dem Beleg. Er steht als Marker `<!-- thema: … -->` in der Beschreibung des Issues. Der Prompt listet alle offenen Ideen (Backlog + Todo, Label `idee`) mit Schlüssel; `validatePlan` verwirft Ideen mit schon offenem oder fehlendem Schlüssel, auch wenn der Titel neu klingt. Ein Nachfüll-Lauf (`PLAN_MAX_ISSUES`), der nur Ideen erzeugen würde, legt nichts an und schreibt `found=false` ins Log und nach `GITHUB_OUTPUT`.

## Annahmen

- Ideen aus der Zeit vor dieser Änderung haben keinen Marker und sind nur über die bestehende Titel-Prüfung geschützt. Nachziehen wäre Handarbeit in Linear; unterbleibt, weil die Dubletten bereits geschlossen sind.
- Ideen ohne `thema` werden verworfen: ohne Schlüssel lässt sich nichts prüfen.
- `found=false` hängt noch an keinem Workflow-Schritt; der Leitstand (SIN-700) liest es aus dem Log.

## Warum

Die Titel-Ähnlichkeit (`duplicates.mjs`) greift bei jedem Lauf neu formulierten Titeln nicht: am 15.10. entstanden 19 Dubletten auf drei Themen. Ein Schlüssel aus dem Beleg bleibt über Formulierungen hinweg gleich. Eigenbau, weil es nur eine Prüfung von wenigen Zeilen ist.
