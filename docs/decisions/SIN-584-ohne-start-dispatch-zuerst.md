# SIN-584: Stillstand `ohne-start` nennt den dispatch-Grund

- Issue: https://linear.app/sinan-kahraman/issue/SIN-584/stillstand-laufe-ohne-fehler-aber-kein-worker-gestartet
- Code: `scripts/autonomy/diagnose.mjs` (`diagnoseStall`), Test in `src/lib/autonomy/diagnose.test.ts`

## Entscheidung

`diagnoseStall` wertet bei mehreren „Kein roter Lauf“-Zeilen zuerst den dispatch-Log aus. Der Auszug im Bug-Issue zeigt so „Nichts zu starten: …“ statt der Zeile eines neueren planner-Laufs.

## Annahmen

- Der dispatch-Lauf selbst war im Worker nicht lesbar (kein Zugriff auf Actions-Logs). Warum der Dispatcher nichts startete, steht erst im nächsten Bug-Issue mit dem dispatch-Auszug.

## Warum

Der planner-Lauf war nur der neueste grüne Lauf; er sagt nichts darüber, warum der Dispatcher nichts startete.
