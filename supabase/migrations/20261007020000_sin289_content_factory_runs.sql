-- SIN-289: Statusdatensatz je Lauf der Content-Fabrik (additiv; kein DROP/TRUNCATE/DELETE).
-- Enthält nur Kennungen und Zahlen, keine Personendaten. Der Planer leitet daraus „läuft wöchentlich“ und „hängt“ ab.

create table if not exists public.content_factory_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  course_id text not null,
  module_id text,
  new_module boolean not null default false,
  queue_open boolean not null default true,
  units_generated integer not null default 0,
  units_published integer not null default 0,
  cost_eur numeric(10, 2) not null default 0,
  stopped boolean not null default false,
  stop_reason text,
  created_at timestamptz not null default now()
);

create index if not exists content_factory_runs_created_at_idx on public.content_factory_runs (created_at desc);

-- Wie die anderen Tabellen: RLS an, keine Policies für anon/authenticated → nur Service-Role.
alter table public.content_factory_runs enable row level security;
