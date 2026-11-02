-- SIN-1451: Lernstand gehört zum Konto. Eine Zeile je angemeldetem Konto: Lernereignisse (Serie, Tagesziel,
-- abgeschlossene Einheiten) und Wiederholungs-Stapel. Nur hinzufügen, keine bestehende Tabelle wird geändert.
-- Zugriff nur über RLS mit auth.uid(): Konto B sieht und ändert nichts von Konto A. Kein Löschrecht für Clients;
-- mit dem Konto verschwindet die Zeile (Datenschutz).
-- Keine Personendaten außer der Konto-ID: Ereignisse tragen Zeitpunkt, Tag, Art und Einheit-ID.

create table if not exists public.learner_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  events jsonb not null default '[]'::jsonb
    check (jsonb_typeof(events) = 'array' and jsonb_array_length(events) <= 800),
  stack jsonb not null default '[]'::jsonb
    check (jsonb_typeof(stack) = 'array' and jsonb_array_length(stack) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.learner_state enable row level security;

revoke all on public.learner_state from anon, authenticated;
grant select, insert, update on public.learner_state to authenticated;

create policy learner_state_select_own on public.learner_state
  for select to authenticated using (user_id = (select auth.uid()));

create policy learner_state_insert_own on public.learner_state
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy learner_state_update_own on public.learner_state
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

comment on table public.learner_state is
  'SIN-1451: Lernstand je Konto (events = Lernereignisse, stack = Leitner-Stapel). Der Browser bleibt Zwischenspeicher und führt beim Anmelden zusammen.';
