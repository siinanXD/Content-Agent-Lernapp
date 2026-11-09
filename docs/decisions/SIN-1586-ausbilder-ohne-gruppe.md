# SIN-1586: Ausbilder ohne Gruppe ist ein leerer Zustand, kein 404

- Issue: https://linear.app/sinan-kahraman/issue/SIN-1586
- Entscheidung: `GET /api/ausbilder/gruppe` ohne `id` antwortet ohne Gruppe mit `200` und `{ "group": null, "members": [] }`. `/ausbilder` zeigt dazu den vorhandenen Leer-Zustand „Noch keine Gruppe“ mit dem Formular „Gruppe anlegen“.
- Annahme: Mit `?id=` bleibt eine unbekannte Gruppe ein `404` („Diese Gruppe gibt es nicht“): Dort wurde eine bestimmte Gruppe verlangt, die fehlt. `401`, `403`, `409` und `503` sind unverändert.
- Warum: Nach der Erstanmeldung hat ein Ausbilder noch keine Gruppe. Ein `404` dafür steht als Konsolenfehler im Browser und macht `crawl` und `bilder` in jedem PR rot.
- Aufrufer (Grep `ausbilder/gruppe`): `src/app/ausbilder/page.tsx` (einziger Leser der GET-Antwort, angepasst), `src/components/ausbilder/group-form.tsx` (nur POST), `scripts/autonomy/live-check.mjs` und `e2e/ausbilder.spec.ts` (prüfen 401/503 ohne Anmeldung), `live/live.spec.ts` und `e2e/demo-gruppe.spec.ts` (Attrappe mit Gruppe).
