# SIN-779: Done nur, wenn alle Haken belegt sind

Links: [SIN-779](https://linear.app/sinan-kahraman/issue/SIN-779), [SIN-238](https://linear.app/sinan-kahraman/issue/SIN-238) (Loop-Wächter), [SIN-754](https://linear.app/sinan-kahraman/issue/SIN-754) (gleiche Regel im Leitstand), [SIN-616](https://linear.app/sinan-kahraman/issue/SIN-616) (Done heißt live).

## Entscheidung

Ein gemergter PR setzt ein Issue nur noch auf Done, wenn alle `- [ ]`-Haken der Beschreibung belegt sind. Das gilt an allen drei Stellen: Abgleich des Dispatchers (`reconcile`), Merge-Job (`dispatch.mjs --done`) und Loop-Wächter (`status.mjs`). Gemeinsamer Code: `pruefeHaken` und `applyDone` in `scripts/autonomy/linear.mjs`.

- Belegt ist ein Haken, wenn der PR-Text dieselbe Zeile als `- [x] …` führt (Groß-/Kleinschreibung egal). Belegte Haken setzt der Wächter in Linear auf `[x]`.
- Bleibt ein Haken offen, bleibt das Issue „In Progress“; ein Kommentar nennt die offenen Haken (einmal je Stand). Das Issue belegt dann keinen Dispatcher-Platz und wird nicht neu gestartet.
- Issues ohne Haken schließen wie bisher mit dem Merge.

## Annahmen

- Der Leitstand-Code aus SIN-754 liegt nicht in diesem Repo; die Regel ist hier nach der Beschreibung im Issue gebaut, nicht kopiert.
- „Part of“ steht laut Worker-Prompt in jedem PR. Es hält deshalb nur dort offen, wo das Issue Haken hat; ohne Haken gäbe es kein Kriterium, das sich je belegen ließe.
- Der Haken „Done heißt live“ muss von Hand oder durch einen späteren PR mit `- [x]`-Zeile belegt werden; bis dahin bleibt das Issue offen. Das ist gewollt (SIN-616).

## Warum

SIN-768 bis 770 wurden zweimal geschlossen, obwohl die Inhalte nicht veröffentlicht waren. Ein Merge belegt nur, dass Code da ist, nicht, dass das Kriterium gilt.
