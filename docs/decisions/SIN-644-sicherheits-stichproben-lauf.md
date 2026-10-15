# SIN-644: Sicherheits-Stichproben für MAF Metall durchgeführt

- **Links:** Linear [SIN-644](https://linear.app/sinan-kahraman/issue/SIN-644), Vorläufer [SIN-675](SIN-675-sicherheits-stichproben-lauf.md), [SIN-656](SIN-656-sicherheits-stichprobe-lauf.md), [SIN-702](SIN-702-lauf-skripte-ueber-npm.md) (Lauf über `npm run`), Produktreife `docs/product-readiness.json`
- **Entscheidung:** `npm run safety-sample -- --live --json docs/quality/runs/safety-sample-2026-10-15.json` lief gegen die Live-App. Ergebnis: 15 von 393 sicherheitsrelevanten Einheiten (669 veröffentlicht), Seed 272, 0 Befunde. Eintrag `gelaufen["content-safety"]` gesetzt, Bericht `docs/quality/sicherheits-stichprobe-maf-metall.md`.
- **Annahmen:**
  - Das Skript prüft nur Quelle, Abrufdatum und Quellenliste, nicht die fachliche Richtigkeit. Der Abgleich mit der amtlichen Quelle bleibt offen bei Sinan (SIN-338); es wurde nichts freigegeben.
  - Kein Lauf-Link vorhanden (keine Lauf-ID im Agenten-Zugriff); der Beleg verweist auf Rohdaten und Bericht im Repo. Kein Secret nötig, öffentliche Route.
  - Keine Mängel gefunden, deshalb keine Folge-Issues.
- **Warum:** Die Stufe „gebaut, nicht gelaufen“ fehlte; Messwert statt Behauptung.
