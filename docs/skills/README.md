# Skills im Repo (SIN-296)

Anleitungen für Arbeitsabläufe, die sich wiederholen. Eine pro Ordner: `docs/skills/<name>/SKILL.md`.

## Wann ein Skill entsteht

- Ein Ablauf kam in diesem Lauf zum zweiten Mal vor oder ist in der Lehren-Datei (`docs/autonomy/LEHREN.md`) mehrfach Ursache von Fehlern (z. B. „neue Lernfeld-Seite“, „Migration mit RLS“).
- Er hat feste Schritte, die nicht aus dem Code allein ersichtlich sind.
- Gibt es schon einen Skill dazu, wird er ergänzt, kein zweiter angelegt.

## Aufbau

```markdown
---
name: <kurzer-name-in-kebab-case>
description: <ein Satz: wann nutzen>
---

# Titel (Kennung des Issues, aus dem er entstand)

1. Schritte, jeweils mit Befehl oder Dateipfad.
2. Prüfungen am Ende.
```

Kurz halten (höchstens etwa 60 Zeilen), deutsch, keine Zugangsdaten, keine erfundenen Zahlen.

## Nutzen

- Vor Arbeit an einem Issue `docs/skills/` ansehen; passt ein Skill, lesen und befolgen.
- Neue oder geänderte Skills im PR unter `## Neue Skills` nennen (Name und ein Satz). Der Steckbrief zeigt die Zeile.

## Vorhanden

- `web-design-guidelines`: Checkliste für Frontend-Änderungen.
