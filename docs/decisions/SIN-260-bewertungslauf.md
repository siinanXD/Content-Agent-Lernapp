# SIN-260 — Bewertungslauf über bestehende Fragen

- **Links:** Linear [SIN-260](https://linear.app/sinan-kahraman/issue/SIN-260); OpenAI [Pricing](https://platform.openai.com/docs/pricing); `src/lib/quality/judge-backfill.ts`; `scripts/sin260-judge-backfill.ts`; `supabase/migrations/20261006010000_sin260_judge_backfill.sql`; D-07; D-37
- **Entscheidung:** Eigener, kleiner Lauf `npm run quality:judge-backfill` auf dem vorhandenen Richter (`gpt-5.4-mini`, D-07) und der vorhandenen Tabelle `question_evaluations`. Kein Fremdwerkzeug: Der Richter, Kostenwächter und die Tabelle sind schon im Repo, ein Zusatzpaket brächte nur Abhängigkeiten. Je Frage wird ein Inhalts-Hash (`content_hash`) gespeichert; ein erneuter Lauf bewertet nur Fragen ohne Bewertung oder mit anderem Hash. Je Lauf schreibt die Tabelle `judge_runs` Kosten, Zählung und Stopp-Grund (Ledger). Die Bestehensquote je Modul liefert weiter `content-metrics.mjs` aus `question_quality_latest`; neu im Planer-Abschnitt: „Fragen bewertet: X von Y“.
- **Annahmen:**
  - Zeilen ohne Hash (Altzeilen aus AP-19/AP-21) gelten als bewertet. Sonst würden sie ohne Änderung neu bezahlt.
  - Der Hash umfasst Frage, richtige Antwort, Erklärung, Quelle, Modul, Jahr, Niveau und Sicherheits-Flag. Eine geänderte Judge-Prompt-Version löst keine Neubewertung aus (Kostenschutz); dafür müsste man bewusst Hashes ändern oder neu bewerten lassen.
  - Deckel: Stopp ab 19 € je Lauf über alle Kurse (hart 20 €), geprüft vor jedem 10er-Block. Bereits bewertete Blöcke bleiben gespeichert, der Rest folgt im nächsten Lauf.
  - Verworfene Fragen (`passed=false`) werden nur markiert, der Lauf ändert und veröffentlicht nichts. Wer veröffentlicht, liest `question_quality_latest`.
  - Der eigentliche Live-Lauf braucht `OPENAI_API_KEY` und Supabase-Zugang und wurde hier nicht ausgeführt (kein Zugriff auf Secrets). Er ist nach dem Merge manuell zu starten.
- **Warum:** „Jede Frage ist bewertet“ ist nur belegbar, wenn jede Frage eine gespeicherte Bewertung hat; Idempotenz über den Hash hält die Kosten bei Folgeläufen nahe null.
