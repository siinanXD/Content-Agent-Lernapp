# AVV je Anbieter (SIN-634)

Stand: 2026-10-23. Alle Zeilen offen, solange die Checkliste in `checkliste-demo-zugang.md` nicht abgehakt ist. Die Links zum jeweiligen Vertrag stehen nicht hier, weil sie sich ändern: Sinan nimmt den AVV im Konto des Anbieters an und trägt Datum und Ablageort in die Spalte „Beleg“ ein (kein Vertragstext, keine Zugangsdaten).

Maßgeblich ist der Grundsatz aus `docs/PRODUCT.md`: Auftragsverarbeitungsvertrag mit jedem Anbieter, keine Personendaten in Prompts.

| Anbieter | Wofür | Personenbezogene Daten | Region / Hinweis | Beleg (Datum, Ablage) |
| --- | --- | --- | --- | --- |
| Vercel | Hosting der App | IP-Adressen, Anfrage-Logs | Funktionsregion in Vercel prüfen (`vercel.json` setzt keine) | offen |
| Supabase | Datenbank, Anmeldung | Konten, Lernstände | Projektregion EU prüfen | offen |
| Sentry | Fehlermeldungen | Fehlerkontext, IP | DSN-Host `ingest.de.sentry.io` (EU), IP-Speicherung siehe SIN-392 | offen |
| PostHog | Nutzungsmessung | Ereignisse nach Einwilligung | Laden erst nach Einwilligung (SIN-387), EU-Host prüfen | offen |
| Langfuse | Tracing der KI-Läufe | Prompts und Antworten (ohne Personendaten) | Langfuse Cloud EU | offen |
| Anthropic | Modell für Inhalte und Prüfer | Prompts mit Quellentext, keine Personendaten | Verarbeitungsort und Zusatz (DPA) prüfen, Drittland | offen |
| OpenAI | zweites Modell (Generator/Prüfer) | Prompts mit Quellentext, keine Personendaten | Verarbeitungsort und Zusatz (DPA) prüfen, Drittland | offen |

## „Begründet nicht nötig“

Ein AVV entfällt nur, wenn der Anbieter nachweislich keine personenbezogenen Daten verarbeitet. Das gilt hier höchstens für Anthropic und OpenAI, falls die Prompts belegt keine Personendaten enthalten. Die Begründung steht dann in der Spalte „Beleg“ mit Verweis auf die Prüfung, und der Anwalt bestätigt sie in Frage 4 (`anwaltstermin-it-recht.md`). Bis dahin gilt: Zusatz abschließen.
