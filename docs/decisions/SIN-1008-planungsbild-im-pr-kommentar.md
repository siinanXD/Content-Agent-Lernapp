# SIN-1008 PR-Crawler zeigt das Planungsbild neben dem Vorschaubild

- Issue: https://linear.app/sinan-kahraman/issue/SIN-1008 (aus SIN-943 ausgegliedert), verwandt SIN-906
- Geprüft: keine fertige Lösung nötig; Linear-GraphQL (`issue.attachments`, `description`) ist schon im Repo angebunden (`scripts/autonomy/linear.mjs`).

## Entscheidung

`scripts/pr-crawler/soll.mjs` liest die Issue-Kennung aus PR-Titel oder „Part of SIN-…“ und holt das Planungsbild aus Linear: erst Anhang mit Bild-Adresse, sonst Markdown-Bild der Beschreibung; Frame-ID aus Anhangtitel oder Beschreibung. `kommentar.mjs` zeigt es in der ersten Route in einer Zeile links vom Ist-Bild. Ohne Bild, Issue oder `LINEAR_API_KEY` bleibt es `{}` und der Kommentar ändert sich nicht (kein Platzhalter).

## Annahmen

- Der Leitstand-Planer (SIN-943) legt das PNG als Anhang oder Bild in der Beschreibung ab und nennt „Frame <ID>“; das Format ist dort nicht belegt, daher beide Wege.
- Linear-Upload-Adressen sind nur angemeldet sichtbar; der Kommentar verlinkt sie trotzdem (Sinan ist angemeldet). Ein Fehlbild ist kein Fehler des Laufs.
- Ein Soll-Bild je Issue, nicht je Route; es steht bei der ersten Route.

## Warum

Soll und Ist stehen im PR nebeneinander, ohne dass jemand das Linear-Issue öffnen muss. Weich gebaut, damit der Crawler nie an Linear scheitert.
