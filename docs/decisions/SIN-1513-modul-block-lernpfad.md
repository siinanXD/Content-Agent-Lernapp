# SIN-1513: Modul und Block im Lernpfad ohne Schema

- Modul und Block kommen aus der Einheiten-ID (`<Block>-u<n>`, Block `<Modul>-<n>`), wenn die Einheit kein `moduleId`/`blockId` trägt. IDs und Fortschritt bleiben unverändert.
- Titel und Reihenfolge stammen aus der Map des Kurses (`docs/content/*.json`). Mehrere MAF-Maps teilen Stichwort und Modul-IDs; deshalb wählt `pickMapTitles` die Map, deren Block-IDs die meisten Einheiten abdecken.
- Module sind im Lernpfad per `<details>` einklappbar (ohne neue Abhängigkeit); offen ist das Modul mit der nächsten Einheit.
- Annahme: Einheiten, die die Map nicht kennt, stehen am Ende (Seed-Verhalten wie bisher).
- Abstimmung mit PR #703 (SIN-1455, gleiche Ansicht): Änderung in `lernpfad-view.tsx` ist auf die Modul-Schleife begrenzt; bei Konflikt zuerst #703 mergen, dann dieser PR neu abgleichen.
