# SIN-882 — Kurse ohne `lernfeld` ladbar, Fragen seitenweise

- **Links:** Linear [SIN-882](https://linear.app/sinan-kahraman/issue/SIN-882/industriemechaniker-ladbar-machen-kurs-hat-unitsquestions-aber); [PostgREST: Limits und Paginierung](https://docs.postgrest.org/en/stable/references/api/pagination_count.html); Vorgänger [SIN-768](https://linear.app/sinan-kahraman/issue/SIN-768).
- **Entscheidung:** `loadCourse` baut `course.generated` aus `units`/`questions`, auch wenn `courses.lernfeld` NULL ist (Kopf: Kurs-ID, Stichwort, `plan.focus` sonst Stichwort; KI-Kennzeichnung über `mitKiKennzeichnung`). `units` und `questions` werden in 1.000er-Blöcken mit stabiler Sortierung (`sort_order`, `id`) geladen. `content-publish` schreibt bei Mängeln oder Fehlern ein `loop_events`-Ereignis (Schritt `publish`, Status `fehler`, `grund` ≤ 300 Zeichen mit Anzahl je Prüfung) und gibt die Zeilen-ID aus.
- **Annahmen:** Der Fallback gilt für jeden Kurs mit Einheiten, nicht nur Industriemechaniker. Kein Schema-Eingriff, keine Migration.
- **Warum:** Der Richter und die Veröffentlichung lesen nur `generated`; ohne Fallback und Paginierung sahen sie 0 Einheiten bzw. höchstens 1.000 Fragen.
