# SIN-879: /beruf lädt nicht (Timeout)

- Links: https://linear.app/sinan-kahraman/issue/SIN-879, `scripts/autonomy/crawler.mjs` (`waitUntil: "networkidle"`)
- Entscheidung: `listCourses` lädt die Kurse parallel statt nacheinander; der Abruf von `/api/kurse` auf `/beruf` bricht nach 10 s ab.
- Annahme (nicht live belegt, kein Zugriff auf Vercel/Supabase): `/api/kurse` brauchte durch die Reihenfolge (je Kurs 5 Abfragen nacheinander) länger als 30 s, `networkidle` wurde nie erreicht.
- Warum: Kleinster Eingriff ohne neue Abhängigkeit; die Seite zeigt ohne Kursliste weiter die Berufe.
