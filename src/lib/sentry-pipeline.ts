/**
 * Sentry für die Pipeline-Skripte (SIN-289), gleiche Datenschutz-Optionen wie die App
 * (`SENTRY_PRIVACY_OPTIONS`: kein Nutzer, keine IP, kein Rechnername, `beforeSend` entfernt Request-Daten).
 * Ohne `NEXT_PUBLIC_SENTRY_DSN` ein No-op. EU-Projekt: DSN-Host ingest.de.sentry.io.
 * @see https://docs.sentry.io/platforms/javascript/guides/node/
 */
import * as Sentry from "@sentry/node";
import { SENTRY_PRIVACY_OPTIONS } from "./sentry-privacy";

export function initPipelineSentry(task: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return false;
  Sentry.init({
    dsn,
    ...SENTRY_PRIVACY_OPTIONS,
    release: env.SENTRY_RELEASE || env.GITHUB_SHA,
    tracesSampleRate: 0,
  });
  Sentry.setTag("pipeline", task);
  return true;
}

/** Meldet den Fehler und wartet, bis er gesendet ist (der Prozess endet danach). */
export async function reportPipelineError(err: unknown): Promise<void> {
  if (!Sentry.isInitialized()) return;
  Sentry.captureException(err);
  await Sentry.flush(5000);
}
