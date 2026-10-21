# SIN-899 — Richter-Bewertungen seitenweise laden

- **Links:** Linear [SIN-899](https://linear.app/sinan-kahraman/issue/SIN-899); [PostgREST: Limits und Paginierung](https://docs.postgrest.org/en/stable/references/api/pagination_count.html); Vorgänger SIN-882 (`loadAll`).
- **Entscheidung:** `listQuestionEvaluations` nutzt das vorhandene `loadAll` (1.000er-Blöcke, Sortierung `created_at`, `id`). `frageId` entfernt das Einheiten-Präfix wiederholt (bereits gemergt).
- **Annahmen:** Der Trockenlauf von `content-publish` gegen die Live-Datenbank ist im Worker ohne Supabase-Zugang nicht möglich; er bleibt offen.
- **Warum:** Ohne `range` kappte PostgREST bei 1.000 Zeilen; bei 3.149 bzw. 7.311 Bewertungen fehlten die meisten.
