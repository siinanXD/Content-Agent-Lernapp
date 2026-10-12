# SIN-468: Migrations-Wächter legt keine Dubletten an

- Links: https://linear.app/sinan-kahraman/issue/SIN-468, Vorgänger SIN-441 bis SIN-467
- Entscheidung: `migrationBugPlan` (`scripts/autonomy/migrationen.mjs`) vergleicht die Bug-Beschreibung (Zeile „Fehlend: …“) mit offenen Linear-Issues. Gleiche Liste: kein neues Issue, sondern ein Kommentar mit Datum. Andere Liste: neues Issue.
- Annahmen: Der Kommentar kommt höchstens einmal je Tag (Merker `migrationKommentar` im Status-Text), damit der stündliche Wächter nicht spammt. „Gleiche Menge“ heißt gleiche Dateiliste, nicht nur gleiche Anzahl.
- Warum: Eigenbau ohne neue Abhängigkeit, kleinste Änderung am bestehenden Wächter.
