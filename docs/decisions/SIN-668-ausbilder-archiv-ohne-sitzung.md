# SIN-668: /ausbilder/archiv ohne Sitzung ohne API-Anfrage

- Issue: https://linear.app/sinan-kahraman/issue/SIN-668 (gleiche Ursache wie SIN-667)
- Entscheidung: Der gemeinsame Hook `useGruppen` (Archiv und Gruppenauswahl) fragt `/api/ausbilder/gruppen` nicht, wenn Anmeldung eingerichtet ist und kein Token vorliegt. Sofort „Bitte anmelden“.
- Annahme: Die API erlaubt ohne Token nie Zugriff.
- Warum: Der Testnutzer meldet jede 4xx/5xx-Antwort; die Anzeige bleibt gleich.
