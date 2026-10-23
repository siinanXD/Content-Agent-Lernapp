# SIN-634: Recht vor Verkauf, Vorbereitung

Datum: 2026-10-23. Quelle der Vorgaben: `docs/PRODUCT.md` (Recht), `docs/legal/checkliste-demo-zugang.md`.

## Entscheidung

Der Anwaltstermin und die AVV-Abschlüsse brauchen Sinans Konten und Zeit; ein Agent darf keine Verträge annehmen (Rechte, Zugangsdaten). Der Worker bereitet deshalb nur vor: `docs/legal/anwaltstermin-it-recht.md` (Fragen, Unterlagen, Ergebnisvorlage) und `docs/legal/avv-uebersicht.md` (Anbieter, Daten, Beleg-Spalte).

## Annahmen

- Keine Rechtsauskunft: Alle Aussagen zu KI-Gesetz und FernUSG bleiben unbestätigt bis zum Termin.
- Vertragslinks der Anbieter stehen nicht im Repo, weil sie sich ändern; Belege sind Datum und Ablageort.

## Offen (Issue bleibt In Progress)

- Anwaltstermin stattgefunden, Ergebnis in `docs/decisions/SIN-634-anwaltstermin-ergebnis.md`.
- AVV je Anbieter abgeschlossen oder begründet nicht nötig (Tabelle in `avv-uebersicht.md`, Haken in der Checkliste). Das `sinan`-Issue „AV-Verträge abschließen (7 Anbieter)“ aus `scripts/autonomy/sinan.mjs` deckt die Verträge ab.
