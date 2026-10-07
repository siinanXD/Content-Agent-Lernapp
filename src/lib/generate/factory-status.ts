/**
 * SIN-289 — Statusdatensatz je Lauf der Content-Fabrik (`content_factory_runs`).
 * Nur Kennungen und Zahlen, keine Personendaten. Der Planer leitet daraus „läuft wöchentlich“
 * und „hängt“ ab (scripts/autonomy/fabrik.mjs).
 */
import { getServiceSupabase } from "@/lib/storage/supabase-client";
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
};

export function toFactoryRunRecord(
  report: Pick<RunReport, "runId" | "moduleId" | "generated" | "passed" | "costEur" | "stopReason">,
  courseId: string,
  queueOpen: boolean,
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
  };
}

export async function recordFactoryRun(record: FactoryRunRecord): Promise<void> {
  const { error } = await getServiceSupabase().from("content_factory_runs").insert({
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
  });
  if (error) throw new Error(`content_factory_runs_insert: ${error.message}`);
}
