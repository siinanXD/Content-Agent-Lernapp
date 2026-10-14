/**
 * Sicherungs-Status (SIN-293): letzte nächtliche Sicherung für Status-Seite und Tages-Update.
 * Quelle sind die Läufe von `backup.yml`; die Fragenzahl steht als Annotation „Sicherung <ISO>: n Fragen, m Einheiten“
 * im Job (scripts/backup.ts). So braucht der Status-Lauf keinen Supabase-Schlüssel.
 * `analyzeBackup` ist rein; nur `collectBackup` spricht mit GitHub.
 */

/** Nach so vielen Stunden ohne erfolgreiche Sicherung gilt sie als überfällig (Takt: täglich). */
export const BACKUP_STALE_H = 36;
const NOTE_RE = /Sicherung (\S+): (\d+) Fragen, (\d+) Einheiten/;

const hhmm = (iso) => new Date(iso).toISOString().slice(11, 16);

/** @param {{ runs: { conclusion: string|null, status: string, updated_at: string, html_url: string }[], note?: string, now: Date }} p neueste Läufe zuerst */
export function analyzeBackup({ runs, note = "", now }) {
  const done = runs.filter((r) => r.status === "completed");
  const last = done[0];
  const lastOk = done.find((r) => r.conclusion === "success");
  const m = String(note).match(NOTE_RE);
  const questions = m ? Number(m[2]) : null;
  /** @type {{ key: string, text: string } | null} */
  let incident = null;
  let line;
  if (!last) {
    line = "Letzte Sicherung: noch keine";
  } else if (last.conclusion !== "success") {
    line = `Sicherung fehlgeschlagen (${hhmm(last.updated_at)} UTC)${lastOk ? `, letzte gute ${hhmm(lastOk.updated_at)} UTC` : ""}`;
    incident = { key: `backup-failed:${last.html_url}`, text: `Nächtliche Sicherung fehlgeschlagen: ${last.html_url}` };
  } else if (now.getTime() - new Date(last.updated_at).getTime() > BACKUP_STALE_H * 3600_000) {
    line = `Sicherung überfällig, letzte ${last.updated_at.slice(0, 10)} ${hhmm(last.updated_at)} UTC`;
    incident = { key: "backup-stale", text: `Keine Sicherung seit über ${BACKUP_STALE_H} h (letzte: ${last.updated_at}).` };
  } else {
    line = `Letzte Sicherung ${hhmm(last.updated_at)} UTC${questions == null ? "" : `, ${questions} Fragen`}`;
  }
  return { line, incident, at: lastOk?.updated_at ?? null, questions, ok: !incident };
}

/** Liest Läufe und die Annotation des letzten guten Laufs. Fehler → null (Status zeigt dann „nicht lesbar“). */
export async function collectBackup(repo, now, call) {
  try {
    const { workflow_runs } = await call(`/repos/${repo}/actions/workflows/backup.yml/runs?per_page=5`);
    const runs = workflow_runs.map((r) => ({ id: r.id, status: r.status, conclusion: r.conclusion, updated_at: r.updated_at, html_url: r.html_url }));
    const ok = runs.find((r) => r.status === "completed" && r.conclusion === "success");
    let note = "";
    if (ok) {
      const { jobs } = await call(`/repos/${repo}/actions/runs/${ok.id}/jobs?per_page=10`);
      for (const job of jobs) {
        const notes = await call(`/repos/${repo}/check-runs/${job.id}/annotations`);
        note = notes.map((n) => n.message ?? "").find((t) => NOTE_RE.test(t)) ?? note;
      }
    }
    return analyzeBackup({ runs, note, now });
  } catch {
    return null;
  }
}

/** Restore-Test (SIN-337): monatlich; nach so vielen Tagen ohne Lauf gilt er als überfällig. */
export const RESTORE_STALE_D = 40;

/** @param {{ runs: { conclusion: string|null, status: string, updated_at: string, html_url: string }[], now: Date, since?: string }} p neueste Läufe zuerst; since = Anlage des Workflows (nur ohne Läufe) */
export function analyzeRestoreTest({ runs, now, since }) {
  const done = runs.filter((r) => r.status === "completed");
  const last = done[0];
  const lastOk = done.find((r) => r.conclusion === "success");
  /** @type {{ key: string, text: string } | null} */
  let incident = null;
  let line;
  if (!last) {
    const stale = since && now.getTime() - new Date(since).getTime() > RESTORE_STALE_D * 86400_000;
    line = stale ? `Restore-Test überfällig, noch nie gelaufen (Workflow seit ${since.slice(0, 10)})` : "Restore-Test: noch nicht gelaufen";
    if (stale) incident = { key: "restore-test-stale", text: `Kein Restore-Test seit über ${RESTORE_STALE_D} Tagen (nie gelaufen).` };
  } else if (last.conclusion !== "success") {
    line = `Restore-Test fehlgeschlagen (${last.updated_at.slice(0, 10)})${lastOk ? `, zuletzt ok ${lastOk.updated_at.slice(0, 10)}` : ""}`;
    incident = { key: `restore-test-failed:${last.html_url}`, text: `Restore-Test der Sicherung fehlgeschlagen: ${last.html_url}` };
  } else if (now.getTime() - new Date(last.updated_at).getTime() > RESTORE_STALE_D * 86400_000) {
    line = `Restore-Test überfällig, zuletzt ${last.updated_at.slice(0, 10)}`;
    incident = { key: "restore-test-stale", text: `Kein Restore-Test seit über ${RESTORE_STALE_D} Tagen (letzter: ${last.updated_at}).` };
  } else {
    line = `Sicherung zuletzt getestet am ${last.updated_at.slice(0, 10)}`;
  }
  return { line, incident, at: lastOk?.updated_at ?? null, ok: !incident };
}

/** Fehler beim Lesen → null (Status bleibt still). */
export async function collectRestoreTest(repo, now, call) {
  try {
    const { workflow_runs } = await call(`/repos/${repo}/actions/workflows/restore-test.yml/runs?per_page=5`);
    const since = workflow_runs.length ? undefined : (await call(`/repos/${repo}/actions/workflows/restore-test.yml`)).created_at;
    return analyzeRestoreTest({ since, runs: workflow_runs.map((r) => ({ status: r.status, conclusion: r.conclusion, updated_at: r.updated_at, html_url: r.html_url })), now });
  } catch {
    return null;
  }
}
