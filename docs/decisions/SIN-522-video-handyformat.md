# SIN-522: Tutorial-Video im Handy-Format, Text neben der App

- Links: [SIN-522](https://linear.app/sinan-kahraman/issue/SIN-522), SIN-483 (`docs/decisions/SIN-483-video-agent.md`), Bildvergleich SIN-300
- Entscheidung: Aufnahme mit 390×844 (`deviceScaleFactor` 2, Video 780×1688). Schnitt 1920×1080: App im Rahmen links, Schritt-Titel und Text in der rechten Spalte, nie über der App. Der Workflow zieht je Schritt ein Standbild (ffmpeg) als Artefakt `video-standbilder`.
- Annahmen: Der Zeitpunkt des Standbilds ist Titel (3 s) + Schrittstart + 1 s. Der Rahmen ist ein schlichter Rand in `brand-accent`; keine neue Komponente und keine neue Farbe.
- Warum: Die Lern-App ist für das Handy gebaut; ein Band über der Aufnahme verdeckte die Hauptknöpfe. Standbilder machen die Prüfung ohne Abspielen möglich.
