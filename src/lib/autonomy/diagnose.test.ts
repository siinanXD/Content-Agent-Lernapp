import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  classifyLog,
  diagnoseStall,
  linearQuota,
  linearQuotaIssue,
  newStallIssue,
  MAX_NO_PR,
  needsHumanComment,
  noPrComment,
  noPrStreak,
  pendingDecisions,
  renderLinearQuota,
  splitIssue,
  stalledRepairs,
  stallIssue,
  summarizeExecution,
  tooBig,
} from "../../../scripts/autonomy/diagnose.mjs";
import { isInstantAbort, isPaused, pauseUntilFromLog, repeatFailurePause } from "../../../scripts/autonomy/budget.mjs";

// Logs der drei Stillstände vom 06.10. (gekürzt) und des Claude-Limits.
const LOGS = {
  absturz: {
    workflow: "planner",
    text: "Run node scripts/autonomy/planner.mjs --context\nSyntaxError: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON\n    at JSON.parse (<anonymous>)\nError: Process completed with exit code 1.",
    label: "Skript abgestürzt (z. B. Fehlerseite statt JSON)",
  },
  regel: {
    workflow: "planner",
    text: "Planer: Issues anlegen\nVercel: deployment blocked by rule api-deployments-free-per-day (Resource is limited)\nError: Process completed with exit code 1.",
    label: "Regel blockiert die Planung (z. B. Vercel)",
  },
  "linear-limit": {
    workflow: "planner",
    text: 'Linear-Fehler: [{"message":"Usage limit exceeded: issue limit reached for this workspace","extensions":{"code":"LIMIT_EXCEEDED"}}]',
    label: "Linear-Issue-Limit erreicht",
  },
  kontingent: {
    workflow: "worker",
    text: 'Claude Code error: {"status": 429} Claude usage limit reached|1760000000',
    label: "Claude-Kontingent oder Rate-Limit",
  },
} as const;

