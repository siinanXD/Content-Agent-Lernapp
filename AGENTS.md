# AGENTS.md

Regeln für alle Agenten in diesem Repo. Diese Regeln ersetzen Rückfragen an Sinan.

## Zuerst lesen

1. `docs/PRODUCT.md` (Konzept, Arbeitspakete AP-00 bis AP-12)
2. `docs/DECISIONS.md` (bisherige Entscheidungen)
3. Das zugewiesene Linear-Issue

## Grundsatz

- KI erzeugt nur Inhalte. Bewertung von Lernenden und Zulassung macht ein Mensch.
- Ohne amtliche Quelle wird kein Lerninhalt erzeugt.

## Vor jeder Entscheidung

1. Suche auf GitHub und Hugging Face nach einer fertigen Lösung.
2. Lies die offiziellen Docs (Anthropic, OpenAI, Hermes, Langfuse, Figma) zum aktuellen Stand. Nutze nie Modellnamen oder Funktionen aus dem Gedächtnis.
3. Schreibe die Entscheidung mit Links und einem Satz Begründung in `docs/DECISIONS.md`.

## So wird entschieden

- Fertige Open-Source-Lösung vor Eigenbau, wenn: Lizenz MIT oder Apache, letzter Commit jünger als 6 Monate, mehr als 500 Sterne.
- Das günstigste Modell, das die Qualitäts-Schwelle besteht.
- Bei zwei gleich guten Wegen: der mit weniger Abhängigkeiten.
- Nie zurückfragen. Bei Unsicherheit die Annahme in `docs/DECISIONS.md` notieren und weiterarbeiten.

## Technik

- App: Next.js auf Vercel
- Daten: Supabase, Region EU
- Pipeline: Worker auf Railway, Region EU
- Tracing und Bewertung: Langfuse Cloud EU
- API-Vertrag: OpenAPI-Datei im Repo, Postman-Collection daraus erzeugt
- Design: Figma ist die einzige Quelle für Farben, Abstände und Komponenten

## Qualität

- Jeder Pull Request: Tests grün, axe-core und Lighthouse ohne Fehler.
- Barrierefreiheit: WCAG 2.2 Stufe AA, Kontrast mindestens 4,5 zu 1, komplett per Tastatur bedienbar.
- Jede Lerneinheit speichert Quelle und Abrufdatum.

## Stopp-Regeln

- Höchstens 3 Reparatur-Runden pro Pull Request, dann stoppen und den Blocker im Linear-Issue melden.
- Höchstens 20 Euro API-Kosten pro Kurslauf, dann stoppen.

## Verboten

- IHK-Prüfungsaufgaben kopieren
- Personendaten in Prompts
- Inhalte unter der Qualitäts-Schwelle veröffentlichen
- Zugangsdaten ins Repo schreiben (das Repo ist öffentlich)
- Abrechnung oder Datenbank-Löschungen anfassen
- Barrierefreiheits-Tests abschalten, um einen Merge durchzubekommen
