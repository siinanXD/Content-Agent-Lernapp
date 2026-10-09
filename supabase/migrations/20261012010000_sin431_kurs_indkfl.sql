-- SIN-431: Kurs "Industriekaufleute" und seine amtlichen Quellen (additive only; no DROP/TRUNCATE/DELETE).
-- Die Content-Fabrik (scripts/content-grow.ts) erzeugt die Einheiten; die Kennung steht in
-- src/lib/generate/content-grow.ts (MAP_COURSES.indkfl). Quellen und Abrufdatum stammen aus
-- docs/content/indkfl.json (Feld sources). Ohne amtliche Quelle entsteht kein Inhalt.

insert into public.courses (id, keyword, status, mock, variants)
values ('5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31', 'Industriekaufmann', 'researched', false, 2)
on conflict (id) do nothing;

insert into public.sources (course_id, title, url, fetched_at, kind, note)
select '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31', v.title, v.url, v.fetched_at::timestamptz, v.kind, v.note
from (values
  ('IndKflAusbV – Industriekaufleuteausbildungsverordnung vom 12. März 2024 (BGBl. 2024 I Nr. 94), in Kraft 1.8.2024 – Volltext',
   'https://www.gesetze-im-internet.de/indkflausbv/BJNR05E0A0024.html', '2026-10-03', 'ausbildungsordnung', 'indkfl'),
  ('IndKflAusbV Anlage (zu § 3 Abs. 1) – Ausbildungsrahmenplan, Abschnitte A und B mit zeitlichen Richtwerten in Wochen',
   'https://www.gesetze-im-internet.de/indkflausbv/anlage.html', '2026-10-03', 'ausbildungsordnung', 'indkfl-anlage'),
  ('IndKflAusbV § 4 Struktur der Berufsausbildung, Ausbildungsberufsbild und Einsatzgebiete',
   'https://www.gesetze-im-internet.de/indkflausbv/__4.html', '2026-10-03', 'ausbildungsordnung', 'indkfl-p4'),
  ('IndKflAusbV § 8 Prüfungsbereich des Teiles 1 „Leistungserstellung, Logistik, Beschaffung und Buchhaltung“',
   'https://www.gesetze-im-internet.de/indkflausbv/__8.html', '2026-10-03', 'pruefung', 'indkfl-p8'),
  ('IndKflAusbV § 11 Prüfungsbereich „Marketing, Vertrieb, Personalwesen und kaufmännische Steuerung und Kontrolle“',
   'https://www.gesetze-im-internet.de/indkflausbv/__11.html', '2026-10-03', 'pruefung', 'indkfl-p11'),
  ('IndKflAusbV § 12 Prüfungsbereich „Fachaufgabe im Einsatzgebiet“',
   'https://www.gesetze-im-internet.de/indkflausbv/__12.html', '2026-10-03', 'pruefung', 'indkfl-p12'),
  ('IndKflAusbV § 14 Gewichtung der Prüfungsbereiche und Bestehen',
   'https://www.gesetze-im-internet.de/indkflausbv/__14.html', '2026-10-03', 'pruefung', 'indkfl-p14'),
  ('KMK Rahmenlehrplan Industriekaufmann und Industriekauffrau (Beschluss 15.12.2023) – Lernfelder 1–13, 880 Std.',
   'https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriekaufleute_2023-12-15-mitEL.pdf', '2026-10-03', 'rahmenlehrplan', 'rlp-indkfl')
) as v(title, url, fetched_at, kind, note)
where exists (select 1 from public.courses where id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31')
  and not exists (
    select 1 from public.sources s
    where s.course_id = '5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31' and s.url = v.url
  );
