-- SIN-484: Werbetexte in derselben Tabelle wie die Videos – additiv (Constraint wird nur erweitert, keine Daten gelöscht).
-- Tabelle `werbemittel` kommt aus SIN-483. Status bleibt `wartet_auf_freigabe`, bis Sinan im Leitstand freigibt.
alter table public.werbemittel drop constraint if exists werbemittel_art_check;
alter table public.werbemittel
  add constraint werbemittel_art_check
  check (art in ('tutorial_video', 'text_linkedin', 'text_website', 'text_email'));

alter table public.werbemittel alter column storage_pfad drop not null;
alter table public.werbemittel alter column dauer_sekunden drop not null;

alter table public.werbemittel add column if not exists text_inhalt text;
alter table public.werbemittel add column if not exists modell text;
alter table public.werbemittel add column if not exists kosten_eur numeric(8, 4);
alter table public.werbemittel add column if not exists fakten jsonb;

notify pgrst, 'reload schema';
