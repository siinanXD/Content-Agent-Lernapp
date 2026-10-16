# SIN-782: Stillstand `ohne-start` zeigt auch die Pause-Zeile des Dispatchers

- Issue: https://linear.app/sinan-kahraman/issue/SIN-782
- Vorgänger: SIN-496, SIN-584, SIN-703
- Code: `scripts/autonomy/status.mjs` (`dispatchReasonLines`), Test in `src/lib/autonomy/diagnose.test.ts`

## Entscheidung

`dispatchReasonLines` übernimmt auch „Pausiert bis …“ (Schritt „Pause prüfen“ von `dispatch.yml`). Bei Pause überspringt der Lauf die Wahl und schreibt kein „Nichts zu starten“; der Wächter sah deshalb keinen Grund (Auszug nur „Kein roter Lauf“, 1975 Min Stillstand).

## Annahmen

- Actions-Logs sind im Agent-Lauf nicht lesbar. Die Pause ist die einzige Stelle in `dispatch.yml`, an der ein grüner Lauf ohne eine der bisher erkannten Zeilen endet. Ob sie hier die Ursache war, zeigt der nächste Wächter-Lauf im Auszug.
- `dispatch.yml` und `dispatch.mjs` bleiben unverändert.

## Warum

Ohne Grundzeile ließ sich der Stillstand nicht beheben; mit Zeile steht im Bug-Issue, ob `AGENT_PAUSED_UNTIL` ihn verursacht.
