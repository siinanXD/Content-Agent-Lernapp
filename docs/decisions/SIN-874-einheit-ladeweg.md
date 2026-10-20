# SIN-874: Einheit lädt den Kurs nur einmal

- Links: https://linear.app/sinan-kahraman/issue/SIN-874
- Entscheidung: `fetchPhaseAPathUnits` teilt einen laufenden Abruf je Kurs. Der Testnutzer wartet auf die erste Frage bis 32 s statt 8 s.
- Annahmen: Das Artefakt `testnutzer` war nicht lesbar. Ursache angenommen: Lernpfad und Einheit luden den ganzen Kurs doppelt, die Einheit zeigte länger als 8 s keine Frage. Der nächste Lauf belegt es; bleibt der Fund, ist die Ursache eine andere (z. B. Einheit ohne Fragen).
- Warum: Kleinster Eingriff ohne neue Abhängigkeit; ein Abruf weniger hilft auch echten Lernenden bei langsamem Netz.
