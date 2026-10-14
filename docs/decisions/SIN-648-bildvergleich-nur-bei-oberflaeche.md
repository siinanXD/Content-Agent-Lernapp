# SIN-648 Bildvergleich nur bei Oberflächen-Änderung

- Issue: https://linear.app/sinan-kahraman/issue/SIN-648
- Verwandt: SIN-300 (Bildvergleich), SIN-642 (Gate-Bruch bildvergleich)

## Entscheidung

- `visual.yml` fragt zuerst `scripts/autonomy/visual-scope.mjs`: Der Vergleich läuft nur, wenn der PR `src/app`, `src/components`, Styles (`*.css`), `public/`, den Visual-Test oder dessen Abhängigkeiten (`package*.json`, `next.config.*`) ändert. Sonst überspringt der Job alle Schritte und ist grün.
- Der Referenz-Server von main wird per PID beendet statt mit `pkill -f "next start"`.

## Annahmen

- Der Lauf-Log von #360 war hier nicht lesbar (kein `gh`-Zugriff). Wahrscheinlichste Ursache: `pkill -f "next start"` passt auf die Kommandozeile der eigenen Shell des Schritts und beendet sie (Exit 143). Das erklärt rot bei PRs ohne Oberflächen-Änderung. Stimmt das nicht, greift der Pfadfilter trotzdem.
- Kein Bypass, keine Toleranz angehoben, keine Referenzbilder ins Repo.
- Labels `gate-bruch`/`repair:*` an #360, #361, #364 und das erneute Laufen der Gates kann der Agent ohne `gh` nicht ausführen: nach dem Merge dieses PRs `main` in die drei Branches mergen (löst `visual` neu aus).

## Warum

Ein PR ohne Oberflächen-Änderung kann keinen echten Bild-Unterschied erzeugen. Der Pfadfilter spart zudem zwei Builds.
