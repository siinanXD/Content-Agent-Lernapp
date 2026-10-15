# SIN-671: /ausbilder/archiv ohne Token ohne API-Anfrage

- Issue: https://linear.app/sinan-kahraman/issue/SIN-671
- Entscheidung: `useGruppen` fragt `/api/ausbilder/gruppen` nur mit Token. Ohne Token sofort „Bitte anmelden“, auch wenn die Anmeldung im Browser nicht eingerichtet ist (Nachtrag zu SIN-669).
- Annahme: Der Fund kann vom Stand vor SIN-669 stammen; ist die Live-App ohne `NEXT_PUBLIC_SUPABASE_*` gebaut, griff die SIN-669-Ausnahme und die API lieferte 401.
- Warum: `ausbilderClient` antwortet ohne Token immer 401, bevor die Konfiguration geprüft wird; die Anfrage bringt nie etwas.
