# SIN-389 — Hugging Face neu bewerten: Auslöser und Prüfplan

- **Links:** Linear [SIN-389](https://linear.app/sinan-kahraman/issue/SIN-389/hugging-face-neu-bewerten-sobald-genug-bewertete-fragen-vorliegen); Vorgänger `docs/decisions/SIN-379-hugging-face-pro.md`; [HF: Preise Inference Providers](https://huggingface.co/docs/inference-providers/pricing); [HF: Preise Inference Endpoints](https://huggingface.co/docs/inference-endpoints/support/pricing); [HF: AutoTrain](https://huggingface.co/docs/autotrain).
- **Entscheidung:**
  1. **Noch keine Neubewertung.** Stand laut Issue (08.10.2026): 376 bewertete Fragen in `question_evaluations`, Auslöser sind mehrere tausend. Die Entscheidung aus SIN-379 gilt unverändert: kein `HF_TOKEN`, kein neues Secret, Dubletten zuerst lokal.
  2. **Auslöser (Annahme, Sinan darf ändern):** mindestens 3.000 Zeilen in `question_evaluations` mit Richter-Urteil. Zähler: `select count(*) from question_evaluations;` (nur lesen).
  3. **Ist der Auslöser erreicht**, entsteht ein Umsetzungs-Issue, das nur diese drei Punkte prüft und das Ergebnis in `docs/decisions/SIN-<nr>-hugging-face-neubewertung-ergebnis.md` festhält:
     1. Vorfilter: Klassifikator auf den Richter-Urteilen (Train/Test getrennt, Hold-out aus dem Goldset). Lohnt nur, wenn er höchstens 1 % guter Fragen fälschlich aussortiert und die gesparten Richter-Aufrufe die Betriebskosten übersteigen (Rechnung vorher: unter 0,10 $ je Lauf, SIN-379).
     2. Lokale deutsche Embeddings für Dubletten: offene Gewichte, Lauf im eigenen Prozess, kein Pro-Abo; nur falls der lokale Textvergleich aus SIN-379 umformulierte Fragen übersieht.
     3. Datenschutz: AV-Vertrag und Region von HF klären (SIN-339), bevor Personendaten im Spiel wären. Heute gehen keine Personendaten in Prompts.
  4. Kein neuer kostenpflichtiger Dienst (Pro-Abo, Inference Endpoint, AutoTrain-Lauf) ohne Label `freigegeben`.
- **Annahmen:**
  1. Die Zahl 376 stammt aus dem Issue. In der Agent-Umgebung gibt es keinen Datenbankzugriff, sie wurde nicht neu gezählt.
  2. Die Schwelle 3.000 ist eine Schätzung für „mehrere tausend“. Sie ist ein Zeitpunkt zum Nachprüfen, keine Zusage, dass sich ein Vorfilter lohnt.
  3. Preise (Pro: 2 $/Monat Guthaben, Endpoints CPU ab 0,033 $/h, T4 0,50 $/h) stammen aus dem Issue und werden vor einer Umsetzung neu gelesen.
- **Warum:** Bei 376 Fragen reicht die Datenlage nicht für ein belastbares Training oder eine Schwelle. Ein fester Zahlenwert und ein Zähler machen die Wiedervorlage prüfbar, ohne jetzt Code oder Kosten zu erzeugen.
