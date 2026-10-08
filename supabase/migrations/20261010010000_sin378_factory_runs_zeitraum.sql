-- SIN-378: Start und Ende je Fabrik-Lauf (additiv; kein DROP/TRUNCATE/DELETE).
-- Bisherige Zeilen behalten null. Abbrüche (fehlende Secrets, Absturz) schreiben stopped = true mit stop_reason.

alter table public.content_factory_runs add column if not exists started_at timestamptz;
alter table public.content_factory_runs add column if not exists finished_at timestamptz;

notify pgrst, 'reload schema';
