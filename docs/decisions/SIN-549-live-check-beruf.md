# SIN-549: Live-Check UI-04 folgt der Berufswahl ohne „Weiter“

- Links: Linear SIN-549, `live/live.spec.ts`, `src/app/beruf/page.tsx`
- Entscheidung: UI-04 klickt nach der Berufswahl nicht mehr auf „Weiter“. Die App bleibt unverändert, der Check wird dem Verhalten aus SIN-476 angepasst.
- Annahmen: Die Fehlerzeile des Laufs war nicht lesbar (Log-Zugriff gesperrt). Die rote Kennung UI-04 und der Abgleich mit dem Seitencode ergeben diese Ursache.
- Warum: Es gibt keinen „Weiter“-Knopf mehr, der Check lief in ein Timeout.
