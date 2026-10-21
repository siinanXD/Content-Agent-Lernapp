-- SIN-947: content_version_schreiben ist eine Trigger-Funktion, keine öffentliche RPC.
-- PostgreSQL prüft EXECUTE beim Anlegen des Triggers; beim Auslösen braucht der aufrufende
-- Nutzer kein direktes EXECUTE-Recht auf die Trigger-Funktion.
-- Least privilege: keine direkte Ausführung über PostgREST für PUBLIC/anon/authenticated.
revoke execute on function public.content_version_schreiben() from public, anon, authenticated;

-- Alle Tabellen in der Funktion sind schema-qualifiziert. Leerer search_path verhindert,
-- dass ein SECURITY DEFINER-Aufruf Namen über ein manipulierbares Schema auflöst.
alter function public.content_version_schreiben() set search_path = '';

notify pgrst, 'reload schema';
