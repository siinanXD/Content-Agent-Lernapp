# SIN-885: „Quelle: KMK …“ aus den Lerntexten des Industriemechaniker-Kurses entfernen

- **Links:** Linear [SIN-885](https://linear.app/sinan-kahraman/issue/SIN-885), Vorgänger [SIN-620](https://linear.app/sinan-kahraman/issue/SIN-620) (Muster `PRUEFHINWEIS_MUSTER`), [SIN-882](https://linear.app/sinan-kahraman/issue/SIN-882); Migration `supabase/migrations/20261027010000_sin885_quelle_kmk_entfernen.sql`, Prompt `src/lib/generate/didaktik-prompts.ts`.
- **Entscheidung:** Eine additive Daten-Migration entfernt den Satz `Quelle: KMK …` (bis zum ersten Satzende) aus `units.explanation`, `questions.prompt`, `questions.explanation` und `questions.choices` des Kurses `7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65`. Keine Zeile wird gelöscht. Ausführung über `run-task migrate` (legt vorher die Sicherung an, SIN-293); `content_versions` (SIN-632) hält zusätzlich die alten Texte.
- **Ursache für neue Inhalte:** `RECHNEN_ZUORDNEN_LUECKE_REGELN` verlangte „Begründung nennt die Quelle“ und die Stufenregel „Rückmeldung mit Quelle“; das widersprach dem Verbot in `TEXT_REGELN`. Beide Zeilen sagen jetzt: Quelle nur in `sourceUrl`.
- **Annahmen:**
  - Der Satz endet am ersten Punkt, auf den Leerraum oder das Textende folgt. In `choices` (jsonb) endet er vor dem schließenden Anführungszeichen.
  - Die 17 Treffer `stichprobe` und 7 `abgleich mit` sind nicht Teil der Migration: sie können echter Lerntext sein (SIN-620, QS-Einheiten). Der Agent-Lauf hat keinen Lesezugriff auf Supabase; sie werden nach dem Migrationslauf anhand des `content-publish`-Trockenlaufs einzeln geprüft (Umformulieren oder Ausnahme hier begründen).
- **Warum:** `regexp_replace` im SQL ändert genau die gemeldeten Stellen ohne Modellaufruf (keine Kosten) und ohne Löschen.
