# SIN-431: Content-Fabrik erzeugt Industriekaufleute

- Issue: https://linear.app/sinan-kahraman/issue/SIN-431/content-fabrik-industriekaufleute-erzeugen-map-indkfl-freischalten
- Map: `docs/content/indkfl.json` (IndKflAusbV 2024, 13 Lernfelder), Quellen dort unter `sources`.
- Code: `SUPPORTED_MAP_IDS`, `MAP_COURSES`, `chooseRunMap` in `src/lib/generate/content-grow.ts`; Lauf in `scripts/content-grow.ts`.

## Entscheidung

1. `indkfl` steht in `SUPPORTED_MAP_IDS`. Vorerst erzeugt die Fabrik nur zwei Berufe: MAF Metall und Industriekaufleute (Sinan, 09.10.). Die übrigen MAF-Schwerpunkte und die Weiterbildung bleiben aus.
2. Ein Kurs je Map (`MAP_COURSES`). Die Migration `20261012010000_sin431_kurs_indkfl.sql` legt den Kurs „Industriekaufmann“ mit fester Kennung und die 8 amtlichen Quellen (IndKflAusbV, Anlage/Ausbildungsrahmenplan, §§ 4, 8, 11, 12, 14, KMK-Rahmenlehrplan) in `sources` an, mit dem Abrufdatum aus der Map (03.10.2026).
3. **Reihenfolge: abwechselnd je Lauf.** Ein Lauf bedient genau eine Map. Er nimmt die Map, die nach der Map des letzten Live-Laufs kommt (Rotation in Queue-Reihenfolge), und überspringt Maps ohne offene Einheiten. Ein vom Deckel unterbrochenes Modul (`resumeModuleId`) läuft zuerst weiter. Der Lauf nach dem letzten Metall-Lauf (08.10.) ist damit Industriekaufleute.
4. Deckel (20 € je Lauf, Stopp bei 19 €), Schwellen und Richter (anderer Anbieter als Generator) bleiben unverändert. Ein Lauf bleibt bei einer Map, damit der Deckel nicht steigt.

## Annahmen

- Alternative „erst alle 890 Metall-Einheiten, dann indkfl“ verworfen: Industriekaufleute käme dann erst nach Monaten.
- Alternative „beide Maps im selben Lauf“ verworfen: ein Kurs je Lauf hält Veröffentlichung, Traces und Kostenbericht eindeutig.
- Fehlt der indkfl-Kurs (Migration noch nicht angewendet), läuft die Fabrik mit Metall weiter und warnt. Fehlt der Metall-Kurs, bricht sie wie bisher ab.
- Einheiten-IDs (`M0-1-u1`, `LF1-1-u1`) kommen in beiden Maps vor. In Supabase sind Einheiten und Fragen je Kurs eindeutig (`course_id, id`), die Liste verworfener Einheiten aus den Berichten wird je Map geführt. Auswertungen, die nur nach `question_id` zählen (Kennzahlen), vermischen beide Kurse, bis sie nach `course_id` trennen. Eigenes Issue, wenn es auffällt.
- Die Reparatur (AP-21, `ap15-regen-dropped.ts`) und die Phase-A-Skripte bleiben auf MAF Metall; verworfene indkfl-Einheiten holt der Lauf nicht nach, sie zählen als erledigt wie bei Metall.
- Der Kurs-Kopf der Einheiten (`generated.id/title`) lautet für indkfl `indkfl-fabrik`. Die Lern-App liest vorerst nur den Metall-Kurs; die Anzeige für Industriekaufleute ist ein eigenes Paket.
- Der Bericht des ersten Laufs (`docs/ops/content-runs/`) entsteht erst im nächsten Montagslauf mit Live-Keys; hier ist er nicht vorhanden.
