-- SIN-1549 (Schema 1/3): Spalten für Modul, Block, Prüfungsgebiet, Stufe und Bild. Nur hinzufügen, alles nullable,
-- keine Standardwerte; RLS und Policies bleiben unverändert. Der Nachtrag schreibt nur in die neuen Spalten und
-- ist wiederholbar (setzt nur, wo die Spalte noch leer ist).
-- Bild: bilder.json gibt es noch nicht (Bilder 1/6, SIN-1543); dessen Nachtrag kommt mit diesem Issue.

alter table public.units
  add column if not exists module_id text,
  add column if not exists block_id text,
  add column if not exists image jsonb;

alter table public.questions
  add column if not exists exam_areas text[],
  add column if not exists level text,
  add column if not exists image jsonb;

-- Modul und Block aus der Einheiten-ID (<Modul>-<n>-u<n>), wie deriveModuleBlock in src/lib/learner/modul-block.ts.
update public.units
set module_id = split_part(id, '-', 1),
    block_id = split_part(id, '-', 1) || '-' || split_part(id, '-', 2)
where module_id is null
  and block_id is null
  and id ~ '^[A-Z0-9]+-[0-9]+-u[0-9]+$';

-- Prüfungsgebiet aus docs/content/zuordnung/gebiete-*.json (SIN-1534). Ausnahmen je Einheit zuerst,
-- danach je Block; exam_areas is null schützt die Ausnahmen.

-- Maschinen- und Anlagenführer (Kurs e22073de-7020-4380-9002-c70d46c25e25, Stand 2026-11-03)
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF1-1-u12' and exam_areas is null;
update public.questions set exam_areas = array['PT-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF1-3-u11' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF1-5-u1' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF1-5-u2' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF1-5-u4' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF4-7-u6' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF5-4-u3' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF5-4-u6' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF5-9-u2' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF5-9-u3' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF5-9-u4' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF6-2-u3' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF6-2-u5' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF6-2-u7' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF6-2-u9' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF7-5-u1' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'LF7-5-u3' and exam_areas is null;
update public.questions set exam_areas = array['PP-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id = 'PA-3-u10' and exam_areas is null;
update public.questions set exam_areas = array['TRAIN-AP'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'APPT-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-e'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-8-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF1-9-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-e'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-8-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF2-9-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-e'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF3-8-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF4-8-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-8-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF5-9-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF6-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF6-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF6-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF6-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF6-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF6-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF7-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF7-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF7-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF7-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF7-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF8-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF8-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF8-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF8-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-f'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF8-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF8-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF9-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF9-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF9-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF9-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-c'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'LF9-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'M0-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'M0-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'M0-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'M0-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PT-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-d'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-a'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-e'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'PA-8-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'QS-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'QS-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['PP-b'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'QS-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'SBP-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'SBP-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'WISO-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'WISO-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'WISO-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['TRAIN-ZP'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'ZP-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['TRAIN-ZP'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'ZP-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['TRAIN-ZP'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'ZP-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['TRAIN-ZP'] where course_id = 'e22073de-7020-4380-9002-c70d46c25e25' and unit_id like 'ZP-4-u%' and exam_areas is null;

-- Industriekaufmann (Kurs 5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31, Stand 2026-11-03)
update public.questions set exam_areas = array['T1-5'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'DIG-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-5'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'DIG-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-5'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'DIG-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-0-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'EG-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'FA-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF1-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'FA-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'FA-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF1-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF1-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF1-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF1-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF1-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF1-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF10-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF10-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF10-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF10-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF10-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF10-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF11-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF11-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF11-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF11-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF11-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF11-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF11-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF12-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF12-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF2-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF2-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF2-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-5'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF2-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF12-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF2-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF3-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF12-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF3-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF12-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF3-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF12-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF3-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF12-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF3-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF13-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF13-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-5'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF3-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF13-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF3-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF13-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2B-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF13-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF4-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF4-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF4-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF4-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF4-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF4-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF5-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF5-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF5-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF5-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF5-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF5-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF6-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF6-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF6-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF6-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF6-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF6-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF6-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF7-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF7-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF7-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF8-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF8-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF8-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF8-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF8-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF8-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF9-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF9-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF9-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF9-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF9-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF9-6-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'LF9-7-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'M0-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'M0-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'M0-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-5'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'M0-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'M0-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T1-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T1-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T1-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T1-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T1-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['TRAIN-T1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T1-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T2A-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-2'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T2A-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-3'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T2A-3-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-4'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T2A-4-u%' and exam_areas is null;
update public.questions set exam_areas = array['T2A-5'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'T2A-5-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'WISO-1-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'WISO-2-u%' and exam_areas is null;
update public.questions set exam_areas = array['WISO-1'] where course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and unit_id like 'WISO-3-u%' and exam_areas is null;
