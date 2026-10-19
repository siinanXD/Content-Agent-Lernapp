# SIN-852: Einspruchsfrist an den Frist-Gründen, nicht am Head

- Issue: https://linear.app/sinan-kahraman/issue/SIN-852
- Befund: `einspruchFrist` startete bei jedem neuen Head 2 h neu. Commits „main einmergen“ (Loop, Reparatur) kommen mehrmals täglich; #425 und #426 warteten deshalb seit 15:30 und mergten nie.
- Entscheidung: Marker `<!-- pr-gate-einspruch sha=… bis=… gruende=<hash> -->`. Gleiche Frist-Gründe (Schlüssel aus `classifyRisk().einspruch`) behalten `bis`, auch bei neuem Head; geänderte oder neue Gründe starten die Frist neu. Leser (`einspruch-ende` in `pr-gate.yml`, `status.mjs`) akzeptieren das optionale Feld.
- Annahme: Ein Commit, der den Inhalt der Frist-Gründe ändert, ändert auch deren Schlüssel (Schlüssel enthalten die betroffene Zeile). Alte Marker ohne `gruende` bekommen einmal eine neue Frist.
- Warum: Die Frist soll Sinan Zeit für einen Einspruch geben, nicht jede Aktualisierung des Branches bestrafen.
