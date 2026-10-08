import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  classifyLog,
  diagnoseStall,
  linearQuota,
  linearQuotaIssue,
  newStallIssue,
  noPrComment,
  pendingDecisions,
  renderLinearQuota,
  splitIssue,
  stallIssue,
  summarizeExecution,
  tooBig,
} from "../../../scripts/autonomy/diagnose.mjs";
import { analyze, buildQuotaRows, collectLogs } from "../../../scripts/autonomy/status.mjs";
import { limitAlerts } from "../../../scripts/autonomy/limits.mjs";
import { decideRefill } from "../../../scripts/autonomy/refill.mjs";

const limits = JSON.parse(readFileSync("docs/autonomy/free-tier-limits.json", "utf8"));
const fixture = () => JSON.parse(readFileSync("docs/autonomy/fixture-status.json", "utf8"));

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

test("Wächter: Absturz des Planers bei leerer Schlange → Bug-Issue-Aktion und Vorfall", () => {
  const snap = fixture();
  snap.runs = [];
  snap.prs = [];
  snap.usage = {};
  snap.issues = [];
  snap.logs = [{ workflow: "planner", runId: 9, text: LOGS.absturz.text }];
  const r = analyze(snap, limits, {});
  assert.equal(r.diagnosis?.cause, "absturz");
  assert.ok(r.incidents.some((i: { key: string }) => i.key === "stall:absturz"));
  const create = r.actions.filter((a: { type: string }) => a.type === "create-issue");
  assert.equal(create.length, 1);
  assert.equal(create[0].issue.title, "Stillstand: Skript abgestürzt (z. B. Fehlerseite statt JSON)");
  assert.match(r.body, /Stillstand: Skript abgestürzt/);
  // Schon offen → keine zweite Aktion.
  snap.issues = [{ identifier: "SIN-300", title: create[0].issue.title, state: { name: "Todo", type: "unstarted" }, labels: { nodes: [] } }];
  const again = analyze(snap, limits, {});
  assert.equal(again.actions.filter((a: { type: string }) => a.type === "create-issue").length, 0);
  // Heute erledigt → auch keins.
  snap.issues = [];
  snap.doneTitles = [create[0].issue.title];
  assert.equal(analyze(snap, limits, {}).actions.filter((a: { type: string }) => a.type === "create-issue").length, 0);
});

test("Wächter: Linear-Limit-Log bei startbarem Todo und Leerlauf > 30 Min → Bug-Issue", () => {
  const snap = fixture();
  snap.runs = [];
  snap.prs = [];
  snap.usage = {};
  snap.now = "2026-10-05T13:00:00Z";
  snap.issues = snap.issues.filter((i: { identifier: string }) => i.identifier !== "SIN-200" && i.identifier !== "SIN-238");
  snap.logs = [{ workflow: "dispatch", runId: 3, text: LOGS["linear-limit"].text }];
  const r = analyze(snap, limits, {});
  assert.equal(r.diagnosis?.cause, "linear-limit");
  assert.match(r.diagnosis!.reason, /Kein Worker läuft seit/);
});

test("Wächter: kein Stillstand-Issue bei laufendem Worker", () => {
  const snap = fixture();
  snap.prs = [];
  snap.usage = {};
  snap.logs = [{ workflow: "planner", runId: 9, text: LOGS.absturz.text }];
  const r = analyze(snap, limits, {});
  assert.equal(r.diagnosis, null);
  assert.ok(!r.actions.some((a: { type: string }) => a.type === "create-issue"));
});

test("Logs: nur der letzte Lauf je Workflow zählt, ein späterer Erfolg heilt", async () => {
  const runs = [
    { id: 1, name: "planner", status: "completed", conclusion: "failure", created_at: "2026-10-05T01:00:00Z", html_url: "u1" },
    { id: 2, name: "planner", status: "completed", conclusion: "success", created_at: "2026-10-05T05:00:00Z", html_url: "u2" },
    { id: 3, name: "worker", status: "completed", conclusion: "failure", created_at: "2026-10-05T06:00:00Z", html_url: "u3" },
  ];
  const call = async () => ({ jobs: [{ id: 77, conclusion: "failure" }] });
  const text = async (path: string) => `Log ${path}`;
  const logs = await collectLogs("o/r", runs, { call: call as never, text });
  assert.equal(logs[0].workflow, "worker");
  assert.match(logs[0].text, /jobs\/77\/logs/);
  // Geheilte Workflows erscheinen nur als Hinweiszeile (SIN-328), ohne roten Log.
  assert.match(logs.find((l: { workflow: string }) => l.workflow === "planner")?.text ?? "", /^Kein roter Lauf: planner/);
});

