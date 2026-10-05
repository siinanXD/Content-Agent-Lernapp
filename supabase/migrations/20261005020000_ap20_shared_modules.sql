-- AP-20 / SIN-217: Modul-Bibliothek für gemeinsame MAF-Module (additive only; no DROP/DELETE/TRUNCATE).
-- Einheiten eines gemeinsamen Moduls (M0) liegen einmal im Quellkurs; weitere Kurse
-- verknüpfen sie über course_shared_modules. Keine Kopie von Einheiten oder Fragen.
-- Nur M0 ist schwerpunktneutral (siehe docs/DECISIONS.md D-40); PA bleibt je Schwerpunkt eigen.

create table if not exists public.shared_modules (
  key text primary key,
  family text not null,
  module_id text not null,
  title text not null,
  source_course_id uuid not null references public.courses (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (family, module_id)
);

create table if not exists public.course_shared_modules (
  course_id uuid not null references public.courses (id) on delete restrict,
  module_key text not null references public.shared_modules (key) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (course_id, module_key)
);

create index if not exists course_shared_modules_module_key_idx
  on public.course_shared_modules (module_key);

-- Markiert Einheiten, die zu einem gemeinsamen Modul gehören.
alter table public.units
  add column if not exists shared_module_key text references public.shared_modules (key) on delete restrict;

alter table public.shared_modules enable row level security;
alter table public.course_shared_modules enable row level security;

-- Quellkurs: Metall-Kurs mit veröffentlichter Phase A (phase-a-index.json).
insert into public.shared_modules (key, family, module_id, title, source_course_id)
select 'maf:M0', 'maf', 'M0', 'Querschnitt: Beruf, Betrieb, Sicherheit, Umwelt', c.id
from public.courses c
where c.id = 'e22073de-7020-4380-9002-c70d46c25e25'
on conflict (key) do nothing;

update public.units
set shared_module_key = 'maf:M0'
where course_id = 'e22073de-7020-4380-9002-c70d46c25e25'
  and id like 'M0-%'
  and shared_module_key is null
  and exists (select 1 from public.shared_modules where key = 'maf:M0');

-- Kurse für die 6 weiteren Schwerpunkte (nur anlegen, wenn noch nicht vorhanden).
insert into public.courses (keyword, status, mock, variants)
select v.keyword, 'created', false, 2
from (values
  ('Maschinen- und Anlagenführer – Schwerpunkt Kunststoff'),
  ('Maschinen- und Anlagenführer – Schwerpunkt Lebensmittel'),
  ('Maschinen- und Anlagenführer – Schwerpunkt Packmittel'),
  ('Maschinen- und Anlagenführer – Schwerpunkt Textil'),
  ('Maschinen- und Anlagenführer – Schwerpunkt Textilveredelung'),
  ('Maschinen- und Anlagenführer – Schwerpunkt Druckverarbeitung')
) as v (keyword)
where not exists (
  select 1 from public.courses c where c.keyword = v.keyword and c.mock = false
);

-- M0 in alle 7 MAF-Kurse verknüpfen (Metall zeigt es aus dem eigenen Bestand).
insert into public.course_shared_modules (course_id, module_key, sort_order)
select c.id, 'maf:M0', 0
from public.courses c
where c.mock = false
  and (c.id = 'e22073de-7020-4380-9002-c70d46c25e25'
       or c.keyword like 'Maschinen- und Anlagenführer – Schwerpunkt %')
  and exists (select 1 from public.shared_modules where key = 'maf:M0')
on conflict (course_id, module_key) do nothing;
