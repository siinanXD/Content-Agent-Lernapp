-- SIN-1179: Die Content-Fabrik hatte zwei Takte (pg_cron `47 */2` aus sin847 und GitHub-Cron `47 */2` in content-grow.yml),
-- 16-17 statt 12 Läufe am Tag. Es bleibt der GitHub-Cron; der pg_cron-Job wird abgeschaltet.
-- Die Dispatcher-Jobs (github_dispatch_30m, github_leitstand_dispatch) und die Funktion github_workflow_dispatch bleiben.
-- Idempotent: fehlt der Job, passiert nichts (cron.unschedule(name) würde dann einen Fehler werfen).
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'github_content_grow_2h';
end;
$$;