test("Diagnose: jede Ursache → passendes Bug-Issue (Fixture-Logs)", () => {
  for (const [cause, log] of Object.entries(LOGS)) {
    const d = diagnoseStall({ running: 0, paused: false, startable: 0, idleMin: 0, logs: [{ ...log, runId: 1, url: "https://github.com/x/runs/1" }] });
    assert.ok(d, cause);
    assert.equal(d.cause, cause);
    const issue = newStallIssue(d, []);
    assert.ok(issue, cause);
    assert.equal(issue.title, `Stillstand: ${log.label}`);
    assert.equal(issue.priority, 1); // dringend
    assert.deepEqual(issue.labels, ["claude", "Bug"]);
    assert.match(issue.description, /## Log-Auszug/);
    assert.match(issue.description, /https:\/\/github\.com\/x\/runs\/1/);
  }
});

test("Diagnose: Log-Auszug enthält die Fehlerzeilen, nicht den ganzen Lauf", () => {
  const noise = Array.from({ length: 50 }, (_, i) => `Schritt ${i} ok`).join("\n");
  const d = diagnoseStall({ running: 0, paused: false, startable: 0, idleMin: 0, logs: [{ workflow: "planner", text: `${noise}\n${LOGS.absturz.text}` }] });
  assert.match(d!.excerpt, /Unexpected token/);
  assert.ok(d!.excerpt.split("\n").length <= 8);
  assert.doesNotMatch(d!.excerpt, /Schritt 3 ok/);
});

test("Diagnose: kein Stillstand bei laufendem Worker, Pause oder jungem Leerlauf", () => {
  const logs = [{ workflow: "planner", text: LOGS.absturz.text }];
  assert.equal(diagnoseStall({ running: 1, paused: false, startable: 3, idleMin: 90, logs }), null);
  assert.equal(diagnoseStall({ running: 0, paused: true, startable: 0, idleMin: 90, logs }), null);
  assert.equal(diagnoseStall({ running: 0, paused: false, startable: 2, idleMin: 20, logs }), null); // unter 30 Min
  assert.ok(diagnoseStall({ running: 0, paused: false, startable: 2, idleMin: 31, logs }));
});

test("Diagnose: leere Schlange ohne erkennbare Ursache ist normal, Stillstand mit Arbeit ohne Ursache wird gemeldet", () => {
  assert.equal(diagnoseStall({ running: 0, paused: false, startable: 0, idleMin: 500, logs: [] }), null);
  const d = diagnoseStall({ running: 0, paused: false, startable: 2, idleMin: 60, logs: [] });
  assert.equal(d?.cause, "unbekannt");
  assert.match(d!.reason, /2 startbare/);
});

test("Diagnose: kein Duplikat, wenn schon ein Issue mit gleichem Titel offen oder heute erledigt ist", () => {
  const d = diagnoseStall({ running: 0, paused: false, startable: 0, idleMin: 0, logs: [{ workflow: "planner", text: LOGS.absturz.text }] })!;
  const title = stallIssue(d).title;
  assert.equal(newStallIssue(d, [{ title: title.toUpperCase() }]), null);
  assert.equal(newStallIssue(null, []), null);
  assert.ok(newStallIssue(d, [{ title: "Etwas anderes" }]));
});

test("Diagnose: classifyLog ordnet das Spezifischere zuerst zu", () => {
  assert.equal(classifyLog("Linear: issue limit reached, HTTP 429").key, "linear-limit");
  assert.equal(classifyLog("alles gut").key, "unbekannt");
});

test("SIN-584: neuerer planner-Lauf verdeckt den Grund aus dem dispatch-Lauf nicht; Fixture → ohne-start → Bug-Issue", () => {
  const logs = [
    { workflow: "planner", url: "p", text: "Kein roter Lauf: planner. Letzter Lauf #38411012448 success am 2026-10-13T14:09:56Z" },
    { workflow: "dispatch", url: "d", text: "Kein roter Lauf: dispatch. Letzter Lauf #1 success am 2026-10-13T13:00:00Z\nNichts zu starten: kein freies Todo (Blocker)" },
  ];
  const diag = diagnoseStall({ running: 0, paused: false, startable: 1, idleMin: 690, logs });
  assert.equal(diag?.cause, "ohne-start");
  assert.equal(diag?.workflow, "dispatch");
  assert.match(diag!.excerpt, /Nichts zu starten/);
  assert.equal(newStallIssue(diag, [])?.title, "Stillstand: Läufe ohne Fehler, aber kein Worker gestartet");
});

test("SIN-703: Fixture dispatch wählte Issue → ohne-start erst nach Ablauf der Startfrist → Bug-Issue", () => {
  const text = "Kein roter Lauf: dispatch. Letzter Lauf #38769899804 success am 2026-10-15T16:32:45Z\nNächstes Issue: SIN-702 (Worker: Lauf-Aufträge), Spur backend, Größe mittel, Priorität 2";
  const logs = [{ workflow: "dispatch", url: "d", text, at: "2026-10-15T16:32:45Z" }];
  const input = { running: 0, paused: false, startable: 1, idleMin: 486, logs };
  // Gerade gestartet: der Worker ist nur noch nicht sichtbar.
  assert.equal(diagnoseStall({ ...input, now: Date.parse("2026-10-15T16:40:00Z") }), null);
  // Später ohne Worker: wirklich ohne Start.
  const diag = diagnoseStall({ ...input, now: Date.parse("2026-10-15T18:00:00Z") });
  assert.equal(diag?.cause, "ohne-start");
  assert.equal(newStallIssue(diag, [])?.title, "Stillstand: Läufe ohne Fehler, aber kein Worker gestartet");
});

test("SIN-824: Original-Log mit abgelaufener Pause ergibt das passende Stillstand-Issue", () => {
  const text = "Kein roter Lauf: dispatch. Letzter Lauf #39063399718 success am 2026-10-17T19:39:26Z\nPausiert bis 2026-10-17T20:58:03.827Z";
  const diag = diagnoseStall({ running: 0, paused: false, startable: 7, idleMin: 209, logs: [{ workflow: "dispatch", text, url: "https://github.com/siinanXD/Content-Agent-Lernapp/actions/runs/39063399718" }] });
  assert.equal(diag?.cause, "ohne-start");
  const issue = newStallIssue(diag, []);
  assert.equal(issue?.title, "Stillstand: Läufe ohne Fehler, aber kein Worker gestartet");
  assert.match(issue!.description, /Pausiert bis 2026-10-17T20:58:03.827Z/);
  assert.match(issue!.description, /39063399718/);
});

test("Worker ohne PR: Kommentar mit letzter Ausgabe, num_turns und permission denials", () => {
  const raw = JSON.stringify([
    { type: "assistant", message: { content: [{ type: "text", text: "Ich mache jetzt den PR." }] } },
    { type: "result", subtype: "success", is_error: false, num_turns: 12, result: "Fertig, aber ohne PR.", permission_denials: [{ tool_name: "Bash", tool_input: { command: "gh pr create" } }] },
  ]);
  const s = summarizeExecution(raw);
  assert.equal(s.numTurns, 12);
  assert.equal(s.lastOutput, "Fertig, aber ohne PR.");
  assert.equal(s.denials.length, 1);
  const c = noPrComment("SIN-275", s);
  assert.match(c, /kein PR\. Zurück auf Todo/);
  assert.match(c, /num_turns: 12/);
  assert.match(c, /Letzte Ausgabe: Fertig, aber ohne PR\./);
  assert.match(c, /Permission denials: Bash .*gh pr create/);
  assert.doesNotMatch(c, /zerlegen/);
  // Ohne Datei: Hinweis „unbekannt“, kein Absturz.
  assert.match(noPrComment("SIN-1", summarizeExecution("")), /num_turns: unbekannt/);
});

test("Worker ohne PR: zu großer Auftrag wird in 2–4 Teil-Issues zerlegt", () => {
  const s = summarizeExecution(JSON.stringify([{ type: "result", subtype: "error_max_turns", num_turns: 150, result: "" }]));
  assert.ok(tooBig(s));
  assert.match(noPrComment("SIN-9", s), /2–4 Teil-Issues/);
  const issue = {
    identifier: "SIN-9",
    title: "Großer Auftrag",
    priority: 2,
    labels: { nodes: [{ name: "backend" }, { name: "claude" }] },
    description: "## Umsetzung\n1. Eins\n2. Zwei\n3. Drei\n4. Vier\n5. Fünf\n\n## Fertig, wenn\n* Tests grün",
  };
  const parts = splitIssue(issue);
  assert.ok(parts.length >= 2 && parts.length <= 4);
  assert.equal(parts.flatMap((p: { description: string }) => p.description.match(/^- \[ \] /gm) ?? []).length, 5);
  assert.match(parts[0].title, /Teil 1 von /);
  assert.deepEqual(parts[0].labels, ["backend", "claude"]);
  assert.deepEqual(splitIssue({ ...issue, description: "Nur ein Satz." }), []);
  assert.ok(!tooBig(summarizeExecution(JSON.stringify([{ type: "result", subtype: "success", num_turns: 10 }]))));
});


test("Reparatur ohne Commit (SIN-418): rote CI, Commit älter als 30 Min → Anstoß, einmal je Commit", () => {
  const now = new Date("2026-10-09T01:50:00Z");
  const pr = { number: 227, head: "claude/sin-404", labels: [] as string[], sha: "abc1234", head_at: "2026-10-09T00:40:00Z", html_url: "u" };
  const red = { 227: { ci: "failure" } };
  assert.deepEqual(stalledRepairs([pr], red, [], now).map((k: { pr: number }) => k.pr), [227]);
  assert.equal(stalledRepairs([{ ...pr, head_at: "2026-10-09T01:40:00Z" }], red, [], now).length, 0);
  assert.equal(stalledRepairs([pr], { 227: { ci: "success" } }, [], now).length, 0);
  assert.equal(stalledRepairs([{ ...pr, labels: ["needs-human"] }], red, [], now).length, 0);
  assert.equal(stalledRepairs([pr], red, [{ name: "repair", status: "in_progress" }], now).length, 0);
  assert.equal(stalledRepairs([pr], red, [], now, { 227: "abc1234" }).length, 0);
  assert.equal(stalledRepairs([{ ...pr, head: "dependabot/x" }], red, [], now).length, 0);
});

test("SIN-362: zweiter Lauf in Folge ohne PR → needs-human; Limit-Läufe und frühere PRs zählen nicht", () => {
  const s = summarizeExecution("");
  const kein = (t: string, limit = false) => ({ body: noPrComment("SIN-348", s, { limit }), createdAt: t });
  assert.equal(noPrStreak([]), 0);
  assert.equal(noPrStreak([kein("2026-10-08T01:00:00Z")]), 1);
  assert.equal(noPrStreak([kein("2026-10-08T01:00:00Z"), kein("2026-10-08T02:00:00Z")]), 2);
  assert.equal(noPrStreak([kein("2026-10-08T01:00:00Z", true), kein("2026-10-08T02:00:00Z", true)]), 0);
  const fertig = { body: "Worker fertig: https://github.com/x/pull/1", createdAt: "2026-10-08T01:30:00Z" };
  assert.equal(noPrStreak([kein("2026-10-08T01:00:00Z"), fertig, kein("2026-10-08T02:00:00Z")]), 1);
  assert.equal(MAX_NO_PR, 2);
  const c = needsHumanComment("SIN-348", { ...s, lastOutput: "darf den Workflow run-task nicht starten" });
  assert.match(c, /needs-human/);
  assert.match(c, /run-task nicht starten/);
});
