# SIN-274: Figma-Abgleich „17 Zustände“

- Links: [Linear SIN-274](https://linear.app/sinan-kahraman/issue/SIN-274/figma-abgleich-17-fehlende-zustande-im-code-umsetzen), [Figma-Datei](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz), Detail in `docs/design/figma-abgleich-sin-274.md`

## Entscheidung

Der Frame heißt in Figma `17 Zustände (Laden · Leer · Fehler · Offline)`. `FIGMA.md` führt jetzt diesen Namen,
damit der Namensabgleich ohne Abweichung läuft. Die Offline-Standardtexte in `StateView` folgen dem Figma-Wortlaut.
Es fehlt kein Zustand in Figma, daher nichts fürs Design-Paket.

## Annahmen

- „17 Zustände“ in der Meldung ist der Frame-Name, keine Anzahl.
- Fehler- und Leer-Texte in Figma sind Beispiele für einen Fall (Einheit, Wiederholung); die Seiten dürfen eigene Texte übergeben.
- Karten-Aufbau und Platzhalterbalken (Laden) bleiben ein eigenes Code-Issue.

## Warum

Der Abgleich vergleicht Namen exakt; die Doku an die Quelle (Figma) anzupassen ist billiger und sicherer als den Frame umzubenennen.
