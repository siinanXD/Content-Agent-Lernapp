# SIN-515: Kennzahl `content_fabrik_ueberfaellig_tage` immer als Zahl

- Links: https://linear.app/sinan-kahraman/issue/SIN-515, `scripts/autonomy/fabrik.mjs`, `docs/decisions/SIN-378-fabrik-lauf-nachweis.md`
- Entscheidung: Die Kennzahl wird bei jedem gelesenen Statusprotokoll gesetzt: 0 bei „läuft“, „hängt“ und „pausiert“, sonst die Tage über der Frist. Ohne Lauf oder ohne Zugang bleibt „nicht verfügbar“.
- Annahme: „hängt“ ist keine Überfälligkeit (die Frist gilt noch), daher 0. Schwellen und Gate bleiben unverändert.
- Warum: Bisher setzte nur die überfällige Fabrik die Zahl, sonst blieb der Platzhalter stehen; der Wächter hatte keine echte Grundlage.
