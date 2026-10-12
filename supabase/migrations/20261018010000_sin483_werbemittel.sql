-- SIN-483: Werbemittel (Tutorial-Videos) – additiv, nur neue Tabelle und neuer privater Storage-Bucket.
-- Enthält Pfade, Längen und Klickwege, keine Personendaten. Nichts wird ohne Freigabe veröffentlicht (Status).
create table if not exists public.werbemittel (
  id uuid primary key default gen_random_uuid(),
  produkt text not null,
  art text not null default 'tutorial_video' check (art in ('tutorial_video')),
  status text not null default 'wartet_auf_freigabe'
    check (status in ('wartet_auf_freigabe', 'freigegeben', 'abgelehnt', 'veroeffentlicht')),
  storage_pfad text not null,
  dauer_sekunden numeric(6, 1) not null check (dauer_sekunden > 0),
  klickweg jsonb not null default '[]'::jsonb,
  mit_ki boolean not null default true,
  mit_ton boolean not null default false,
  quelle_url text,
  commit_sha text,
  run_url text,
  created_at timestamptz not null default now(),
  freigegeben_at timestamptz
);

create index if not exists werbemittel_status_created_idx on public.werbemittel (status, created_at desc);

-- RLS ohne Richtlinie: nur die Service-Role (umgeht RLS) schreibt und liest.
alter table public.werbemittel enable row level security;

-- Privater Bucket (kein öffentlicher Zugriff, solange nichts freigegeben ist).
insert into storage.buckets (id, name, public)
values ('werbemittel', 'werbemittel', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
