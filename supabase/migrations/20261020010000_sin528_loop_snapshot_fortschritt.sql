-- SIN-528: Fortschritt je Projekt im Schnappschuss (aus Linear): erledigte und alle Issues im Meilenstein
-- „v1 Grundgerüst“ sowie offene Ideen („v2 Ideen“). Nur hinzufügen.
alter table public.loop_snapshot add column if not exists fertig_v1 integer;
alter table public.loop_snapshot add column if not exists gesamt_v1 integer;
alter table public.loop_snapshot add column if not exists ideen_offen integer;
