# SIN-1197 Anmeldung nach Standard: Passwort, Registrieren, Passwort vergessen, Google

- Issue: https://linear.app/sinan-kahraman/issue/SIN-1197
- Maßstab: Abschnitt „Anmeldung (Standard für jede App mit Konten)“ in `siinanXD/leitstand-2` `docs/stack.md` (PR #45). Verwandt: SIN-1198 (Lifestyle), SIN-1199 (gemeinsames Supabase-Auth: Google, SMTP).
- Geprüft: supabase-js [`signInWithPassword`](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [`signUp`](https://supabase.com/docs/reference/javascript/auth-signup), [`resetPasswordForEmail`](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [`updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser), [`signInWithOAuth`](https://supabase.com/docs/reference/javascript/auth-signinwithoauth). Fertige Auth-UI (`@supabase/auth-ui-react`) ist nicht mehr gepflegt und bringt eigene Optik; die Seiten sind klein genug für vorhandene Bausteine (`TextField`, `Button`, `StateView`).
- Freigabe: Sinan, 29.10.2026, Kommentar im Issue: „Selbst registrierte Konten sind Lernende ohne Organisation.“ Kein Label `entscheidung` nötig. PR-Label `risk:high` setzt `pr-gate` (Auth); Freigabe bleibt bei Sinan.

## Entscheidung

1. Neue Seiten `/registrieren`, `/passwort-vergessen`, `/passwort-neu`; `/anmelden` bekommt Passwort, Google und „Passwort vergessen?“. Der Magic-Link bleibt (`shouldCreateUser: false`, Ziel wie bisher `/ausbilder/gruppen`).
2. Selbst registrierte Konten tragen keine `app_metadata` (Rolle, Organisation setzt nur der Server mit dem Service-Role-Key). Alle Gruppen- und Organisationsdaten hängen an `app_metadata.role = 'ausbilder'` oder sind für Nutzer gesperrt, daher braucht es keine Migration. Beleg: `src/lib/auth/anmeldung.test.ts` prüft alle Migrationen (Regeln auf `trainer_groups`, `group_members`, `group_invitations`; Sperre der Organisations-Tabellen; Rollenprüfung in jeder `ausbilder_*`-Funktion) und die API (`ausbilderClient` antwortet einem Konto ohne Rolle mit 403, auch wenn `user_metadata.role` gesetzt ist).
3. Mail- und Google-Links nutzen die eigene Origin (`mailLink`), nie die Site-URL des Projekts. `?weiter=` nimmt nur Pfade der eigenen Seite (`sicheresZiel`), sonst gäbe es einen offenen Weiterleiter.
4. Fehlertexte verraten nicht, ob eine Adresse ein Konto hat: gleiche Antwort bei Registrieren und Passwort vergessen, einheitliche Meldung bei falschem Login.
5. Playwright bekommt die Supabase-Adresse über die Testnaht `globalThis.__SUPABASE_TEST__` in `browser-client.ts`, weil der CI-Build ohne Supabase-Umgebung läuft und die übrigen Specs „nicht eingerichtet“ voraussetzen. Die Naht kann nur den eigenen Browser auf einen anderen Auth-Server zeigen; wer Skripte auf der Seite ausführen kann, hat ohnehin mehr.

## Annahmen

- Mindestlänge 8 Zeichen (Supabase-Standard ist 6). Falls das Projekt strengere Regeln hat, meldet die Seite „zu schwach“.
- Google-Konto landet nach dem Login auf `/lernpfad` (oder `?weiter=`); ein Ausbilder, der sich per Google anmeldet, öffnet `/ausbilder/gruppen` selbst. Die Rolle lässt sich vor dem Rücksprung nicht lesen.
- Neue Screens ohne Figma-Frame: Die Seiten setzen nur vorhandene Komponenten und Tokens ein (Frame 20 deckt sie in `figma-abdeckung.json`). Ein Design-Durchgang kann Optik und Texte nachziehen.
- Nicht Teil dieses Issues (Standard nennt sie): Konto-Seite mit Passwort ändern und Konto löschen, Abmelden im Menü.
