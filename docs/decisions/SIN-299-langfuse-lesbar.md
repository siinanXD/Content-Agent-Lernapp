# SIN-299: Langfuse lesbar machen

- **Links:** Linear [SIN-299](https://linear.app/sinan-kahraman/issue/SIN-299), Vorläufer [SIN-278](https://linear.app/sinan-kahraman/issue/SIN-278); Langfuse [Annotation Queues](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues), [Sessions](https://langfuse.com/docs/observability/features/sessions), [Prompt Management](https://langfuse.com/docs/prompt-management/overview), [JS/TS SDK](https://langfuse.com/docs/observability/sdk/overview)
- **Entscheidung:** Kein neues Paket. Das vorhandene `@langfuse/client` 5.11 deckt Sessions (`propagateAttributes`), Score-Configs, Annotation Queues, Prompt Management und die Dashboard-Widget-API ab.
  - Traces heißen `Kurslauf MAF Metall · <Modul> · <Schritt>`; alle Schritte eines Kurslaufs (Fragen erzeugen, prüfen, veröffentlichen, Kosten) teilen die Session `kurslauf-<runId>` (`src/lib/quality/langfuse-names.ts`).
  - Tags und Metadaten: Beruf, Schwerpunkt, Modul, Schritt, Modell, Prompt-Version, Umgebung.
  - Scores `Quellentreue`, `Eindeutigkeit`, `Niveau`, `Sprache` mit Begründung der ersten durchgefallenen Fragen aus dem Richter-Lauf. Dazu `Bestehensquote`, `Kosten je Frage (EUR)`, `costEur`, `capEur`.
  - Prüf-Warteschlange „Sicherheits-Stichprobe“: `node --import tsx scripts/safety-sample.mjs --live --review-page --langfuse` stellt die 10 %-Stichprobe als Traces ein. Sinan klickt dort `passt`, `unklar` oder `falsch` (Score `Stichprobe Sicherheit`, kategorisch). Das Urteil liegt als Score am Trace und ersetzt den Bericht aus SIN-278 (die Markdown-Prüfseite bleibt als Rückfall).
  - Prompts `richter-maf` und `erzeuger-maf` liegen versioniert in Langfuse; Traces verknüpfen die Version (`prompt` in `propagateAttributes`). Einrichtung: `npm run langfuse:setup` (Score-Configs, Queue, Prompts, Dashboard; mehrfach ausführbar).
  - Dashboard „Kurslauf: Kosten und Qualität“ mit 4 Kacheln wird über die (noch als „unstable“ markierte) Widget-API angelegt; Anleitung zum Nachbauen in `docs/ops/langfuse-dashboard.md`.
- **Annahmen:**
  - Die Sandbox hat keine Langfuse-Keys und kein Netz; Einrichtung, Warteschlange und Dashboard wurden **nicht live geprüft**. Feldnamen der Widgets (`traceName`, `tags`, `name`, `value`) folgen den SDK-Typen, nicht einem Live-Lauf. Fehler beim Dashboard warnt das Setup nur; der Rest läuft weiter.
  - Das „Pass/Fail“ je Modul ist der Anteil bestandener Fragen des Richters; das Modul steht im Trace-Namen.
  - Der 20-€-Deckel kommt als Score `capEur` aus dem Kosten-Trace (bestehendes Ledger, SIN-258); Langfuse selbst rechnet in USD, die Kacheln nutzen daher die eigenen Euro-Scores.
  - Haiku gegen Sonnet: Kachel gruppiert nach Tag `modell:<Modell>`; sie füllt sich, sobald ein Lauf mit Haiku gelaufen ist.
  - Ältere Aufrufer (`ap15-*`, `ap06-*`) behalten ihre bisherigen Trace-Namen; nur der Kurslauf (`content-grow`) und der Richter-Agent wurden umgestellt.
- **Warum:** Fertige Funktionen des vorhandenen SDK vor Eigenbau; keine neue Abhängigkeit. Deutsche Namen und eine Session je Kurslauf machen Langfuse für Sinan lesbar.
