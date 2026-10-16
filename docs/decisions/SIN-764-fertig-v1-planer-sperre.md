# SIN-764 — Fertig-Liste Lern-App v1 anlegen, Planer sperrt Ideen, solange v1 offen ist

- **Links:** Linear [SIN-764](https://linear.app/sinan-kahraman/issue/SIN-764/docsfertigmd-v1-der-lern-app-anlegen-und-planer-sperren-solange-v1); Teil von [SIN-761](https://linear.app/sinan-kahraman/issue/SIN-761/fertigmd-v1-fur-lern-app-und-leitstand-anlegen-der-ceo-baut-nur-noch); Vorgänger [SIN-528](SIN-528-fertig-liste-steuert-loop.md) (Meilensteine v1/v2, Ideen-Drossel).
- **Entscheidung:**
  1. `docs/FERTIG.md` mit dem Wortlaut von Sinan (16.10.2026). Format: Checkboxen `- [ ]` / `- [x]`, nicht nummerierte Zeilen wie im Leitstand-Parser aus SIN-528. Dafür gibt es `parseFertig` in `scripts/autonomy/fertig.mjs`.
  2. **Sperre:** Solange ein Punkt offen ist, verwirft `validatePlan` alle Ideen (`idee: true`) und lässt nur Einträge der Spur `backend` durch, die alle als Bug (Label `bug`) geplant werden. Der Prompt sagt dasselbe. Der bestehende Nur-Bugs-Pfad (`bugsOnly`, SIN-225) wird dafür wiederverwendet.
  3. **Issues je offenem Punkt:** Titel = Punkt-Text, Priorität 2 (High), Label `claude`, Status Todo, Meilenstein „v1 Grundgerüst“ (über `createIssues` → `classifyNew`). Beschreibung mit `## Fertig-Kriterien` und dem Hinweis „Done heißt live“ (SIN-616). Je Punkt legt der Planer genau ein Issue an; Dubletten gegen offene und in den letzten 14 Tagen erledigte Titel (ohne Groß-/Kleinschreibung) werden übersprungen.
  4. Erledigte Punkte (`- [x]`) bekommen kein Issue.
- **Annahmen:**
  1. **Titel als Dublettenschlüssel:** Ändert Sinan den Wortlaut eines Punktes (z. B. die Zahlen in der Klammer), entsteht ein neues Issue. Das ist gewollt, weil der Wortlaut nach Vorgabe fest ist; bei Änderung zuerst das alte Issue schließen.
  2. **Fertig-Kriterien** stehen im Code (`KRITERIEN` in `fertig.mjs`), nicht in `FERTIG.md`, damit der Wortlaut unverändert bleibt. Punkte ohne Eintrag bekommen zwei allgemeine Kriterien.
  3. **Keine Meta-Issues:** Der Planer legt heute keine Kosten- oder Stillstands-Issues an (die kommen aus Wächtern). Die Regel „höchstens 1 pro Tag“ ist deshalb im Planer nicht nötig und nicht umgesetzt.
  4. **Bugs mit Nutzerwirkung** bleiben erlaubt; der Planer erkennt Nutzerwirkung nicht selbst, sondern über die Prompt-Vorgabe „nur Bugs“. Diese Grenze ist weich.
  5. **Fehlt `docs/FERTIG.md`,** gibt es keine Sperre (Verhalten wie bisher).
  6. **Leitstand-Anzeige „1 von 7“** liegt im Leitstand-Repo und ist hier nicht umgesetzt. Hier zählt `fetchProgress` weiter Linear-Issues, nicht die Liste.
  7. **Auftrag nach Teil-Issue:** Die Issues sind nach Linear-Anlage mit `claude` im Todo; Dispatcher (`startOrder`) nimmt sie nach Priorität vor den Ideen.
- **Warum:** Der Lern-App-Loop soll an den sechs offenen Punkten der Fertig-Liste arbeiten, statt weiter Ideen anzuhäufen. Die Liste ist die Quelle; Ideen warten im Backlog und bleiben unangetastet.
