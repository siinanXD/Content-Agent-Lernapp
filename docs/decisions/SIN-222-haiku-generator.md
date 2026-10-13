# SIN-222: Generator-Modell Haiku 5.5

**Entscheidung (Sinan, 13.10.2026: „Haiku ja“):** `DEFAULT_GENERATOR_MODEL = claude-haiku-5-5` für die Erzeugung der Lerneinheiten (`src/lib/anthropic/client.ts`). Recherche- und Plan-Agent bleiben bei Sonnet (nicht Teil des Vergleichs).

**Beleg:** A/B-Lauf 13.10. (https://github.com/siinanXD/Content-Agent-Lernapp/actions/runs/38325598681, PR #330), 20 LF3-Einheiten je Modell, Richter gpt-5.4-mini:

| | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|
| veröffentlichbar nach Reparatur | 8/20 | 10/20 |
| Fragen bestanden | 80,6 % | 90,7 % |
| $ je veröffentlichbarer Einheit | 0,018 | 0,117 |

**Warum:** 6,5× günstiger je veröffentlichbarer Einheit; veröffentlicht wird nur, was der Richter besteht. Mehr Ausschuss ist billig.

**Annahmen/Risiken:** kleine Stichprobe; `sourceFidelity`/`uniqueness` im Bericht = 0 (Messlücke, SIN-532); Haiku hatte `safetyFlag` → Sicherheits-Stichprobe bleibt. Zurück zu Sonnet per Env `GENERATOR_MODEL=claude-sonnet-5-5` ohne Code-Änderung.
