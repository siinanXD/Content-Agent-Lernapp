# SIN-779: fälschlich geschlossene Issues wieder öffnen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-779
- Entscheidung: Die Haken-Prüfung (`pruefeHaken`, `reconcile`, `applyDone` in `scripts/autonomy/linear.mjs`) war schon auf main; „Part of“ allein belegt nichts. Neu: `live.mjs wieder-offen SIN-xxx "Grund"` setzt ein Issue zurück auf In Progress und kommentiert, damit SIN-768, 769, 770 wieder offen sind.
- Annahme: Der Aufruf braucht `LINEAR_API_KEY` und läuft nach dem Deploy mit dem Worker-Secret; im Agentenlauf ohne Schlüssel war er nicht ausführbar.
- Warum: Ein vorhandener Weg (live.mjs, `setState`) statt neuem Skript; keine neue Abhängigkeit.
