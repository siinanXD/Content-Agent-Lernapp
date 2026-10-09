# SIN-399: OpenAI als Content-Generator prüfen (Preis, Qualität, Aufwand)

- **Links:** Linear [SIN-399](https://linear.app/sinan-kahraman/issue/SIN-399); verwandt [SIN-398](SIN-398-generator-haiku-5-5.md) (Haiku-5.5-Messlauf), [SIN-406](SIN-406-fabrik-durchsatz.md). Zu lesen, aber **in diesem Lauf nicht abrufbar** (Web-Zugriff nicht freigegeben): OpenAI [Preise](https://platform.openai.com/docs/pricing), [Batch API](https://platform.openai.com/docs/guides/batch), [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs), [Modelle](https://platform.openai.com/docs/models). Anthropic [Preise](https://platform.claude.com/docs/en/about-claude/pricing).
- **Entscheidung (vorläufig): Nein, jetzt nicht umbauen. Erst Haiku 5.5 messen (SIN-398), danach OpenAI-Preise mit den Docs belegen und neu entscheiden.** Der Richter bleibt `gpt-5.4-mini` (anderer Anbieter als der Generator, kein Selbstbewertungs-Risiko).
- **Was nicht geprüft ist (Blocker):** Aktuelle OpenAI-Modellnamen, Preise, Batch-Rabatt und Structured-Outputs-Details konnten nicht aus den offiziellen Docs gelesen werden. AGENTS.md verbietet Modellnamen und Preise aus dem Gedächtnis, darum stehen sie hier **nicht**. Auch die OSS-Prüfung (Sterne, letzter Commit) fehlt. Nachholen: Folge-Issue 1 unten, ca. 1 h.
- **Kosten je Einheit, belegte Seite (Batch, Preise aus `src/lib/quality/cost-guard.ts`):** Annahme gleiche Token wie `phaseAPreflightUsd` (3.000 Eingabe, 2.500 Ausgabe je Einheit, kein Cache). Der Lauf ZP (`docs/ops/content-runs/2026-10-08T09-08-54-902Z.json`) enthält keine Token, nur 2,43 € gesamt (davon 1,62 € Reparatur) für 20 Einheiten.

| Modell | Eingabe / Ausgabe je 1 Mio. (Batch) | Cache-Lesen | Erzeugen je Einheit |
| --- | --- | --- | --- |
| Sonnet 5.5 | 1 $ / 5 $ | 0,05× | ≈ 0,0155 $ |
| Haiku 5.5 | 0,05 $ / 0,25 $ | 0,1× | ≈ 0,0008 $ |
| OpenAI (Generator-Kandidat) | **ungeprüft** | **ungeprüft** | **ungeprüft** |
| `gpt-5.4-mini` (Richter, heute im Code) | 0,75 $ / 4,50 $ (Standard, kein Batch) | – | Richter ≈ 0,011 $ je Einheit (6 Fragen) |

  Folgerung: Haiku 5.5 liegt bei der Erzeugung etwa 20× unter Sonnet. Damit OpenAI sich lohnt, müsste es unter Haiku 5.5 liegen oder deutlich besser bestehen. Das Kostenbild wird ohnehin von Reparatur (67 % der Kosten in ZP) und Richter dominiert, nicht vom reinen Erzeugen.
- **Aufwand (Schätzung aus dem Code, Annahmen unten):**

| Stelle | Änderung | Stunden |
| --- | --- | --- |
| `src/lib/generate/batch-generate.ts` (509 Z.) | Anthropic-Batch (`/v1/messages/batches`, `custom_id`, `cache_control`) ist fest verdrahtet in `submitChunkTargets`, `submitRegenBatch`, Reparatur, Abruf. Anbieter-Schnittstelle (`submit`, `poll`, `results`) und OpenAI-Variante (Batch-Datei hochladen, Ergebnisdatei lesen, Schema-Ausgabe) | 10–14 |
| `src/lib/quality/cost-guard.ts` | `CLAUDE_BATCH_PRICES` auf Anbieter erweitern; `CostLedger` kennt nur `claude*` und `openai*` (Richterpreis). Generator-Token von OpenAI dürfen nicht in `openaiInputTokens` landen, also neue Felder | 3–4 |
| `src/lib/quality/run-ledger.ts`, Tabelle `pipeline_run_costs` | Neue Spalten per Migration (nur hinzufügen), Record/Mapping | 2–3 |
| Langfuse (`langfuse-client.ts`, `grow-traces.ts`) | Modell und Kosten je Anbieter im Trace | 2 |
| `GENERATOR_MODEL`, `KNOWN_GENERATOR_MODELS`, `ap22-ab.ts` | Anbieter wählen, Vergleich um OpenAI ergänzen | 2–3 |
| Tests, README, `docs/ENV.md`, Messlauf | | 4–6 |
| **Summe** | | **23–32 h** |

  Fertige Lösung: Mehr-Anbieter-Bibliotheken (z. B. Vercel AI SDK, LiteLLM) sind mir bekannt, **Lizenz, Sterne und letzter Commit sind nicht belegt**. Sie decken meist Einzelaufrufe ab, nicht die Batch-APIs beider Anbieter (Annahme); der Hauptaufwand (Batch, Ledger) bliebe. Nachholen und prüfen.
- **Annahmen:** Aufwand grob, ohne OpenAI-Docs; OpenAI-Batch-Ergebnisse kommen asynchron als Datei (zu belegen). Der Generator-Prompt kann unverändert bleiben. Token-Mengen wie im Preflight.
- **Richter:** Bleibt `gpt-5.4-mini`. Würde OpenAI der Generator, müsste der Richter auf einen anderen Anbieter (z. B. Anthropic) wechseln, sonst Selbstbewertung. Das ist ein zweiter Umbau (`evaluate-agent.ts`), und die Goldset-Werte sind danach nur nach Neumessung vergleichbar.
- **Folge-Issues (Vorschlag, nicht angelegt):**
  1. Docs nachlesen: OpenAI-Modelle, Preise, Batch, Structured Outputs und OSS-Abstraktion mit Beleg in diese Datei (1 h, Lauf mit Web-Zugriff).
  2. Nach dem Haiku-Messlauf: nur bei OpenAI-Preis unter Haiku 5.5 oder klar höherer Bestehensquote den Umbau (23–32 h) und den Richterwechsel beauftragen; Messlauf `ap22:ab` um OpenAI erweitern.
- **Warum:** Ohne belegte OpenAI-Preise lässt sich ein Umbau von 23–32 h nicht begründen, und Haiku 5.5 senkt die Erzeugungskosten schon um etwa das 20-Fache ohne neuen Anbieter.

## Nachtrag 09.10.2026: OpenAI-Docs gelesen (Option 1 aus PR #225, Sinan)

- **Quellen (abgerufen 09.10.2026):** OpenAI [Preise](https://developers.openai.com/api/docs/pricing), [Abkündigungen](https://developers.openai.com/api/docs/deprecations). Die [Batch-Anleitung](https://developers.openai.com/api/docs/guides/batch) war in diesem Lauf nicht abrufbar; Batch-Format und Structured Outputs im Batch bleiben deshalb **ungeprüft**.

| Modell | Standard: Eingabe / Ausgabe je 1 Mio. | Batch: Eingabe / Ausgabe je 1 Mio. | Cache-Lesen (Batch) |
| --- | --- | --- | --- |
| `gpt-6-luna` (OpenAI, Ersatz für `gpt-5.4-nano` laut Abkündigungs-Seite) | 0,10 $ / 0,50 $ | 0,05 $ / 0,25 $ | 0,005 $ |
| `gpt-6.1-sol` (OpenAI) | 2,00 $ / 10,00 $ | nicht eindeutig belegt | – |
| Claude Haiku 5.5 (Vergleich, belegt in SIN-398) | – | 0,05 $ / 0,25 $ | 0,1× |
| Claude Sonnet 5.5 (Vergleich, belegt in SIN-398) | – | 1 $ / 5 $ | 0,05× |

- **Annahme Batch-Spalte:** Die Preisseite hat die Reiter „Standard, Batch, Flex, Fast, Ultrafast“. Die zweite Tabelle nennt genau die Hälfte der Standardpreise; sie ist hier dem Reiter „Batch“ zugeordnet.
- **Richter `gpt-5.4-mini`:** steht nicht mehr auf der aktuellen Preisseite. Laut Abkündigungs-Seite ist er **nicht** abgekündigt (abgekündigt ist nur `gpt-5.4-nano`, Abschaltung 01.04.2027). Der Preis im Code (0,75 $ / 4,50 $, `cost-guard.ts`) ist damit nicht mehr aus der Preisseite belegbar.
- **Entscheidung (ersetzt „vorläufig“): Kein Umbau auf OpenAI als Generator.** Der günstigste OpenAI-Kandidat kostet im Batch genauso viel wie Haiku 5.5 (0,05 $ / 0,25 $). Ein Preisvorteil, der 23–32 h Umbau und den Richterwechsel rechtfertigt, besteht nicht.
- **Neu prüfen, wenn:** der Vergleich `run-task ab-haiku-sonnet` (SIN-398) zeigt, dass Haiku 5.5 die Qualitäts-Schwelle nicht schafft. Dann `gpt-6-luna` als zweiter günstiger Kandidat in `ap22:ab` aufnehmen; der Richter müsste dafür den Anbieter wechseln.
- **Nicht geprüft, weil kein Umbau:** Mehr-Anbieter-Bibliotheken (Lizenz, Sterne, letzter Commit).
