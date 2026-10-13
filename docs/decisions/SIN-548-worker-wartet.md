# SIN-548: Worker wartet bei leerem Kontingent

- Issue: [SIN-548](https://linear.app/sinan-kahraman/issue/SIN-548/worker-wartet-bei-leerem-kontingent-statt-alle-7-minuten-rot-zu-laufen)
- Auslöser: 244 von 300 Worker-Läufen rot (11.–12.10.), derselbe Auftrag alle 6–7 Minuten (SIN-458, SIN-460); `AGENT_PAUSED_UNTIL` blieb leer.

## Entscheidung

1. Limit-Erkennung breiter (`budget.mjs`): zusätzlich `usage limit`, `overloaded`, `429`; leere Ausgabe unter 60 s mit höchstens einer Runde gilt als Sofortabbruch.
2. Sicherung unabhängig vom Log: Scheitert derselbe Auftrag 3-mal in 60 Minuten ohne PR (zwei rote Worker-Läufe in der Stunde plus der laufende), setzt der Worker `AGENT_PAUSED_UNTIL` auf jetzt + 60 Minuten. Das Issue bleibt Todo, das Ereignis `worker_pause` steht mit Grund in `loop_events` (neue Spalte `grund`).
3. Bei Pause kein `gh workflow run dispatch.yml`; `dispatch.yml` prüft die Pause als ersten Schritt (`--check-pause`).
4. Der Schnappschuss für den Leitstand trägt `queue.pause_bis` und `queue.pause_grund` (Variable `AGENT_PAUSED_REASON`), damit er „Pause bis HH:MM, Grund“ zeigt statt rot.

## Annahmen

- „Ohne PR“ wird über rote Worker-Läufe der letzten 60 Minuten mit derselben Kennung im Lauf-Titel gezählt; der Schritt läuft nur, wenn der aktuelle Lauf keinen PR hat. Ein roter Lauf aus anderem Grund zählt mit (Grenze, im Zweifel lieber pausieren).
- „Kein Tool-Aufruf“ wird als `num_turns <= 1` gelesen.
- Der Leitstand-Client (anderes Repo) liest `queue.pause_bis` und `queue.pause_grund`; die Anzeige dort ist nicht Teil dieses PRs.
- Ist das Secret `AGENT_VARIABLES_TOKEN` leer, bleibt es bei der Warnung wie bisher.

## Warum

Ohne Logfund lief die Kette endlos (5 Minuten Abstand, neuer Dispatch). Eine zweite, vom Log unabhängige Schwelle begrenzt den Schaden auf drei Läufe pro Stunde und Auftrag; keine neue Abhängigkeit.
