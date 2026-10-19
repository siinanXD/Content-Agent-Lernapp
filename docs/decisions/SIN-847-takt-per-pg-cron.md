# SIN-847: Dispatcher-Takt per Supabase pg_cron statt GitHub-Cron

- Issue: https://linear.app/sinan-kahraman/issue/SIN-847
- Befund: GitHub führte am 19.10. nur 6 von 48 geplanten `dispatch`-Läufen aus (Lücken 2–6 h); die Fabrik 6 statt 12.
- Entscheidung: Migration `20261024010000_sin847_github_dispatch_cron.sql` aktiviert `pg_cron` und `pg_net` und plant drei Jobs: `github_dispatch_30m` (Lernapp `dispatch.yml`, Minute 13/43), `github_leitstand_dispatch` (Leitstand `dispatch.yml`, Minute 14/44), `github_content_grow_2h` (`content-grow.yml`, Minute 47 alle 2 h). Eine `security definer`-Funktion `public.github_workflow_dispatch(repo, workflow)` liest den Token aus `vault.decrypted_secrets` (`agent_workflow_token`, von Sinan am 19.10. 17:20 angelegt) und ruft `POST …/actions/workflows/<datei>/dispatches` auf. Für API-Rollen (`anon`, `authenticated`, `service_role`) ist die Funktion gesperrt.
- GitHub-Cron in `dispatch.yml` bleibt als Rückfallebene auf `13,43 * * * *` (krumme Minuten, SIN-847).
- Verworfen: Vercel Cron (Hobby-Plan nur 1 Lauf/Tag), weiterer externer Dienst (cron-job.org ist schon für `status.yml` vorgesehen; keine zweite Stelle mit Token).
- Prüfung: `select * from cron.job;` und `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;` nach dem Migrationslauf; Beleg sind `workflow_dispatch`-Läufe des Dispatchers mit Absender des Tokens.
