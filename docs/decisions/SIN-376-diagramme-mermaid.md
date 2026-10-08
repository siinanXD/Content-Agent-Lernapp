# SIN-376: Diagramme als Mermaid im Repo

- Issue: [SIN-376](https://linear.app/sinan-kahraman/issue/SIN-376)
- Mermaid in GitHub: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams

## Entscheidung

`docs/diagramme/pipeline.mmd` und `nutzerwege.mmd` sind die Quelle. Der PR-Steckbrief (`diagrammHinweis`) zeigt einen Hinweis, wenn Workflows, `scripts/autonomy/` oder `page.tsx` ohne die passende Datei geändert werden. Das Tages-Update nennt „Diagramme geändert“.

## Annahmen

- Die README kann keine `.mmd`-Datei einbinden; darum steht dort eine Kopie von `pipeline.mmd`, ein Test prüft die Gleichheit.
- Gruppe anlegen, Einladen und Beitritt Azubi gibt es im Code noch nicht; im Diagramm gestrichelt.
- Der Hinweis ist kein Blocker; der Worker bekommt die Regel im Auftragstext (`linear.mjs`).

## Warum

Keine neue Abhängigkeit. FigJam kann aus Actions nicht beschrieben werden, so bleibt der Stand im Repo aktuell.
