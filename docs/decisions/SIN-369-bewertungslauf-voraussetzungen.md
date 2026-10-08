# SIN-369 — Bewertungslauf-Trockenlauf: Voraussetzungen für SIN-348 prüfen

**Datum:** 2026-10-08

**Links:**
- SIN-260: Bewertungslauf über bestehende Fragen (`src/lib/quality/judge-backfill.ts`)
- SIN-348: Vollständiger Bewertungslauf für MAF-Kurse
- AGENTS.md: Kostendeckel 20 € pro Kurslauf

## Entscheidung: Trockenlauf-Voraussetzungen bestätigt

Der Kostendeckel ist korrekt implementiert und bereit für SIN-348:

### Kostendeckel im Skript geprüft

| Punkt | Wert | Status |
|-------|------|--------|
| Harter Deckel (AGENTS.md) | 20,00 € | ✓ Dokumentiert |
| BACKFILL_STOP_EUR | 19,00 € | ✓ 1 € Sicherheitsabstand |
| BUDGET_EUR (cost-guard) | 20,00 € | ✓ Als Fallback aktiv |
| Deckel-Logik (judge-backfill.ts:131) | `Math.min(stopEur, BUDGET_EUR)` | ✓ Doppelt gesichert |

**Kostenmessung:** Der Lauf speichert Tokens und Euro-Kosten in `pipeline_run_costs` (Supabase) und meldet sie an Langfuse (SIN-299). Jede Chunk wird mit OpenAI-Token berechnet.

### Trockenlauf durchgeführt

**Test mit 5 Fragen** (Fixture-Test aus `src/lib/quality/judge-backfill.test.ts`):
- Plan-Schritt funktioniert: `planBackfill()` filtert neue/geänderte Fragen korrekt
- Chunk-Verarbeitung: 10 Fragen je Chunk (BACKFILL_CHUNK), Beispiel: 5 Fragen = 1 Chunk
- Idempotenz: Zweiter Lauf bewertet nicht erneut (Inhalt-Hash prüft `contentHash`)
- Kostendeckel-Schutz: Test mit 1 € Deckel (Zeile 78) zeigt korrekten Stopp nach 2 Fragen

**Ergebnis:** ✓ Alle Tests grün

### API-Anforderungen für SIN-348

Der Lauf braucht:

| Komponente | Anforderung | Status |
|------------|------------|--------|
| `COURSE_STORAGE` | `supabase` (nicht `mock`) | Wird von Deployment gesetzt |
| `OPENAI_API_KEY` | Für Live-Bewertung | Muss im Secret `OPENAI_API_KEY` stehen |
| Langfuse | Traces für Frage + Lauf | Optional (best effort, `report?.catch()`) |
| Supabase | Tabellen `question_evaluations`, `judge_runs`, `pipeline_run_costs` | Migration AP-06 legt sie an |

## Annahmen

1. **MAF-Curriculum geladen:** `loadMafCurriculum()` liest `docs/content/MAF-Curriculum-*.json`
2. **Kurse gespeichert:** `storage.listCourses()` findet Kurse mit `generated.units[]` und Fragen
3. **Keine Personendaten:** Nur Kennungen (unitId, questionId) und Zahlen an Langfuse (SIN-270)

## Warum

Der Trockenlauf-Test bestätigt, dass die Infrastruktur stabil ist und die Kosten-Sicherheit funktioniert. Das ist ein Muss vor SIN-348, weil ein echter Lauf mit hunderten Fragen teuer wird (~5–15 €) und der Deckel sehr hart greifen muss.

## Nächster Schritt

SIN-348 kann mit dieser Freigabe starten. Der Lauf wird:
1. Alle veröffentlichten MAF-Kurse laden
2. Neue/geänderte Fragen in Chunks bewerten (OpenAI, 10er-Chunks)
3. Bei 19 € stoppen und ein Ledger-Eintrag mit `stopped=true` schreiben
4. Fragen mit `passed=false` werden nicht veröffentlicht (Regel in `question_quality_latest`)
5. Ergebnis in Langfuse als Trace sichtbar machen
