-- SIN-303: Leitstand 1/3 – Ereignisse und Schnappschüsse des Loops (additiv, nur neue Tabellen).
-- Enthält nur Kennungen, Zahlen und Status, keine Personendaten, keine Prompts. Für alle Repos gleich (Projekt-Starter, SIN-202).

-- Wer den Leitstand lesen darf (Supabase-Auth-Nutzer). Einträge setzt nur Sinan über die Service-Role.
create table if not exists public.leitstand_nutzer (
  user_id uuid primary key references auth.users (id),
  created_at timestamptz not null default now()
);

-- Ein Ereignis je Start/Ende eines Schritts (dispatch, worker, pr-gate, planner, digest, status).
create table if not exists public.loop_events (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  step text not null,
  issue text,
  pr integer,
  status text not null check (status in ('start', 'ok', 'fehler', 'uebersprungen')),
  run_id text,
  run_url text,
  duration_ms bigint,
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  cache_write_tokens bigint,
  cost_usd numeric(10, 4),
  created_at timestamptz not null default now()
);

create index if not exists loop_events_project_created_idx on public.loop_events (project, created_at desc);
create index if not exists loop_events_step_created_idx on public.loop_events (step, created_at desc);

-- Letzter Stand je Projekt: Kontingente, Schlange, offene PRs (wird überschrieben, nicht angehängt).
create table if not exists public.loop_snapshot (
  project text primary key,
  quotas jsonb not null default '[]'::jsonb,
  queue jsonb not null default '{}'::jsonb,
  open_prs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS: schreiben nur die Service-Role (umgeht RLS); lesen nur Leitstand-Nutzer.
alter table public.leitstand_nutzer enable row level security;
alter table public.loop_events enable row level security;
alter table public.loop_snapshot enable row level security;

create policy leitstand_nutzer_lesen on public.leitstand_nutzer
  for select to authenticated using (user_id = auth.uid());

create policy loop_events_lesen on public.loop_events
  for select to authenticated
  using (exists (select 1 from public.leitstand_nutzer n where n.user_id = auth.uid()));

create policy loop_snapshot_lesen on public.loop_snapshot
  for select to authenticated
  using (exists (select 1 from public.leitstand_nutzer n where n.user_id = auth.uid()));

-- PostgREST-Schema neu laden, damit die Tabellen über REST sichtbar sind (SIN-351).
notify pgrst, 'reload schema';
