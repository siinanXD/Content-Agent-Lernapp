# Rechtsseiten

Eine Datei je Seite: `impressum.md` → `/impressum`, `datenschutz.md` → `/datenschutz`, `ki-hinweis.md` → `/ki-hinweis`. Texte ersetzen ohne Code-Änderung.

- Kopf zwischen `---`: `titel` (Pflicht), `entwurf` (Hinweistext, wird nur gezeigt, solange Platzhalter im Text stehen), `inhalt: ja` (Sprunglinks zu allen `##`-Überschriften).
- `## Überschrift` beginnt einen Abschnitt. Zeilen darunter bilden einen Absatz, Zeilenumbrüche bleiben erhalten.
- `- Name | Zweck | Region` ergibt eine Karte (Auftragsverarbeiter).
- `[Text](/pfad)` ist ein Link. `[Text]` ohne Klammer dahinter ist ein Platzhalter: Er wird farbig markiert. Solange einer im Text steht, zeigt die Seite oben „Entwurf“ und sendet `noindex`. Sind alle Platzhalter ersetzt, verschwindet beides von selbst.
- Der Parser steht in `src/lib/legal/legal-content.ts`. Ein Test prüft, dass die Liste der Auftragsverarbeiter zu den Diensten im Repo passt.
