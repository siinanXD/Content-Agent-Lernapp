# SIN-669: /ausbilder/gruppen (und Archiv) ohne Sitzung ohne API-Anfrage

- Issue: https://linear.app/sinan-kahraman/issue/SIN-669
- Entscheidung: Der Hook `useGruppen` fragt `/api/ausbilder/gruppen` nur, wenn ein Token vorliegt oder Anmeldung nicht eingerichtet ist. Sonst sofort „Bitte anmelden“. Gilt auch für das Archiv, das denselben Hook nutzt.
- Annahme: Die API erlaubt ohne Token nie Zugriff.
- Warum: Gleiche Ursache wie SIN-667 (`SIN-667-ausbilder-ohne-sitzung.md`); der Testnutzer meldet jede 4xx-Antwort.
