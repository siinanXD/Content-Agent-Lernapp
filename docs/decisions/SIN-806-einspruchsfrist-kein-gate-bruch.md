# SIN-806: Einspruchsfrist ist kein Gate-Bruch

- Links: https://linear.app/sinan-kahraman/issue/SIN-806, SIN-327 (Gate-Bruch), SIN-439 (Warten auf Freigabe), SIN-547 (Einspruchsfrist)
- Entscheidung: `WAITING_RE` in `scripts/autonomy/warten.mjs` erkennt auch „Einspruchsfrist läuft bis“. `merge-gate` ist in dieser Zeit absichtlich rot und zählt nicht als Gate-Bruch.
- Annahmen: Das Gate auf `main` ist nicht kaputt; #403 und #406 warteten nur auf die Frist (bis 2026-10-17T03:03:31Z). Das Bug-Issue ist ein Fehlalarm der Erkennung.
- Warum: Dieselbe Ursache wie SIN-439, nur mit neuer Meldung aus SIN-547. Kleinste Änderung ist ein Muster mehr.
