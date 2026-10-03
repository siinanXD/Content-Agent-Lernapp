-- AP-17 / SIN-195: durable course + learning persistence (additive only; no DROP/TRUNCATE).
-- Source of truth: docs/api/openapi.yaml + src/lib/pipeline/mock-store.ts
-- Apply via Supabase SQL editor or `supabase db push` (see docs/ops/SUPABASE.md).

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  status text not null
    check (status in ('created', 'researched', 'planned', 'generated', 'evaluated', 'published')),
  created_at timestamptz not null default now(),
  mock boolean not null default false,
  variants integer not null default 2
    check (variants between 2 and 3),
  -- Lernfeld metadata when generate has run ({ id, title, focus })
  lernfeld jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  title text not null,
  url text not null,
  fetched_at timestamptz not null,
  kind text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists sources_course_id_idx on public.sources (course_id);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses (id) on delete restrict,
  -- OpenAPI PlanResult.variants
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id text not null,
  course_id uuid not null references public.courses (id) on delete restrict,
  title text not null,
  minutes integer not null check (minutes > 0),
  explanation text not null default '',
  source_url text not null,
  source_fetched_at timestamptz not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (course_id, id)
);

create table if not exists public.questions (
  id text not null,
  course_id uuid not null,
  unit_id text not null,
  type text not null,
  prompt text not null,
  choices jsonb,
  correct jsonb not null,
  explanation text not null default '',
  source_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (course_id, unit_id, id),
  foreign key (course_id, unit_id)
    references public.units (course_id, id) on delete restrict
);

create index if not exists questions_course_id_idx on public.questions (course_id);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses (id) on delete restrict,
  passed boolean not null,
  scores jsonb not null,
  -- Full EvaluateResult for round-trip
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Learning progress: random anonymous id only — never name/email/device PII (PRODUCT.md).
create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  anonymous_id uuid not null,
  course_id uuid references public.courses (id) on delete restrict,
  unit_id text,
  question_id text,
  correct boolean,
  duration_ms integer,
  abandoned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists learning_progress_anonymous_id_idx
  on public.learning_progress (anonymous_id);

create index if not exists learning_progress_course_id_idx
  on public.learning_progress (course_id);

comment on table public.learning_progress is
  'Answer events keyed by anonymous random UUID only; no PII columns.';
comment on column public.learning_progress.anonymous_id is
  'Client-generated random UUID (Zufalls-Kennung); never email/name.';

-- Row Level Security on every table. No anon/authenticated policies → deny by default.
-- Server pipeline uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS); never expose that key to the browser.
alter table public.courses enable row level security;
alter table public.sources enable row level security;
alter table public.plans enable row level security;
alter table public.units enable row level security;
alter table public.questions enable row level security;
alter table public.evaluations enable row level security;
alter table public.learning_progress enable row level security;
