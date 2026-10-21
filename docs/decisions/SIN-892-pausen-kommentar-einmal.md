# SIN-892: Pausen-Kommentar nur einmal

Links: SIN-892, SIN-795, SIN-768, SIN-861

**Entscheidung:** `withoutStalledHaken` schreibt den Pausen-Kommentar („Haken-Pause <hash>: …“) einmal je Haken-Stand. Bei Wiederholung wird der bestehende Kommentar per `commentUpdate` bearbeitet (Zähler, Zeitpunkt). `needs-human` steht nur im Text, wenn das Label gesetzt wurde.

**Annahmen:** Gesucht wird in den letzten 50 Kommentaren (`fetchComments`). Liegt der Pausen-Kommentar weiter zurück, entsteht höchstens ein neuer.

**Warum:** SIN-768 und SIN-861 bekamen alle 30 Min denselben Kommentar; das verdrängte echte Kommentare aus dem Worker-Prompt.
