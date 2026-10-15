# SIN-703: Stillstand `ohne-start` nicht direkt nach der Wahl durch den Dispatcher

- Issue: https://linear.app/sinan-kahraman/issue/SIN-703
- Vorgänger: SIN-328, SIN-496, SIN-584, SIN-643
- Code: `scripts/autonomy/diagnose.mjs` (`diagnoseStall`), Test in `src/lib/autonomy/diagnose.test.ts`

## Entscheidung

Nennt der letzte dispatch-Lauf „Nächstes Issue: …“ und liegt er weniger als `STALL_MIN` zurück, meldet `diagnoseStall` keinen Stillstand: der Dispatcher hat den Worker ausgelöst, er ist nur noch nicht als laufend sichtbar. Danach gilt wieder `ohne-start`.

## Annahmen

- Actions-Logs sind im Agent-Lauf nicht lesbar. Aus dem Auszug folgt: der dispatch-Lauf von 16:32 hat SIN-702 gewählt, der Dispatcher selbst funktioniert. Der Stillstand wurde im selben Moment gemeldet (der Wächter prüft, bevor der Worker läuft). Dieser Lauf (SIN-703) ist selbst ein gestarteter Worker.
- `dispatch.mjs` und `dispatch.yml` bleiben unverändert.

## Warum

Der Wächter legte Bug-Issues an, obwohl der Dispatcher gerade startete; das bindet Worker an Fehlalarme.
