-- SIN-621: Kurs "Industriemechaniker/in" und Übernahme der Einheiten mit Industriemechaniker-Quelle
-- (additive only; no DROP/TRUNCATE/DELETE). Die Zeilen im Kurs MAF Metall (e22073de-…) bleiben unverändert.
-- Einheiten-IDs bleiben gleich, weil der Schlüssel (course_id, id) den Kurs enthält: alte ID → gleiche ID im neuen Kurs.
-- Zuordnung und Zählung: docs/decisions/SIN-621-industriemechaniker-eigener-kurs.md.

insert into public.courses (id, keyword, status, mock, variants)
values ('7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65', 'Industriemechaniker', 'researched', false, 2)
on conflict (id) do nothing;

insert into public.sources (course_id, title, url, fetched_at, kind, note)
select '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65', v.title, v.url, v.fetched_at::timestamptz, v.kind, v.note
from (values
  ('KMK Rahmenlehrplan Industriemechaniker/in (Beschluss 25.03.2004 i. d. F. 23.02.2018) – Lernfelder 1–9',
   'https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf',
   '2026-10-03', 'rahmenlehrplan', 'rlp-im')
  -- Die Industriemechaniker-Ausbildungsverordnung folgt, sobald ihre URL gelesen und belegt ist
  -- (gesetze-im-internet.de war im Lauf nicht erreichbar; keine URL aus dem Gedächtnis).
) as v(title, url, fetched_at, kind, note)
where not exists (
  select 1 from public.sources s
  where s.course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65' and s.url = v.url
);

-- Einheiten (ohne gemeinsame Module), Fragen und Bewertungen kopieren.
insert into public.units (id, course_id, title, minutes, explanation, source_url, source_fetched_at, sort_order, created_at)
select u.id, '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65', u.title, u.minutes, u.explanation, u.source_url, u.source_fetched_at, u.sort_order, u.created_at
from public.units u
where u.course_id = 'e22073de-7020-4380-9002-c70d46c25e25'
  and u.source_url like '%Industriemechaniker-IH04-03-25-idf-18-02-23.pdf'
  and u.shared_module_key is null
on conflict (course_id, id) do nothing;

insert into public.questions (id, course_id, unit_id, type, prompt, choices, correct, explanation, source_url, sort_order, created_at)
select q.id, '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65', q.unit_id, q.type, q.prompt, q.choices, q.correct, q.explanation, q.source_url, q.sort_order, q.created_at
from public.questions q
join public.units nu on nu.course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65' and nu.id = q.unit_id
where q.course_id = 'e22073de-7020-4380-9002-c70d46c25e25'
on conflict (course_id, unit_id, id) do nothing;

insert into public.question_evaluations (question_id, unit_id, course_id, run_id, judge_model, prompt_version,
  quellentreue, eindeutigkeit, niveau, sprache, sicherheit_flag, passed, reason, langfuse_trace_id, created_at, content_hash)
select e.question_id, e.unit_id, '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65', e.run_id, e.judge_model, e.prompt_version,
  e.quellentreue, e.eindeutigkeit, e.niveau, e.sprache, e.sicherheit_flag, e.passed, e.reason, e.langfuse_trace_id, e.created_at, e.content_hash
from public.question_evaluations e
join public.units nu on nu.course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65' and nu.id = e.unit_id
where e.course_id = 'e22073de-7020-4380-9002-c70d46c25e25'
  and not exists (
    select 1 from public.question_evaluations x
    where x.course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65'
      and x.unit_id = e.unit_id and x.question_id = e.question_id and x.run_id = e.run_id and x.created_at = e.created_at
  );

-- Prüfung: Neu = Alt, sonst bricht die Migration ab und nichts bleibt hängen (eine Transaktion je Datei).
do $$
declare
  alt_u int; neu_u int; alt_q int; neu_q int;
begin
  select count(*) into alt_u from public.units
    where course_id = 'e22073de-7020-4380-9002-c70d46c25e25'
      and source_url like '%Industriemechaniker-IH04-03-25-idf-18-02-23.pdf' and shared_module_key is null;
  select count(*) into neu_u from public.units where course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65';
  select count(*) into alt_q from public.questions q
    join public.units u on u.course_id = q.course_id and u.id = q.unit_id
    where q.course_id = 'e22073de-7020-4380-9002-c70d46c25e25'
      and u.source_url like '%Industriemechaniker-IH04-03-25-idf-18-02-23.pdf' and u.shared_module_key is null;
  select count(*) into neu_q from public.questions where course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65';
  raise notice 'SIN-621: Einheiten alt % neu %, Fragen alt % neu %', alt_u, neu_u, alt_q, neu_q;
  if alt_u <> neu_u or alt_q <> neu_q then
    raise exception 'SIN-621: Übernahme unvollständig (Einheiten % / %, Fragen % / %)', alt_u, neu_u, alt_q, neu_q;
  end if;
end $$;
