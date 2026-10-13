-- SIN-548: Grund für Pause-Ereignisse (`worker_pause`) in loop_events. Nur hinzufügen.
alter table public.loop_events add column if not exists grund text;