test("SIN-328: Stillstand ohne roten Lauf → Ursache ohne-start statt unbekannt", async () => {
  const runs = [{ id: 5, name: "dispatch", status: "completed", conclusion: "success", created_at: "2026-10-07T01:00:00Z", html_url: "u5" }];
  const call = (async () => ({ jobs: [] })) as never;
  const logs = await collectLogs("o/r", runs, { call, text: async () => "" });
  const d = diagnoseStall({ running: 0, paused: false, startable: 13, idleMin: 400, logs });
  assert.equal(d?.cause, "ohne-start");
  assert.match(d!.reason, /400 Min.*13 startbare/);
  assert.equal(newStallIssue(d, [])?.title, "Stillstand: Läufe ohne Fehler, aber kein Worker gestartet");
  // Leere Schlange bleibt normal.
  assert.equal(diagnoseStall({ running: 0, paused: false, startable: 0, idleMin: 400, logs }), null);
  // Gar keine Läufe: ebenfalls erkannt.
  const none = await collectLogs("o/r", [], { call, text: async () => "" });
  assert.match(none[0].text, /Kein Lauf gefunden/);
  assert.equal(diagnoseStall({ running: 0, paused: false, startable: 13, idleMin: 400, logs: none })?.cause, "ohne-start");
});

