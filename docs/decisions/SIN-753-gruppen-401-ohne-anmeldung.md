# SIN-753: /ausbilder/gruppen meldet weiter 401 im Testnutzer-Lauf

- Links: https://linear.app/sinan-kahraman/issue/SIN-753, Vorgänger SIN-669, SIN-670, SIN-671
- Entscheidung: Keine Codeänderung. `useGruppen` fragt schon ohne Token nicht, sobald die Anmeldung eingerichtet ist (`NEXT_PUBLIC_SUPABASE_*`). Ein Verzicht auf die Anfrage auch ohne eingerichtete Anmeldung würde die E2E-Tests mit gemockter API brechen (CI hat kein Supabase, nie ein Token).
- Annahme: Auf Vercel Production fehlen `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`docs/ENV.md`: nur `SUPABASE_URL`/`SUPABASE_ANON_KEY` sind dort gesetzt). Dann ist der Browser-Client `null`, die Absicherung greift live nicht, und die Seite fragt ohne Token an. Der 401 ist die erwartete Antwort. Nicht geprüft: kein Zugriff auf Vercel.
- Offene Aufgabe für Sinan (Linear-Issue konnte der Lauf nicht anlegen): in Vercel (Production) `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` mit denselben Werten wie `SUPABASE_URL`/`SUPABASE_ANON_KEY` setzen (öffentlicher Anon-Key, nie der Service-Role-Key) und neu deployen. Danach meldet der Testnutzer auf `/ausbilder`, `/ausbilder/gruppen` und `/ausbilder/archiv` keinen 401 mehr.
- Warum: Gleiche Ursache wie SIN-670/SIN-671; der Fund lässt sich nur durch die Konfiguration beheben, nicht im Code, ohne CI-Tests abzuschalten.
