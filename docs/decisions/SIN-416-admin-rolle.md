# SIN-416: Admin-Rolle für Organisationen, Zugänge und alle Kurse

- **Links:** Linear [SIN-416](https://linear.app/sinan-kahraman/issue/SIN-416), [SIN-415](https://linear.app/sinan-kahraman/issue/SIN-415); Supabase [Auth Admin `updateUserById`](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security); Figma `0SWGDO2ioBD3MyXiAnrbRz`, Frame X1 `83:390`
- **Entscheidung:**
  - **Rolle:** `app_metadata.role = 'admin'`, nur mit dem Service-Role-Key setzbar (nie aus der App). `adminClient` (`src/lib/admin/server.ts`) prüft bei jeder Anfrage Token und Rolle (`auth.getUser`), antwortet sonst 401 oder 403 und gibt erst danach den Service-Client zurück. Gleiche Form wie `ausbilderClient`.
  - **Daten:** Die Admin-Routen `/api/admin/organisationen`, `/api/admin/anfragen`, `/api/admin/kurse` lesen mit dem Service-Role-Key, nur serverseitig und nur nach der Rollenprüfung. Es gibt keine neue RLS-Policy und keine Freigabe für `authenticated`; die Tabellen bleiben für Nutzer gesperrt. Dadurch kann auch kein Ausbilder-Konto Admin-Daten lesen.
  - **Datenbank:** Eine additive Migration: `organisations.contact_email` (Ansprechperson). Nichts wird gelöscht oder geändert.
  - **Organisation anlegen:** Name, E-Mail, Kontingent (Ausbilder 1–50, Azubi-Zugänge 0–500) → Zeile in `organisations` und ein Einladungslink in `trainer_access_links` (24 Zeichen, base64url, passt zu G0 aus SIN-415).
  - **Status:** Eingeladen = noch kein Ausbilder-Link eingelöst; Voll = Ausbilder- und Azubi-Kontingent ausgeschöpft; sonst Aktiv. Azubi-Zugänge zählen Mitglieder aktiver Gruppen, wie `organisation_belegt`.
- **Annahmen:**
  - „Link senden“ (Figma) erzeugt einen neuen Einladungslink und zeigt ihn zum Kopieren an. Es gibt keinen Mail-Dienst im Projekt; ein neuer Dienst wäre `risk:high` und nicht Teil dieses Issues. Sinan gibt den Link weiter. „Link erneut“ und „Erhöhen“ (Figma) gehen heute denselben Weg; Kontingent erhöhen ist offen und läuft bis dahin per Service-Role.
  - Die Seite `/admin` nutzt dieselbe Anmeldung wie die Ausbilder (Token aus der Browser-Sitzung). Ohne Admin-Rolle sieht man „Bitte anmelden“, der Server liefert 403.
  - „Anfragen (n)“ zeigt alle Einträge aus `demo_requests` (es gibt keinen Bearbeitungsstatus); die Kachel „offene Anfragen“ nutzt dieselbe Zahl. Höchstens 200 Anfragen und 500 Kurse je Aufruf.
  - Die Kurse-Liste zeigt Stichwort, Status und Datum (Tabelle `courses`); Inhalte der Kurse bleiben in den bestehenden Routen.
  - Figma-Werte gelesen (Texte, Reiter als Chips, Kacheln mit Radius 24, Tabelle mit fünf Spalten, Formular mit vier Feldern). Keine neuen Farben oder Komponenten; Tabelle und Chips nutzen Tokens und Bento-Klassen.
  - Vom Gate als `risk:high` geführt (Auth, Service-Role); wartet auf `freigegeben`. Das eigene Konto setzt Sinan danach einmalig auf `admin` (Aufgabe mit Label `sinan`).
- **Konto auf admin setzen (einmalig, SQL Editor in Supabase, E-Mail ersetzen):**
  `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, jsonb_build_object()) || jsonb_build_object('role', 'admin') where email = 'DEINE@EMAIL'` — danach abmelden und neu anmelden, damit das Token die Rolle trägt.
- **Warum:** Die Rollenprüfung sitzt an einer Stelle auf dem Server wie bei den Ausbildern; der Service-Role-Key bleibt serverseitig und wird nur nach bestandener Prüfung benutzt, so braucht es keine zusätzliche Datenbankfreigabe für Nutzer.
