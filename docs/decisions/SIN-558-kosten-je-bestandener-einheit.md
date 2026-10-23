# SIN-558 — Kosten je bestandener Einheit ausweisen und senken

- **Links:** Linear [SIN-558](https://linear.app/sinan-kahraman/issue/SIN-558/content-fabrik-kosten-je-bestandener-einheit-ausweisen-und-senken). Eigenbau auf vorhandener Zählung (`cost-guard.ts`, SIN-258/SIN-434), keine neue Abhängigkeit. Der volle Linear-Auftrag war in der Agent-Umgebung nicht lesbar (Befehl nicht freigegeben); umgesetzt nach den Fertig-Kriterien im Issue.
- **Entscheidung:**
  1. Der Lauf-Bericht (`RunReport.schritte`, JSON und Linear-Zusammenfassung) nennt Kosten je bestandener Einheit (`costEur / passed`) und den Prozent-Anteil je Schritt: Erzeugen, Quellen-Neuerzeugung, Schema-Reparatur, Richter, Reparatur (AP-21).
  2. Senkung: Einheiten mit weniger als `MIN_PASSED_QUESTIONS` Fragen (nach Schema-Prüfung) gehen nicht mehr an den bezahlten Richter (`judgeable`). Sie können nicht bestehen und wurden bisher erst nach dem Richter verworfen. Test: `content-grow.test.ts`.
- **Annahmen:**
  1. Schrittkosten sind die Differenz der Gesamtsumme vor und nach dem Schritt; die Summe entspricht `costEur`. „Bestanden“ ist `report.passed`.
  2. Die Einsparung hängt davon ab, wie viele Einheiten das Schema-Tor mit zu wenigen Fragen verlässt; eine Euro-Zahl ist ohne Live-Lauf nicht belegt. Der nächste Bericht zeigt den Richter-Anteil.
  3. Qualität bleibt unverändert: ausgeschlossene Einheiten wären in `keepPassing` ohnehin verworfen worden.
- **Warum:** Ohne Aufschlüsselung ist unklar, wo das Geld bleibt; der kleinste sichere Hebel ist, keinen Richter für aussichtslose Einheiten zu bezahlen.
