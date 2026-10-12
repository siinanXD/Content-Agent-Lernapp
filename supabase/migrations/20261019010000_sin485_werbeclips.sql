-- SIN-485: KI-Werbeclips in der Tabelle werbemittel. Art erweitern, Kosten und Modell festhalten.
alter table public.werbemittel drop constraint if exists werbemittel_art_check;
alter table public.werbemittel add constraint werbemittel_art_check check (art in ('tutorial_video', 'werbeclip'));
alter table public.werbemittel add column if not exists kosten_eur numeric(8, 2);
alter table public.werbemittel add column if not exists modell text;
alter table public.werbemittel add column if not exists ki_kennzeichnung text;
notify pgrst, 'reload schema';
