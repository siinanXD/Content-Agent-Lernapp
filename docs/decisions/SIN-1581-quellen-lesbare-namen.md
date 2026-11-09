# SIN-1581: /quellen zeigt Namen statt Adressen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-1581
- Entscheidung: Der Link-Text je Einheit ist der Titel der amtlichen Quelle aus `src/lib/research/maf-seed-sources.ts` (dort schon gepflegt, ohne den Zusatz „(HTML)“). Die Adresse steht nur im `href`. Quellen, Links und Abrufdatum bleiben gleich.
- Annahme: Für eine Adresse ohne Eintrag in dieser Liste steht „Quelle bei <Anbieter>“ (Hostname), bei unlesbarer Adresse „Amtliche Quelle“. Heute trifft das auf keine Einheit der Seite zu.
- Warum: Die Klickprobe meldet auf `/quellen` die Regel `rohdaten` (rohe Adresse im Text). Kein neues Feld und keine neue Komponente: Die Titel gibt es schon im Repo.
