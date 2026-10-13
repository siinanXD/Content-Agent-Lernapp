# SIN-586: Quellenauszug zeigt den Grund, wenn er fehlt

- Issue: https://linear.app/sinan-kahraman/issue/SIN-586
- Vorgänger: `docs/decisions/SIN-456-richter-quellenauszug.md`

## Entscheidung

Der Loader in `src/lib/quality/source-excerpt.ts` ruft wie `scripts/content-check-sources.mjs` ab (User-Agent `content-agent-lernapp source-monitor`, 25 s, `redirect: follow`, ein Wiederholversuch bei Netzfehler, 5xx, 429). Er liefert `{ text }` oder `{ text: null, reason }`, loggt jeden Grund einmal je URL, und der Goldset-Bericht zählt die Gründe. PDF-Quellen bleiben bewusst ohne Auszug.

## Annahmen

- Die Ursache des Ausfalls (vermutlich fehlender User-Agent oder Sperre für Rechenzentrums-IPs) ist ohne Live-Lauf nicht belegt. Dieser PR startet `goldset-indkfl` nicht selbst (braucht Keys).
- Nächster Schritt nach dem Merge: `goldset-indkfl` über `run-task.yml` starten. Zeigt der Bericht weiter `HTTP 403` für gesetze-im-internet.de, werden die Auszüge aus dem Quellen-Monitor gespeichert statt live geladen (dann diese Datei ergänzen).

## Warum

Ein stilles `catch → null` machte die Fehlersuche unmöglich. Sichtbare Gründe kosten nichts und zeigen im nächsten Lauf die Ursache.