test("SIN-361: übersprungener PR-Ereignis-Lauf von dispatch verdeckt den echten letzten Lauf nicht", async () => {
  const runs = [
    { id: 37704492311, name: "dispatch", status: "completed", conclusion: "skipped", event: "pull_request", created_at: "2026-10-07T23:50:16Z", html_url: "u2" },
    { id: 7, name: "dispatch", status: "completed", conclusion: "success", event: "schedule", created_at: "2026-10-07T23:30:00Z", html_url: "u1" },
  ];
  const call = (async () => ({ jobs: [] })) as never;
  const logs = await collectLogs("o/r", runs, { call, text: async () => "" });
  assert.match(logs.find((l: { workflow: string }) => l.workflow === "dispatch")?.text ?? "", /Letzter Lauf #7 success am 2026-10-07T23:30:00Z/);
  // Nur PR-Ereignis-Läufe: wie „kein Lauf“ melden, damit der Zeitplan geprüft wird.
  const only = await collectLogs("o/r", runs.slice(0, 1), { call, text: async () => "" });
  assert.match(only.find((l: { workflow: string }) => l.workflow === "dispatch")?.text ?? "", /Kein Lauf gefunden/);
  // Fixture aus SIN-361: Log-Auszug → Ursache ohne-start → Bug-Issue
  const text = "Kein roter Lauf: dispatch. Letzter Lauf #37704492311 skipped am 2026-10-07T23:50:16Z";
  const diag = diagnoseStall({ running: 0, paused: false, startable: 1, idleMin: 183, logs: [{ workflow: "dispatch", text }] });
  assert.equal(diag?.cause, "ohne-start");
  assert.equal(newStallIssue(diag, [])?.title, "Stillstand: Läufe ohne Fehler, aber kein Worker gestartet");
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

// Linear Free (250er-Grenze) als Fixture; die echte Datei steht seit SIN-360 auf Basic (limit: null).
const freeLimits = { ...limits, limits: { ...limits.limits, linear_issues: { ...limits.limits.linear_issues, limit: 250 } } };

test("Linear-Kontingent: ab 85 % Hinweis, ab 95 % Planer stoppt, Zeile in der Kontingent-Tabelle", () => {
  assert.equal(linearQuota(200).level, "ok");
  assert.equal(linearQuota(212).level, "ok"); // 84,8 %
  assert.equal(linearQuota(213).level, "warn"); // 85,2 %
  assert.equal(linearQuota(237).level, "warn"); // 94,8 %
  assert.equal(linearQuota(238).level, "stop"); // 95,2 %
  assert.equal(linearQuota(null).level, "unknown");
  assert.equal(linearQuotaIssue(linearQuota(230)), null);
  assert.match(linearQuotaIssue(linearQuota(240))!.title, /^Linear-Kontingent:/);

  const row = (n: number) => buildQuotaRows({ linear_issues: n }, freeLimits).find((r: { key: string }) => r.key === "linear_issues")!;
  assert.equal(row(212).over, false); // 80 % reichen hier nicht, erst 85 %
  assert.equal(row(213).over, true);
  assert.deepEqual(limitAlerts({ linear_issues: 213 }, freeLimits).map((a: { key: string }) => a.key), ["linear_issues"]);

  // Wächter: Hinweis ab 85 %, Issue erst ab 95 %, Planer-Anstoß stoppt.
  const snap = fixture();
  snap.usage = { linear_issues: 213 };
  const warn = analyze(snap, freeLimits, {});
  assert.ok(warn.incidents.some((i: { key: string }) => i.key === "quota:linear_issues"));
  assert.ok(!warn.actions.some((a: { type: string; issue?: { title: string } }) => a.type === "create-issue" && a.issue?.title.startsWith("Linear-Kontingent")));
  snap.usage = { linear_issues: 240 };
  const stop = analyze(snap, freeLimits, {});
  assert.ok(stop.actions.some((a: { type: string; issue?: { title: string } }) => a.type === "create-issue" && a.issue?.title.startsWith("Linear-Kontingent")));
  assert.equal(stop.refill.trigger, false);
  assert.match(stop.refill.reason, /95 %/);
  assert.equal(decideRefill({ startable: 0, phase: "bauen", linearFull: false, env: {} }).trigger, true);
  assert.equal(decideRefill({ startable: 0, phase: "bauen", linearFull: true, env: {} }).trigger, false);
});

test("Entscheidungen in gemergten PRs: sichtbar bis Sinan antwortet", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const body = "Part of SIN-1\n\n## Was ändert sich\nEtwas.\n\n## Entscheidung nötig\nSoll X oder Y gelten?\n- X\n- Y\n";
  const pr = { number: 110, title: "feat(x): Y (SIN-1)", body, merged_at: "2026-10-05T10:00:00Z", labels: [] as string[] };
  const list = pendingDecisions([pr, { ...pr, number: 111, body: "Part of SIN-2" }, { ...pr, number: 112, merged_at: null }], {}, { now });
  assert.deepEqual(list.map((d: { number: number }) => d.number), [110]);
  assert.equal(list[0].question, "Soll X oder Y gelten?");
  // Kommentar eines anderen Nutzers oder vor dem Merge beantwortet nichts.
  const other = { 110: [{ user: "claude[bot]", created_at: "2026-10-05T11:00:00Z" }, { user: "siinanXD", created_at: "2026-10-05T09:00:00Z" }] };
  assert.equal(pendingDecisions([pr], other, { now }).length, 1);
  // Antwort von Sinan nach dem Merge oder Label `entschieden` → weg.
  assert.equal(pendingDecisions([pr], { 110: [{ user: "siinanXD", created_at: "2026-10-05T11:00:00Z" }] }, { now }).length, 0);
  assert.equal(pendingDecisions([{ ...pr, labels: ["entschieden"] }], {}, { now }).length, 0);
  // Nach 14 Tagen nicht mehr.
  assert.equal(pendingDecisions([pr], {}, { now: new Date("2026-10-30T00:00:00Z") }).length, 0);

  // Status-Seite: Abschnitt „Braucht dich“ und einmalige Erwähnung.
  const snap = fixture();
  snap.decisions = list;
  const r = analyze(snap, limits, {});
  assert.match(r.body, /## Braucht dich[\s\S]*#110 feat\(x\): Y \(SIN-1\): Soll X oder Y gelten\?/);
  assert.ok(r.incidents.some((i: { key: string }) => i.key === "decision:110"));
  snap.decisions = [];
  assert.doesNotMatch(analyze(snap, limits, {}).body, /## Braucht dich/);
});

test("Linear Basic (limit: null): kein Prozent, keine Warnung, Planer bremst nicht (SIN-360)", () => {
  assert.equal(limits.limits.linear_issues.limit, null);
  const q = linearQuota(213, null);
  assert.equal(q.level, "unlimited");
  assert.equal(q.pct, null);
  assert.equal(renderLinearQuota(q), "Linear: 213 Issues (unbegrenzt)");
  assert.equal(linearQuotaIssue(linearQuota(9999, null)), null);

  const row = buildQuotaRows({ linear_issues: 213 }, limits).find((r: { key: string }) => r.key === "linear_issues")!;
  assert.equal(row.pct, null);
  assert.equal(row.over, false);
  assert.equal(row.text, "213 Issues (unbegrenzt)");
  assert.deepEqual(limitAlerts({ linear_issues: 9999 }, limits), []);

  const snap = fixture();
  snap.usage = { linear_issues: 9999 };
  const r = analyze(snap, limits, {});
  assert.ok(!r.incidents.some((i: { key: string }) => i.key === "quota:linear_issues"));
  assert.notEqual(r.refill.bugsOnly, true);
  assert.doesNotMatch(r.refill.reason, /95 %/);
});
