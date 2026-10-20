-- SIN-885: Angehängte Sätze "Quelle: KMK-RLP …" aus den Lerntexten des Kurses Industriemechaniker entfernen
-- (additive only; es wird keine Zeile gelöscht, nur Text in vorhandenen Zeilen gekürzt). Die Quelle bleibt in source_url.
-- Der Verbotslisten-Wächter (src/lib/review/pruefhinweise.ts) blockiert sonst content-publish.
-- Die Sicherung vor der Ausführung legt run-task migrate an (SIN-293); content_versions hält die alten Texte (SIN-632).
-- Das lazy [^\n]*? steht vor dem ersten greedy Quantor, damit nur bis zum ersten Satzende entfernt wird;
-- das Leerzeichen davor entfernt das anschließende rtrim.

-- units.explanation, questions.prompt, questions.explanation
update public.units
set explanation = regexp_replace(regexp_replace(explanation, 'Quelle: KMK[^\n]*?\.(?=\s|$)', '', 'gi'), '\s+$', '')
where course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65'
  and explanation ~* 'Quelle: KMK';

update public.questions
set prompt = regexp_replace(regexp_replace(prompt, 'Quelle: KMK[^\n]*?\.(?=\s|$)', '', 'gi'), '\s+$', ''),
    explanation = regexp_replace(regexp_replace(explanation, 'Quelle: KMK[^\n]*?\.(?=\s|$)', '', 'gi'), '\s+$', '')
where course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65'
  and (prompt ~* 'Quelle: KMK' or explanation ~* 'Quelle: KMK');

-- questions.choices (jsonb): im JSON-Text endet der Satz vor dem schließenden Anführungszeichen.
update public.questions
set choices = regexp_replace(choices::text, '\s*Quelle: KMK[^"]*?\.(?=")', '', 'gi')::jsonb
where course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65'
  and choices is not null
  and choices::text ~* 'Quelle: KMK';

-- Prüfung (Soll: 0 in jeder Zeile); nur Hinweis, kein Abbruch, damit der Rest der Migrationen durchläuft.
-- select
--   (select count(*) from public.units where course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65' and explanation ~* 'Quelle: KMK') as units,
--   (select count(*) from public.questions where course_id = '7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65'
--      and (prompt ~* 'Quelle: KMK' or explanation ~* 'Quelle: KMK' or choices::text ~* 'Quelle: KMK')) as questions;
