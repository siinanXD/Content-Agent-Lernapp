# SIN-383: Langfuse lesbar machen, ein Trace je Einheit mit jeder Frage

## Links
- [SIN-383 Linear Issue](https://linear.app/sinan-kahraman/issue/SIN-383/langfuse-lesbar-machen-ein-trace-je-lauf-darin-jede-frage-mit)
- Löst die Teilentscheidung „keine Prompts“ aus [SIN-380](SIN-380-langfuse-traces-je-schritt.md) ab
- [Langfuse JS/TS SDK v5](https://langfuse.com/docs/observability/sdk/overview), Observation-Typen `generation`, `evaluator`, `event`; Scores an Observations (`client.score.observation`)

## Entscheidung

- Session = Kurslauf (`kurslauf-<runId>`), **ein Trace je Einheit**, Titel `M3 · 02 Spannmittel` (`unit-traces.ts`, `einheitTitel`).
- Darin direkt unter dem Trace:
  - Generation „Erzeugen“: Modell, Tokens, Kosten (EUR), Prompt-Link. Input = Prompt-Auszug (Thema, Modul, Quelle mit Abrufdatum, Lernziel), Output = erzeugte Fragen als Text mit richtiger Antwort.
  - Je Frage ein Evaluator „Prüfen · Frage n“: Fragetext (Input), richtige Antwort und Richter-Begründung (Output), Scores `Quellentreue`, `Eindeutigkeit`, `Niveau`, `Sprache`, `Sicherheit`, `bestanden` (BOOLEAN, Kommentar = Begründung).
  - Event „Ergebnis“: veröffentlicht oder verworfen mit Grund (gleiche Regel wie `keepPassing`: mindestens `MIN_PASSED_QUESTIONS` bestanden).
- Tags: Beruf, Schwerpunkt, Modul, Lauf-Art (`lauf:Grundbestand | Reparatur | neues Modul`), Modell, Umgebung. Der Kurslauf setzt `Reparatur` (Quellen-Refresh) und `neues Modul` (Wachstum); `Grundbestand` ist für die AP-15-Skripte vorgesehen und dort noch nicht angeschlossen.
- Die Batch-Traces „Fragen erzeugen“ und „Fragen prüfen“ aus SIN-380 entfallen. „Veröffentlichen“ und „Kosten“ bleiben als Lauf-Traces in der Session.
- `question_evaluations.langfuse_trace_id` zeigt jetzt auf den Einheiten-Trace der jeweiligen Frage.
- Dashboard (5 Kacheln): Kosten je Lauf gegen Deckel, Bestehensquote je Lauf (Mittel von `bestanden` je Session), schwächster Prüfpunkt (Mittel je Prüfpunkt), Kosten je Frage, Haiku gegen Sonnet. Der Score `Bestehensquote` entfällt.

## Annahmen

- Lerninhalte (Fragen, Antworten, Quellen-URL, Begründungen) sind keine Personendaten und dürfen in den Trace. Personendaten bleiben verboten; es gibt hier keine. Das Verbot vollständiger Prompts bleibt: nur der Auszug steht im Trace, nicht der System-Prompt.
- Der Batch liefert nur Summen. Tokens und Kosten werden gleichmäßig auf die gelieferten Einheiten des Batches verteilt (Schätzung, Summe stimmt mit dem Batch überein).
- Ein eigenes „Lernziel“ gibt es im Datenmodell nicht; als Lernziel dient der Merksatz der Einheit.
- Die Dashboard-Dimension `sessionId` der Widget-API konnte ohne Netz nicht gegen die Docs geprüft werden. Lehnt Langfuse sie ab, meldet `npm run langfuse:setup` „Dashboard nicht angelegt“, und die Kachel wird nach `docs/ops/langfuse-dashboard.md` von Hand gebaut.
- Der Trace entsteht nach dem Richter-Lauf, nicht schon beim Abschicken des Batches. Während der Wartezeit auf den Batch ist in Langfuse nichts zu sehen; Kosten werden weiter auch bei Abbruch geschrieben.

## Warum

Sinan erwartet, jeden Durchlauf und jede Frage mit Bewertung zu sehen. Zahlen und Kennungen allein beantworten das nicht. Der Inhalt ist öffentlich-rechtlich begründet (amtliche Quelle) und enthält keine Personendaten; ein Trace je Einheit ist die kleinste Form, in der eine Frage anklickbar ist, ohne neue Abhängigkeit.
