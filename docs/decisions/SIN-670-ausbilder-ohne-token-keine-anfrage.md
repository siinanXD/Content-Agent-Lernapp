# SIN-670: /ausbilder ohne Token keine Anfrage

- Links: https://linear.app/sinan-kahraman/issue/SIN-670, Vorgänger SIN-667, SIN-668
- Entscheidung: Keine Codeänderung. Die Regel „Anmeldung eingerichtet, kein Token → direkt Anmelden-Zustand, keine Anfrage“ bleibt. Ohne eingerichtete Anmeldung wird weiter gefragt.
- Annahme: Ohne eingerichtete Anmeldung gibt es im Betrieb keinen Anmeldeweg und keinen echten Nutzer; ein Verzicht auf die Anfrage würde nur die E2E-Tests mit gemockter API brechen (CI hat kein Supabase, nie ein Token). Erster Versuch scheiterte daran in 8 Tests.
