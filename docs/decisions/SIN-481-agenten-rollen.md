# SIN-481 — Agenten-Rollen: Register und Feld `agent` in `loop_events`

**Links:** SIN-303 (Leitstand), SIN-202 (Projekt-Starter), SIN-488 (Vor-Recherche), `docs/autonomy/agents.json`, `scripts/autonomy/agents.mjs`, `supabase/migrations/20261017010000_sin481_loop_events_agent.sql`

## Entscheidung

1. **Rollen statt zusätzlicher KI-Ebene.** Ein Agent ist eine Rolle, unter der bestehende Workflows gebündelt werden. Eine Orchestrator-KI über den Workflows würde Kosten, einen weiteren Fehlerpunkt und Abhängigkeiten bringen, ohne dass sich Verhalten ändert. Planer und Dispatcher bleiben Code ohne Sprachmodell.
2. **Einzige Quelle:** `docs/autonomy/agents.json` mit 9 Rollen (research, planer, design, coding, pruefen, betrieb, content, video, marketing). Workflow = Dateiname ohne `.yml`.
3. **Feld `agent`:** additive Spalte `agent text` in `loop_events`. `buildEvent` leitet sie über das Register aus dem Schritt ab (Schrittnamen sind Workflow-Namen). Kein Eingriff in einzelne Workflows.
4. **Test:** Jeder Workflow in `.github/workflows/` gehört genau einem Agenten, sonst schlägt CI fehl.

## Annahmen

- `design`, `video`, `marketing` haben noch keine Workflows (`workflows: []`); `geplant` nennt, was kommt (die Vor-Recherche SIN-488 ist noch keine Datei).
- Budgets: nur genannt, was schon festgelegt ist (20 Euro je Kurslauf, Runden je Größe, 5 Issues pro Woche). Alles andere `null`, nichts erfunden.
- Modelle: nach `docs/autonomy/groessen.md`; Rollen ohne Modell sind Code oder noch offen.
- Bis `migrate` die Spalte angewendet hat, schlägt das Schreiben nur mit einer Warnung fehl (kein Lauf kippt).
- Neue Workflows müssen im selben PR ins Register, sonst schlägt der Test fehl.

## Warum

Der Leitstand soll die Pipeline als Agenten zeigen; das Register ist für den Projekt-Starter (SIN-202) kopierbar.
