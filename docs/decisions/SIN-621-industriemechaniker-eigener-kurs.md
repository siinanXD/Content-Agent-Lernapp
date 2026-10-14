# SIN-621: Industriemechaniker/in als eigener Kurs, MAF Metall aus MAF-Quellen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-621
- Migration: `supabase/migrations/20261022010000_sin621_kurs_industriemechaniker.sql`
- Regel mit Test: `src/lib/generate/quellen-beruf.ts`, `quellen-beruf.test.ts`

## Entscheidung (Sinan, 14.10.2026)

Industriemechaniker/in ist ein eigener Beruf, kein Schwerpunkt von Maschinen- und Anlagenführer/in (MAF). Nichts wird gelöscht.

Umgesetzt in diesem PR:

1. Neuer Kurs „Industriemechaniker“ (`7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65`) mit Quelle KMK-RLP Industriemechaniker/in, Abrufdatum 03.10.2026.
2. Alle Einheiten aus MAF Metall (`e22073de-7020-4380-9002-c70d46c25e25`) mit Quelle `Industriemechaniker-IH04-03-25-idf-18-02-23.pdf` werden samt Fragen und Bewertungen in den neuen Kurs kopiert. Die alten Zeilen bleiben.
3. Generator-Regel: Die Quelle einer Einheit muss zum Beruf des Kurses passen. Prompts der MAF-Maps nennen keine Industriemechaniker-Quelle mehr; Einheiten mit fremder Quelle werden vor dem Speichern verworfen und im Lauf gewarnt.

## Zuordnung alt → neu

Der Schlüssel von Einheiten und Fragen ist `(course_id, id)`. Die Einheiten-, Fragen- und Bewertungs-IDs bleiben deshalb gleich, nur die Kurs-Kennung wechselt:
`(e22073de-…, <id>)` → `(7c3e9a14-…, <id>)`. Einheiten mit `shared_module_key` (gemeinsame Module) werden nicht kopiert.

## Zählung vorher/nachher

- Gelöscht wird nichts: die Migration enthält kein `delete`, `drop` oder `truncate`.
- Die Migration zählt am Ende Einheiten und Fragen alt/neu, schreibt sie als `NOTICE` ins Migrationsprotokoll und bricht bei Abweichung ab (Transaktion, nichts bleibt hängen).
- Erwartung laut Befund: 485 Einheiten im neuen Kurs, MAF Metall weiterhin 669. Die Fragezahl steht nach dem Lauf im Protokoll.

## Annahmen und offen

- Kein Datenbankzugang im Cloud-Lauf: die Zahlen oben sind der Befund aus dem Issue, nicht selbst gemessen.
- Die Industriemechaniker-Ausbildungsverordnung ist als Quelle noch nicht eingetragen. gesetze-im-internet.de war im Lauf nicht erreichbar; eine URL aus dem Gedächtnis wird nicht eingetragen. Nachtragen per weiterer Migration.
- Nicht in diesem PR (braucht Live-Schlüssel und bis 20 € je Lauf, und ein Kurskarte/Figma-Schritt):
  - Die Map `maf-metall.json` ist inhaltlich aus den Industriemechaniker-Lernfeldern 1–9 gebaut. Neu erzeugen aus MaschAnlFüAusbV und KMK-RLP MAF heißt, die Map neu aufzubauen (kmk.org war im Lauf nicht erreichbar). Die neue Regel verhindert bis dahin, dass neue MAF-Einheiten die Industriemechaniker-Quelle tragen.
  - Ausblenden der Industriemechaniker-Einheiten in MAF Metall: erst nach bestandenem Richter v2 der neuen Einheiten, braucht ein Feld (Schema-Änderung, `risk:high`), eigener PR.
  - Kursauswahl in der App und Content-Landkarte (Figma): braucht Map `industriemechaniker` und Design-Issue.

## Warum

Ein Beruf pro Kurs hält Quelle und Inhalt ehrlich zusammen. Kopieren statt Umhängen lässt die alten Zeilen als Rückfallebene, bis die Übernahme geprüft ist.
