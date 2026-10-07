# SIN-360: Linear Basic, keine Issue-Grenze

- Links: [SIN-360](https://linear.app/sinan-kahraman/issue/SIN-360), [SIN-225](https://linear.app/sinan-kahraman/issue/SIN-225), [SIN-291](https://linear.app/sinan-kahraman/issue/SIN-291), https://linear.app/pricing
- Entscheidung: `linear_issues.limit` in `docs/autonomy/free-tier-limits.json` ist `null` (= unbegrenzt). `linearQuota(count, null)` liefert Level `unlimited` ohne Prozent: weder Hinweis (85 %), Planer-Stopp (95 %) noch `bugsOnly` (80 %). Wächter und Planer lesen das Limit aus der Datei. Die Kontingent-Zeile heißt „Linear: Issues“ und zeigt „213 Issues (unbegrenzt)“.
- Belegt: nichts aus einer amtlichen Quelle. `linear.app/pricing` wurde nicht abgerufen.
- Angenommen (nur Angabe aus dem Issue SIN-360, nicht geprüft): Der Tarif Basic ist seit 2026-10-07 aktiv und hat keine Issue-Grenze. Stimmt das nicht, `limit` in `docs/autonomy/free-tier-limits.json` wieder auf 250 setzen. Die 250er-Logik bleibt dafür im Code.
- Hinweis: Das ist eine Betriebsannahme, kein Lerninhalt.
- Warum: Die alte Grenze (213/250 = 85 %) hielt den Planer in „nur Bugs“, obwohl Linear keine Grenze mehr hat.
