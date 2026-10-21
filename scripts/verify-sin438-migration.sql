-- Run from psql on a staging database with ON_ERROR_STOP=1. Always rolls back.
begin;
set local lock_timeout = '3s';
create temp table sin438_dml_before on commit drop as
select c.oid, r.role_name, p.privilege,
       has_table_privilege(r.role_name, c.oid, p.privilege) allowed
from pg_class c
cross join unnest(array['anon','authenticated','service_role','pruefer_readonly']) r(role_name)
cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) p(privilege)
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p');
create temp table sin438_acl_before on commit drop as
select oid, relacl::text acl, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind in ('r','p');
savepoint before_hardening;
\ir ../supabase/migrations/20261029010000_sin438_remaining_table_grants.sql
\ir ../supabase/migrations/20261029010000_sin438_remaining_table_grants.sql
\ir verify-table-grants.sql
do $$ begin
  if exists (select 1 from sin438_dml_before b
             where b.allowed is distinct from has_table_privilege(b.role_name,b.oid,b.privilege)) then
    raise exception 'SIN-438 changed application DML privileges';
  end if;
  if exists (select 1 from sin438_acl_before b join pg_class c on c.oid=b.oid
             where b.relrowsecurity is distinct from c.relrowsecurity) then
    raise exception 'SIN-438 changed RLS';
  end if;
end $$;
-- A future postgres-created table must inherit safe defaults; no rows are written.
create table public.sin438_acl_probe (id integer);
do $$ begin
  if exists (select 1 from unnest(array['anon','authenticated']) r(role_name)
             where has_table_privilege(r.role_name,'public.sin438_acl_probe','TRUNCATE,TRIGGER,REFERENCES')) then
    raise exception 'SIN-438 unsafe default table privileges';
  end if;
end $$;
rollback to savepoint before_hardening;
do $$ begin
  if exists (select 1 from sin438_acl_before b join pg_class c on c.oid=b.oid
             where b.acl is distinct from c.relacl::text or b.relrowsecurity is distinct from c.relrowsecurity) then
    raise exception 'SIN-438 rollback did not restore ACLs';
  end if;
end $$;
rollback;
