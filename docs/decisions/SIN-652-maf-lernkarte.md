# SIN-652: Lernkarte MAF Metall aus MaschFüAusbV und RLP MAF

- Issue: https://linear.app/sinan-kahraman/issue/SIN-652
- Vorgänger: SIN-621 (`docs/decisions/SIN-621-industriemechaniker-eigener-kurs.md`), Prüfbereich SIN-628, Versionen SIN-632
- Ergebnis: `docs/content/MAF-LERNKARTE.md`, erzeugt mit `npm run content:lernkarte` (`scripts/maf-lernkarte.mjs`), Test `src/lib/autonomy/maf-lernkarte.test.ts`

## Entscheidung

Teil 1 (Ausbildungsinhalte) ist erledigt, Teil 2 (Lernfelder aus dem RLP MAF) und die Quellen der Einheiten bleiben offen.

- Die Lernkarte listet die 14 Berufsbildpositionen der MaschFüAusbV-Anlage, je Zeile Quelle `ao-anlage`, Wochen laut Anlage und die zugeordneten Module mit Soll-Einheiten. Sie wird aus der freigegebenen Map `maf-metall.json` abgeleitet, nicht neu erfunden. Jede Position hat ein Modul, keine Lücke.
- Die 9 Lernfeld-Module stehen als „offen“: Sie tragen `rlp-im` (via `rlp-maf`). Nichts davon wurde geändert oder gelöscht.

## Annahmen und Blocker

- gesetze-im-internet.de war im Lauf nicht erreichbar. kmk.org lieferte die RLP-MAF-Datei als PDF (Titel „Anlage 2“), deren Text ohne PDF-Werkzeuge im Runner nicht lesbar war. Die Aussage „RLP MAF hat keine eigenen Lernfelder“ stammt aus der Map vom 03.10.2026 und ist hier nicht neu geprüft. Lernfelder werden deshalb nicht erfunden.
- Kein Datenbankzugang im Lauf: Die Einheiten in der Datenbank (Feld `source_url` mit Industriemechaniker-RLP) wurden nicht angefasst. Das Umhängen auf MAF-Quellen und die Zuordnung der Einheiten zu Lernfeldern laufen später über Prüfbereich (SIN-628) und Versionen (SIN-632), sobald der RLP-Text gelesen ist.
- Offen für ein Folge-Issue: RLP MAF lesen (Text), Lernfeld-Liste der Fortsetzungsberufe festlegen, `maf-metall.json` neu belegen, Quelle der Einheiten per Staging umhängen.

## Warum

Ohne lesbare amtliche Quelle entsteht kein Lerninhalt (AGENTS.md). Der ableitbare Teil ist belegt und prüfbar; der Rest ist als Liste sichtbar statt geraten.
