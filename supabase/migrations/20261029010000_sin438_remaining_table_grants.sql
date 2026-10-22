-- SIN-438: preserve application DML, RLS, RPC signatures and service_role grants.
revoke truncate, trigger, references on
  public.content_factory_runs,
  public.course_shared_modules,
  public.courses,
  public.evaluations,
  public.judge_runs,
  public.leitstand_aufgaben,
  public.pipeline_run_costs,
  public.plans,
  public.question_evaluations,
  public.questions,
  public.shared_modules,
  public.sources,
  public.units,
  public.werbemittel
from anon, authenticated;

-- Only objects created by postgres; managed Supabase owners are out of scope.
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
