# SIN-262: Planer in der Bauphase alle 2 h nachfüllen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-262/bauphase-planer-haufiger-nachfullen-2-h-statt-6-h-und-label-claude
- Baut auf: SIN-253 (Nachfüllen), SIN-244 (Phasen)
- Doku: https://docs.github.com/en/actions/learn-github-actions/variables

## Entscheidung

Bauphase: `REFILL_MIN` 6, `REFILL_MAX` 10, `REFILL_COOLDOWN_H` 2 (vorher 5 / 8 / 6). Die Repo-Variablen gleichen Namens überschreiben die Werte (`refillConfig` in `refill.mjs`, in `status.yml` durchgereicht); ungültige oder leere Werte fallen auf den Standard zurück. Betrieb unverändert: kein Nachfüllen. Der Planer setzt bei jedem angelegten Issue der Spuren frontend/backend/content das Label `claude` zusätzlich zur Spur. Das Tages-Update zeigt „Schlange: n startbar, nächstes Nachfüllen frühestens hh:mm UTC“.

## Annahmen

- Design-Pakete bekommen `claude` nicht: Sie werden in einer Sitzung mit Figma-Connector erledigt, nicht von einem Agenten (Label `design`, SIN-239).
- Der Wächter `status.yml` läuft stündlich, der 2-h-Abstand wird also auf die nächste volle Stunde aufgerundet.
- Zeiten im Tages-Update in UTC, wie der Rest des Status-Issues.

## Warum

Die Worker schaffen über Nacht 5–10 Issues; bei 6 h Abstand und Schwelle 5 entsteht Leerlauf. Ohne `claude` startet der Ersatz-Agent die Issues nicht (SIN-254 bis SIN-260).
