# SIN-811: Loop schneller (Einspruchsfrist 30 Min, risk:low, Dispatch nach Merge)

- Issue: https://linear.app/sinan-kahraman/issue/SIN-811
- Vorgänger: SIN-547 (Einspruchsfrist), SIN-334 (Dispatcher nach Merge)

## Entscheidung

- `risk:medium`: Einspruchsfrist 30 Min statt 2 h (`EINSPRUCH_MINUTEN`, Label `einspruch:30m`).
- `risk:low`: neues Standard-Label, keine Frist. Auto-Merge, sobald alle Checks grün sind.
- `risk:high`: unverändert, wartet auf `freigegeben`. `no-automerge` stoppt weiter jeden PR.
- `post-merge` stößt `dispatch.yml` nach jedem Merge in den Default-Branch an, auch wenn der Agent-Token gemerged hat (vorher nur bei Merge durch den Bot).

## Annahmen

- Bisher waren PRs ohne Frist-Grund `risk:medium`; das sind jetzt `risk:low`. `risk:medium` heißt nur noch „mit Frist“ (Workflow-Rechte, Gate, Framework-Wechsel).
- Der Frist-Prüflauf (`einspruch-ende`) läuft alle 10 statt 20 Min, damit die Frist nicht um bis zu 20 Min überzogen wird.
- Offene PRs mit Label `einspruch:2h` werden beim nächsten Gate-Lauf auf `einspruch:30m` umgestellt, die Frist wird dann neu gesetzt.

## Warum

Die Frist von 2 h war der größte Zeitfresser im Loop (Sinan, 17.10.2026).
