# Fertig-Liste Lern-App v1 (Sinan, 16.10.2026; Stand 04.11.2026, SIN-1244, SIN-1533)
- [x] MAF Metall live, alle Einheiten und Fragen mit Quelle belegt — Beleg 04.11.: Supabase `courses` Status `published`, 701 Einheiten, 4.648 Fragen (lesende Abfrage, siehe unten)
- [x] Industriemechaniker veröffentlichen (485 Einheiten, 3.149 Fragen liegen belegt in Supabase) — Beleg 04.11.: Supabase `courses` Status `published`, 485 Einheiten, 3.149 Fragen (lesende Abfrage, siehe unten); SIN-768 Done
- [x] Industriekaufmann/-frau: Content erzeugen, belegen, veröffentlichen (Quellen liegen vor, 0 Einheiten) — Beleg 04.11.: Supabase `courses` Status `published`, 1.140 Einheiten, 7.311 Fragen (lesende Abfrage, siehe unten)
- [ ] PR-Crawler prüft geänderte Seiten auf der Vorschau ohne Fund
- [x] Impressum, Datenschutz, KI-Hinweis live; Stripe-Abo im Testmodus durchspielbar — Beleg: PR #394 (SIN-771), Test `e2e/rechtsseiten-reachable.spec.ts`
- [x] Leere Platzhalter-Kurse (6× MAF-Schwerpunkte) ausgeblendet — Beleg: PR #395 (SIN-772); 02.11. in Supabase weiter 6 Kurse `created` mit 0 Einheiten
- [ ] Seite „So funktioniert's" für Ausbilder

Fragezahlen gemessen am 04.11.2026 in Supabase (Projekt Content-Agent-Lernapp), Summe 15.108; maschinenlesbar in `docs/product-readiness.json` unter `fragenzahlen`:

```sql
select c.keyword, count(*) from questions q join courses c on c.id = q.course_id where c.status = 'published' group by 1;
select c.keyword, count(*) from units u join courses c on c.id = u.course_id where c.status = 'published' group by 1;
```

Die Zahlen vom 02.11. (10.570, 8.543, 12.400 Fragen) waren falsch: Die Abfrage verknüpfte `questions` nur über `unit_id` mit `units`. `units.id` ist nicht eindeutig (568 Einheiten-IDs wie `LF1-1-u1` kommen in mehreren Kursen vor), darum zählte jede Frage in jedem Kurs mit gleicher Einheiten-ID mit. Richtig ist die Verknüpfung über `course_id` (siehe oben).
