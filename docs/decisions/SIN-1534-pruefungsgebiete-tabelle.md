# SIN-1534 — Zuordnung Block → Prüfungsgebiet als Tabelle im Repo

- Links: [SIN-1534](https://linear.app/sinan-kahraman/issue/SIN-1534), [SIN-1516](https://linear.app/sinan-kahraman/issue/SIN-1516), [SIN-1542](https://linear.app/sinan-kahraman/issue/SIN-1542)
- Entscheidung: Die Handzuordnung (Bericht 03.11.2026) liegt als `docs/content/zuordnung/gebiete-maf.json` und `gebiete-indkfl.json`, eine Zeile je Block, Ausnahmen je Einheit. Beim Laden aus den Tabellen setzt `loadCourse` `examAreas` je Frage. Gesucht wird nach Kurs-ID, weil Blockkennungen wie LF1-1 in mehreren Kursen vorkommen.
- Annahmen: Unsichere Zuordnungen (MAF 253, Kaufmann 166) werden benutzt und bleiben als `unsicher: true` markiert; Sinan oder ein Ausbilder prüft sie in der Fachprüfung (SIN-1542). Der Ordner `zuordnung/` liegt unterhalb von `docs/content/`, damit `loadAllCurricula` die Tabellen nicht als Map liest. Industriemechaniker bekommt keine Gebiete (Map fehlt, SIN-621).
- Warum: Ohne Gebiete greift die Prüfung auf Vorlagen zurück. Keine Spalte, keine Migration (die Spalten folgen in SIN-1549).
