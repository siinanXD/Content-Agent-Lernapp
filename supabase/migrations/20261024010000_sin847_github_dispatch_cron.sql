-- SIN-847: Takt für die Dispatcher kommt von außerhalb von GitHub (additive only; no DROP/TRUNCATE/DELETE).
-- GitHub-Cron fällt unter Last aus (6 statt 48 Läufe am Tag). pg_cron ruft stattdessen `workflow_dispatch` auf:
--   github_dispatch_30m        → Content-Agent-Lernapp dispatch.yml, alle 30 Min (Minute 13 und 43)
--   github_leitstand_dispatch  → Leitstand dispatch.yml, alle 30 Min (Minute 14 und 44)
--   github_content_grow_2h     → Content-Agent-Lernapp content-grow.yml, alle 2 h (Minute 47)
-- Der Token liegt nur im Supabase Vault (`agent_workflow_token`, von Sinan am 19.10. angelegt) und in Infisical;
-- hier kein Klartext. Die Workflows sind idempotent (concurrency-Gruppen), doppelte Anstöße schaden nicht.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Ein Aufruf = ein workflow_dispatch gegen die GitHub-API. Token aus dem Vault, nie als Parameter.
create or replace function public.github_workflow_dispatch(repo text, workflow text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'agent_workflow_token';
  if token is null then
    raise exception 'SIN-847: Vault-Secret agent_workflow_token fehlt';
  end if;
  return net.http_post(
    url := 'https://api.github.com/repos/' || repo || '/actions/workflows/' || workflow || '/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'supabase-pg-cron-sin847',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('ref', 'main')
  );
end;
$$;

-- Nur der Datenbank-Besitzer (pg_cron) darf die Funktion aufrufen, keine API-Rollen.
revoke all on function public.github_workflow_dispatch(text, text) from public, anon, authenticated, service_role;

-- cron.schedule mit Namen ist idempotent: ein vorhandener Job gleichen Namens wird ersetzt.
select cron.schedule('github_dispatch_30m', '13,43 * * * *',
  $$select public.github_workflow_dispatch('siinanXD/Content-Agent-Lernapp', 'dispatch.yml')$$);
select cron.schedule('github_leitstand_dispatch', '14,44 * * * *',
  $$select public.github_workflow_dispatch('siinanXD/Leitstand', 'dispatch.yml')$$);
select cron.schedule('github_content_grow_2h', '47 */2 * * *',
  $$select public.github_workflow_dispatch('siinanXD/Content-Agent-Lernapp', 'content-grow.yml')$$);
