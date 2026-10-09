/**
 * SIN-289 — Statusdatensatz je Lauf der Content-Fabrik (`content_factory_runs`).
 * Nur Kennungen und Zahlen, keine Personendaten. Der Planer leitet daraus „läuft wöchentlich“
 * und „hängt“ ab (scripts/autonomy/fabrik.mjs).
 */
import { getServiceSupabase } from "@/lib/storage/supabase-client";
import { PAUSE_PREFIX } from "@/lib/anthropic/limit-error";
import type { RunReport } from "./content-grow";

export type FactoryRunRecord = {
  runId: string;
  courseId: string;
  moduleId: string | null;
  /** Der Lauf hat Einheiten eines noch nicht veröffentlichten Moduls veröffentlicht. */
  newModule: boolean;
  /** Vor dem Lauf gab es noch offene Arbeit; leere Queue ist kein „hängt“. */
  queueOpen: boolean;
  unitsGenerated: number;
  unitsPublished: number;
  costEur: number;
  stopped: boolean;
  stopReason: string | null;
  /** SIN-378: Start und Ende des Laufs (ISO). */
  startedAt: string;
  finishedAt: string;
};

export function toFactoryRunRecord(
  report: Pick<RunReport, "runId" | "moduleId" | "generated" | "passed" | "costEur" | "stopReason" | "startedAt">,
  courseId: string,
  queueOpen: boolean,
  finishedAt: string = new Date().toISOString(),
): FactoryRunRecord {
  return {
    runId: report.runId,
    courseId,
    moduleId: report.moduleId,
    newModule: Boolean(report.moduleId) && report.passed > 0,
    queueOpen,
    unitsGenerated: report.generated,
    unitsPublished: report.passed,
    costEur: report.costEur,
    stopped: report.stopReason !== null,
    stopReason: report.stopReason,
    startedAt: report.startedAt,
    finishedAt,
  };
}

/** SIN-378: Lauf, der vor dem Ergebnis endet (fehlende Secrets, Absturz). Der Grund steht im Protokoll. */
export function toAbortedRunRecord(
  runId: string,
  courseId: string,
  startedAt: string,
  reason: string,
  finishedAt: string = new Date().toISOString(),
): FactoryRunRecord {
  return {
    runId,
    courseId,
    moduleId: null,
    newModule: false,
    queueOpen: true,
    unitsGenerated: 0,
    unitsPublished: 0,
    costEur: 0,
    stopped: true,
    // SIN-450: Der Pausegrund bleibt ohne „Abbruch:“-Präfix, daran erkennt der Planer „pausiert“.
    stopReason: reason.startsWith(PAUSE_PREFIX)
      ? reason.slice(0, 300)
      : `Abbruch: ${reason.replace(/\s+/g, " ").trim().slice(0, 300)}`,
    startedAt,
    finishedAt,
  };
}

export async function recordFactoryRun(
  record: FactoryRunRecord,
  client: Pick<ReturnType<typeof getServiceSupabase>, "from"> = getServiceSupabase(),
): Promise<void> {
  const { error } = await client.from("content_factory_runs").insert({
    run_id: record.runId,
    course_id: record.courseId,
    module_id: record.moduleId,
    new_module: record.newModule,
    queue_open: record.queueOpen,
    units_generated: record.unitsGenerated,
    units_published: record.unitsPublished,
    cost_eur: record.costEur,
    stopped: record.stopped,
    stop_reason: record.stopReason,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
  });
  if (error) throw new Error(`content_factory_runs_insert: ${error.message}`);
}
