# SIN-629: Goldset-Prüfung bei Änderungen an Generator oder Richter

- **Links:** Linear [SIN-629](https://linear.app/sinan-kahraman/issue/SIN-629), Muster [SIN-620](https://linear.app/sinan-kahraman/issue/SIN-620), [SIN-621](https://linear.app/sinan-kahraman/issue/SIN-621); Logik `src/lib/quality/regression.ts`, Lauf `scripts/goldset-regression.ts` (`npm run quality:regression`), Job `.github/workflows/goldset.yml`, Test `src/lib/quality/regression.test.ts`. Vorhandenes Goldset `docs/quality/maf-goldset-70.json` (SIN-449 `checkGoldset`).
- **Entscheidung:**
  - Der Job `goldset` misst im selben Lauf zweimal: mit dem Stand des PRs und mit den Prompt-, Richter- und Modell-Dateien von `main` (gleiches Goldset, gleicher Richter). Es gibt keine gespeicherte Basis, die veralten kann.
  - Rot (Exit 1): Erstquote Richter oder „Urteil wie erwartet“ mehr als 3 Prozentpunkte unter der Basis, oder ein fester Prüfsatz ist verletzt. Prüfsätze: Quelle passt zum Beruf (`quelleGehoertZuBeruf`), keine Prüfhinweise (`PRUEFHINWEIS_MUSTER`), Elektro-Hinweis bei elektrischen Eingriffen, und der Generator-Prompt enthält die Textregeln aus SIN-620.
  - Der Job läuft bei jedem PR aus diesem Repo und endet grün, wenn keine beobachtete Datei geändert wurde (Liste im Workflow). So kann er später Pflicht-Check werden; ein Pfadfilter ginge nicht.
  - Kosten: ein Richter-Durchgang über 70 Einträge je Seite, wenige Cent; Deckel 2 € je Lauf (`assertWithinRunCap`). Ledger-Zeile `pipeline_run_costs` mit `kind = goldset-regression`, dazu ein Langfuse-Trace mit den Quoten.
  - Ergebnis als PR-Kommentar (wird bei neuem Push aktualisiert).
- **Annahmen:**
  - „Feste Stichprobe von 30 Einheiten“: Die Einheiten liegen in Supabase, der CI-Job hat dafür keinen stabilen Stand. Stattdessen die ersten 30 Goldset-Einträge nach Kennung (die Quote über alle 70 kommt als zweite Zahl dazu).
  - Ein Eintrag sind 3,3 Prozentpunkte der Stichprobe: ein einziger gekippter Eintrag ist schon „mehr als 3“. Der Richter ist nicht ganz deterministisch; ein roter Lauf, der nur ein Eintrag ist, wird durch Neustart des Jobs geklärt.
  - Der Generator wird nicht live gegen die Quelle laufen gelassen (Kosten, Streuung). Seine Änderungen fängt der Prüfsatz auf den Prompt-Text ab; die Qualität der Richter-Quote misst nur den Richter.
  - Der Job führt Code des PRs mit Secrets aus. Das geht nur für PRs aus diesem Repo (Schreibrechte); Fork-PRs und Entwürfe werden übersprungen.
  - Die Erstquote des Richters v2 (80,2 %, Ziel 90 %) stammt aus Produktionsdaten; das Goldset enthält geprüfte Fragen, die Werte sind also nicht gleich. Verglichen wird nur Basis gegen PR.
- **Warum:** Prompt-Änderungen verschlechtern die Qualität sonst still. Basis und PR im selben Lauf messen braucht keine gepflegte Kennzahl und keine neue Abhängigkeit; das Goldset und der Richter-Code sind schon da.
