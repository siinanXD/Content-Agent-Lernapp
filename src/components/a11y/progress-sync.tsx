"use client";

import { useEffect } from "react";
import { flushProgress } from "@/lib/learner/progress-outbox";

/** SIN-256: sendet wartende Antworten beim Start und sobald das Netz zurück ist. */
export function ProgressSync() {
  useEffect(() => {
    const run = () => void flushProgress();
    if (navigator.onLine) run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, []);
  return null;
}
