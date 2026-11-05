# SIN-1549 — Schema 1/3: Spalten für Modul, Block, Gebiet, Stufe und Bild

- Links: [SIN-1549](https://linear.app/sinan-kahraman/issue/SIN-1549), [SIN-1531](https://linear.app/sinan-kahraman/issue/SIN-1531), [SIN-1534](https://linear.app/sinan-kahraman/issue/SIN-1534)
- Entscheidung: Eine additive Migration (`20261105010000_sin1549_gliederung_spalten.sql`): `units.module_id/block_id/image`, `questions.exam_areas/level/image`, alles nullable ohne Standardwert. Nachtrag nur in die neuen Spalten und wiederholbar: Modul und Block aus der Einheiten-ID, `exam_areas` aus den Tabellen von SIN-1534 als reines SQL (Ausnahmen je Einheit zuerst, dann je Block).
- Annahmen: Der Nachtrag für `image` fehlt, weil `bilder.json` noch nicht existiert (Bilder 1/6, SIN-1543); er kommt mit diesem Issue. `level` bleibt leer, die Stufe liefert erst der Inhalts-Agent (SIN-1551). Der Nachtrag ändert Zeilen, der Versions-Trigger (`content_versions`, SIN-632) schreibt dafür je geänderter Zeile eine Version.
- Warum: Gliederung und Gebiete sollen aus der Tabelle kommen statt aus der ID und aus Dateien; Policies und Zeilen bleiben unberührt.
