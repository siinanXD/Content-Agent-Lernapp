# SIN-671: /ausbilder/archiv ohne Token ohne API-Anfrage

- Issue: https://linear.app/sinan-kahraman/issue/SIN-671
- Entscheidung: Keine Code-Änderung. `useGruppen` fragt schon seit SIN-668/SIN-669 nicht ohne Sitzung, sobald die Anmeldung eingerichtet ist (`NEXT_PUBLIC_SUPABASE_*`).
- Annahme: Der Fund stammt vom Stand vor SIN-669.
- Warum nicht auch ohne eingerichtete Anmeldung: Die E2E-Tests (`e2e/ausbilder-gruppen.spec.ts`) mocken die API ohne Supabase-Konfiguration, also ohne Token; ein Token-Zwang ließe sie scheitern (CI-Lauf 38665102863). Ohne Konfiguration zeigt die Seite nach dem 401 ohnehin „Bitte anmelden“.
