# SIN-667: /ausbilder ohne Sitzung ohne API-Anfrage

- Issue: https://linear.app/sinan-kahraman/issue/SIN-667
- Entscheidung: `/ausbilder` fragt `/api/ausbilder/gruppe` nur, wenn ein Token vorliegt oder Anmeldung nicht eingerichtet ist (dann wie bisher, E2E-Mocks). Sonst sofort „Bitte anmelden“.
- Annahme: Die API erlaubt ohne Token nie Zugriff; der 401 war nur der Weg zum Anmelden-Zustand.
- Warum: Der Testnutzer meldet jede 4xx/5xx-Antwort. Die Anzeige bleibt gleich, der Fehlerfund entfällt.
