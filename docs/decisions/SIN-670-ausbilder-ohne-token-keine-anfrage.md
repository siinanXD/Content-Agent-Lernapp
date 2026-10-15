# SIN-670: /ausbilder ohne Token keine Anfrage

- Links: https://linear.app/sinan-kahraman/issue/SIN-670, Vorgänger SIN-667, SIN-668
- Entscheidung: Ohne Zugriffstoken zeigt die Seite sofort „Bitte anmelden“, auch wenn die Browser-Anmeldung nicht eingerichtet ist. Keine Anfrage an die API.
- Annahme: Ohne eingerichtete Anmeldung kann es nie ein Token geben, die API würde immer 401 melden.
- Warum: Der Testnutzer meldet jeden 401 als Konsolenfehler.
