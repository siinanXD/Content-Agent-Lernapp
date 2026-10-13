# SIN-557: Live-Check UI-04 wartet auf Hydration

- Links: Linear SIN-557, `live/live.spec.ts`, SIN-549
- Entscheidung: UI-04 wartet auf `networkidle` und wiederholt Klicks, bis die URL wechselt (`clickUntil`). App, Budgets und andere Prüfungen bleiben unverändert.
- Annahmen: Log-Zugriff (`gh run view --log-failed`) war gesperrt, die Fehlerzeile unbekannt. Klickweg und Seitencode (SIN-549-Fix ist schon drin) stimmen überein; wahrscheinlichste Ursache ist ein Klick vor der Hydration auf der Live-Seite. Bleibt der Lauf rot, braucht es das Log.
- Warum: Ein Klick vor der Hydration bleibt wirkungslos und lässt den Check in ein Timeout laufen.
