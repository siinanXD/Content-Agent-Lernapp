/**
 * SIN-299 — Langfuse einrichten und füttern: Score-Configs, Prompt Management, Prüf-Warteschlange.
 * Alles best effort und idempotent; ohne Keys passiert nichts. Nur Kennungen und fachliche Texte
 * aus veröffentlichten Einheiten, keine Personendaten.
 *
 * Docs (Stand der installierten SDK-Typen @langfuse/core 5.11):
 * - https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues
 * - https://langfuse.com/docs/prompt-management/overview
 * - https://langfuse.com/docs/observability/features/sessions
 */
import { LangfuseClient } from "@langfuse/client";
import { propagateAttributes, startActiveObservation, getActiveTraceId } from "@langfuse/tracing";
import { getLangfuseConfig } from "./langfuse-client";
import { ensureLangfuseOtel, flushLangfuseOtel } from "./langfuse-otel";
import {
  PRUEFPUNKTE,
  QUEUE_NAME,
  STICHPROBE_SCORE,
  STICHPROBE_URTEILE,
  kurslaufSessionId,
  traceMetadata,
  traceTags,
  traceTitel,
  umgebungsName,
} from "./langfuse-names";
import type { SampleQuestion } from "./review-page";

function client(): LangfuseClient | null {
  const cfg = getLangfuseConfig();
  return cfg ? new LangfuseClient(cfg) : null;
}

/** Score-Configs, die die Warteschlange und das Dashboard brauchen. */
export function scoreConfigSpecs() {
  const numeric = (name: string, description: string, minValue: number, maxValue: number) => ({
    name,
    dataType: "NUMERIC" as const,
    minValue,
    maxValue,
    description,
  });
  return [
    numeric(PRUEFPUNKTE.sourceFidelity, "Anteil der Fragen, deren Antwort aus der amtlichen Quelle folgt (0–1).", 0, 1),
    numeric(PRUEFPUNKTE.uniqueness, "Anteil der Fragen mit genau einer richtigen Antwort (0–1).", 0, 1),
    numeric(PRUEFPUNKTE.niveau, "Mittleres Niveau (1–5), Schwelle 4.", 1, 5),
    numeric(PRUEFPUNKTE.language, "Mittlere Sprachqualität (1–5), Schwelle 4.", 1, 5),
    {
      name: STICHPROBE_SCORE,
      dataType: "CATEGORICAL" as const,
      categories: STICHPROBE_URTEILE.map((u) => ({ label: u.label, value: u.value })),
      description: "Urteil des Menschen zur Sicherheits-Stichprobe: passt, unklar oder falsch.",
    },
  ];
}

/** Legt fehlende Score-Configs an; gibt die IDs aller Configs nach Name zurück. */
export async function ensureScoreConfigs(c: LangfuseClient): Promise<Record<string, string>> {
  const have = new Map<string, string>();
  for (let page = 1; page < 20; page++) {
    const res = await c.api.scoreConfigs.get({ page, limit: 100 });
    for (const cfg of res.data) have.set(cfg.name, cfg.id);
    if (res.data.length < 100) break;
  }
  for (const spec of scoreConfigSpecs()) {
    if (have.has(spec.name)) continue;
    const created = await c.api.scoreConfigs.create(spec);
    have.set(spec.name, created.id);
  }
  return Object.fromEntries(have);
}

/** Legt die Prüf-Warteschlange an (falls neu) und gibt ihre ID zurück. */
export async function ensureStichprobeQueue(c: LangfuseClient): Promise<string> {
  const ids = await ensureScoreConfigs(c);
  for (let page = 1; page < 20; page++) {
    const res = await c.api.annotationQueues.listQueues({ page, limit: 100 });
    const hit = res.data.find((q) => q.name === QUEUE_NAME);
    if (hit) return hit.id;
    if (res.data.length < 100) break;
  }
  const q = await c.api.annotationQueues.createQueue({
    name: QUEUE_NAME,
    description:
      "Fragen zu Elektrik und Maschinensicherheit (10 % Stichprobe). Je Frage: passt, unklar oder falsch. Das Urteil wird als Score am Trace gespeichert.",
    scoreConfigIds: [ids[STICHPROBE_SCORE]!],
  });
  return q.id;
}

