# SIN-269: E2E-Gesamtweg je veröffentlichtem Kurs

- **Links:** Linear [SIN-269](https://linear.app/sinan-kahraman/issue/SIN-269), [Playwright Clock](https://playwright.dev/docs/clock), [Playwright Netzwerk-Mocks](https://playwright.dev/docs/mock), Vorgänger [SIN-255](SIN-255-e2e-gesamtweg.md)
- **Entscheidung:** `e2e/gesamtweg.spec.ts` läuft als Schleife über `PUBLISHED_COURSES`, abgeleitet aus `src/lib/learner/phase-a-index.json` (Kurs-Id, Stichwort, `unitCount > 0`). Je Kurs: Start → Lernpfad → Einheit → Ergebnis → Wiederholung nach 1/3/7 Tagen (Zeit mit `page.clock`) → Prüfungsmodus. Ein Zusatztest stellt sicher, dass mindestens ein Kurs gefunden wird, damit die Schleife nie still leer läuft. Kein neuer Screen, keine neue Komponente, kein Produktcode geändert. Dazu ein Zeilenumbruch-Fehler in der Datei behoben.
- **Annahmen:**
  - „Veröffentlichter Kurs“ ist jeder Kurs im Phase-A-Index. Heute ist das genau einer (Maschinen- und Anlagenführer, 248 Einheiten). Weitere Kurse laufen mit, sobald sie im Index stehen; die Phase-A-API liefert aber nur diesen Index, daher die Antwort je Kurs weiter fest vorgegeben (keine Live-Keys).
  - Der Test deckte beim Lesen keine fehlenden Schritte im Produkt auf; ein Folge-Issue war nicht nötig.
  - Der Test wurde lokal nicht ausgeführt (Chromium-Download in der Sandbox nicht freigegeben). Typecheck, Lint und Unit-Tests sind lokal grün; der E2E-Beleg ist die CI-Stufe `build` dieses PR.
  - Die Bestätigung `lernen-e2e` in `docs/product-readiness.json` verweist auf diesen PR; sie gilt erst mit grünem `build`.
- **Warum:** SIN-255 deckte nur einen fest eingetragenen Kurs ab. Die Ableitung aus dem Index verhindert, dass ein neuer veröffentlichter Kurs ohne E2E-Abdeckung bleibt.
