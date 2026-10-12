-- SIN-481: Agenten-Rolle je Ereignis (additiv, nur neue Spalte). Wert aus docs/autonomy/agents.json.
alter table public.loop_events add column if not exists agent text;

create index if not exists loop_events_agent_created_idx on public.loop_events (agent, created_at desc);

notify pgrst, 'reload schema';
