# SIN-933: Keine Worker-Endlosschleife bei gemergtem PR

- Issue: https://linear.app/sinan-kahraman/issue/SIN-933
- Entscheidung: (1) `reconcile` prüft auch Todo-Issues: gemergter PR und alle Haken belegt → Done; nur `[nach Aktivierung]`-Haken offen → In Review (wie SIN-918 im Leitstand). (2) `dispatch.mjs --no-pr` setzt ein Issue mit gemergtem PR nie auf Todo, sondern auf Done oder In Review. (3) `fetchComments` liest 250 statt der ersten 50 Kommentare, damit `noPrStreak` (zweimal ohne PR → `needs-human`, SIN-362) und `hakenStreak` auch bei langen Verläufen die neuesten Läufe sehen.
- Annahmen: Todo mit gemergtem PR und echten offenen Haken wird nicht abgeglichen; es bleibt bei der Haken-Sperre (SIN-795) und der Zwei-Läufe-Sperre, damit Nacharbeit nach „Part of“-PRs möglich bleibt. Ursache der Schleife: Linear lieferte nur die ältesten 50 Kommentare (Vermutung aus dem Code, Logs waren nicht lesbar).
- Warum: Leerläufe kosten ca. 6 USD/Tag; die Korrektur nutzt vorhandene Bausteine statt neuer Zähler.