/** Hängt die Fragen der Stichprobe als eigene Traces in die Warteschlange. Gibt die Zahl der Einträge zurück. */
export async function queueSafetySample(
  questions: SampleQuestion[],
  opts: { runId: string; seed: number },
): Promise<{ queued: number; queueId: string } | null> {
  const c = client();
  if (!c) return null;
  ensureLangfuseOtel();
  const queueId = await ensureStichprobeQueue(c);
  const kontext = { schritt: "stichprobe" as const, modul: undefined };
  let queued = 0;
  for (const q of questions) {
    let traceId: string | undefined;
    await propagateAttributes(
      {
        traceName: `${traceTitel(kontext)} · ${q.unitTitle}`.slice(0, 200),
        sessionId: kurslaufSessionId(opts.runId),
        environment: umgebungsName(),
        tags: [...traceTags(kontext), "stichprobe-sicherheit"],
        metadata: { ...traceMetadata(kontext), unitId: q.unitId, questionId: q.questionId, seed: String(opts.seed) },
      },
      async () => {
        await startActiveObservation(
          `Frage ${q.unitId}/${q.questionId}`,
          async (obs) => {
            obs.update({
              input: { frage: q.prompt, antworten: q.choices },
              output: { richtig: q.correct, erklaerung: q.explanation, quelle: q.sourceUrl, abgerufen: q.sourceFetchedAt },
            });
            traceId = getActiveTraceId() ?? obs.traceId;
          },
          { asType: "evaluator" },
        );
      },
    );
    if (!traceId) continue;
    await flushLangfuseOtel();
    // Der Trace braucht einen Moment, bis Langfuse ihn kennt; einmal kurz wiederholen.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await c.api.annotationQueues.createQueueItem(queueId, { objectId: traceId, objectType: "TRACE" });
        queued += 1;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  return { queued, queueId };
}

export const DASHBOARD_NAME = "Kurslauf: Kosten und Qualität";

/** Die 4 Kacheln des Dashboards (Widget-API, Stand SDK 5.11; Anleitung zum Nachbauen: docs/ops/langfuse-dashboard.md). */
type WidgetRequest = Parameters<LangfuseClient["api"]["unstable"]["dashboardWidgets"]["create"]>[0];

export function dashboardWidgetSpecs(): Array<WidgetRequest & { breite: number }> {
  const scoreFilter = (names: string[]): WidgetRequest["filters"] => [
    { column: "name", operator: "any of", type: "stringOptions", value: names },
  ];
  return [
    {
      name: "Kosten je Kurslauf gegen den 20-Euro-Deckel",
      description: "costEur je Lauf und capEur (Deckel) aus dem Schritt Kosten.",
      view: "scores-numeric",
      dimensions: [{ field: "name" }],
      metrics: [{ measure: "value", agg: "max" }],
      filters: scoreFilter(["costEur", "capEur"]),
      chartType: "LINE_TIME_SERIES",
      breite: 6,
    },
    {
      name: "Bestehensquote je Modul",
      description: "Anteil der Fragen, die der Richter besteht, je Modul (Trace-Name enthält das Modul).",
      view: "scores-numeric",
      dimensions: [{ field: "traceName" }],
      metrics: [{ measure: "value", agg: "avg" }],
      filters: scoreFilter(["Bestehensquote"]),
      chartType: "HORIZONTAL_BAR",
      chartConfig: { row_limit: 20, show_value_labels: true },
      breite: 6,
    },
    {
      name: "Kosten je veröffentlichter Frage (Euro)",
      description: "Kosten des Laufs geteilt durch die veröffentlichten Fragen.",
      view: "scores-numeric",
      dimensions: [],
      metrics: [{ measure: "value", agg: "avg" }],
      filters: scoreFilter(["Kosten je Frage (EUR)"]),
      chartType: "NUMBER",
      breite: 6,
    },
    {
      name: "Haiku gegen Sonnet: Kosten je Frage",
      description: "Kosten je veröffentlichter Frage, getrennt nach Modell-Tag (modell:…).",
      view: "scores-numeric",
      dimensions: [{ field: "tags" }],
      metrics: [{ measure: "value", agg: "avg" }],
      filters: scoreFilter(["Kosten je Frage (EUR)"]),
      chartType: "HORIZONTAL_BAR",
      chartConfig: { show_value_labels: true },
      breite: 6,
    },
  ];
}

/** Legt Kacheln und Dashboard an, falls sie fehlen. Unstable-API: Fehler werfen, der Aufrufer meldet sie. */
export async function ensureDashboard(c: LangfuseClient): Promise<string> {
  const api = c.api.unstable;
  const existing = await api.dashboards.list({ page: 1, limit: 100 });
  const hit = existing.data.find((d) => d.name === DASHBOARD_NAME);
  if (hit) return hit.id;
  const widgets = await api.dashboardWidgets.list({ page: 1, limit: 100 });
  const created = await api.dashboards.create({
    name: DASHBOARD_NAME,
    description: "Kosten gegen Deckel, Bestehensquote, Kosten je Frage, Haiku gegen Sonnet (SIN-299).",
  });
  for (const [i, { breite, ...spec }] of dashboardWidgetSpecs().entries()) {
    const have = widgets.data.find((w) => w.name === spec.name);
    const widget = have ?? (await api.dashboardWidgets.create(spec));
    await api.dashboards.addPlacement(created.id, {
      type: "widget",
      widgetId: widget.id,
      x: (i % 2) * 6,
      y: Math.floor(i / 2) * 6,
      width: breite,
      height: 6,
    });
  }
  return created.id;
}

/** Legt den Prompt als neue Version an, wenn sich der Text geändert hat. Gibt die Version zurück. */
export async function syncPrompt(c: LangfuseClient, name: string, text: string, tag: string): Promise<number> {
  try {
    const cur = await c.prompt.get(name, { label: "production", type: "text", cacheTtlSeconds: 0 });
    if (cur.prompt === text) return cur.version;
  } catch {
    // noch nicht vorhanden → anlegen
  }
  const created = await c.prompt.create({
    name,
    type: "text",
    prompt: text,
    labels: ["production"],
    tags: [tag],
  });
  return created.version;
}

/** Version des Produktions-Prompts in Langfuse, um Traces zu verknüpfen. Ohne Keys oder Prompt: undefined. */
export async function promptLink(name: string): Promise<{ name: string; version: number } | undefined> {
  const c = client();
  if (!c) return undefined;
  try {
    const cur = await c.prompt.get(name, { label: "production", type: "text", cacheTtlSeconds: 300 });
    return { name, version: cur.version };
  } catch {
    return undefined;
  }
}
