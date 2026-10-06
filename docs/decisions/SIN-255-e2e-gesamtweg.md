# SIN-255: E2E-Gesamtweg Start bis Prüfungsmodus

- **Links:** Linear [SIN-255](https://linear.app/sinan-kahraman/issue/SIN-255), [Playwright Clock](https://playwright.dev/docs/clock), [Playwright Netzwerk-Mocks](https://playwright.dev/docs/mock)
- **Entscheidung:** Ein Test `e2e/gesamtweg.spec.ts` läuft in der CI-Stufe `build` (Playwright-Smoke, `testDir: e2e`) über Start → Lernpfad → Einheit → Ergebnis → Wiederholung → Prüfungsmodus. Die Zeit setzt `page.clock` (`install` + `fastForward`); es gibt keine echten Wartezeiten. Nach 1, 3 und 7 Tagen wird geprüft: kurz vorher ist nichts fällig, danach sind die Fragen fällig, und eine richtige Antwort hebt die Leitner-Stufe auf 2, 3 und 4. Kein neuer Screen, keine neue Komponente, kein Produktcode geändert.
- **Annahmen:**
  - „Veröffentlichter Kurs“ ist Phase A. Die Antwort von `/api/learner/phase-a` ist fest vorgegeben (wie in `einheit-phase-a.spec.ts`), damit der Test ohne Live-Keys läuft.
  - Der Leitner-Stapel liegt in `sessionStorage` (`cal-leitner-stack`); der Test liest ihn nur, um die Fälligkeit (1 Tag) und die Stufen zu belegen.
  - Intervall 14 Tage (Stufe 4) ist nicht Teil des Auftrags (1/3/7).
  - Die erste Option wird in der Einheit gewählt, richtig oder falsch ist egal: der Stapel füllt sich über falsche und Anwenden-Fragen.
  - Der Test wurde lokal nicht ausgeführt (kein Chromium in der Sandbox); die CI-Stufe `build` ist der Beleg.
- **Warum:** Die Produktreife-Zeile „E2E grün“ war nicht belegt. Ein Test mit gesetzter Browser-Zeit ist schneller und stabiler als echte Wartezeiten und braucht keine neue Abhängigkeit.
