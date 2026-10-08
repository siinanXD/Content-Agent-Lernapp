-- SIN-258: Kosten-Ledger je Pipeline-Lauf (additiv; kein DROP/TRUNCATE/DELETE).
-- Enthält nur Kennungen und Zahlen, keine Personendaten, keine Prompts.

create table if not exists public.pipeline_run_costs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  course_id text not null,
  kind text not null,
  claude_input_tokens bigint not null default 0,
  claude_output_tokens bigint not null default 0,
  claude_cache_creation_tokens bigint not null default 0,
  claude_cache_read_tokens bigint not null default 0,
  openai_input_tokens bigint not null default 0,
  openai_output_tokens bigint not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  cost_eur numeric(10, 2) not null default 0,
  cap_eur numeric(10, 2) not null,
  stopped boolean not null default false,
  stop_reason text,
  langfuse_trace_id text,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_run_costs_run_id_idx on public.pipeline_run_costs (run_id);
create index if not exists pipeline_run_costs_created_at_idx on public.pipeline_run_costs (created_at desc);

-- Wie die anderen Tabellen: RLS an, keine Policies für anon/authenticated → nur Service-Role.
alter table public.pipeline_run_costs enable row level security;

-- PostgREST-Schema neu laden, damit die Tabelle über REST sichtbar ist (SIN-351).
notify pgrst, 'reload schema';
