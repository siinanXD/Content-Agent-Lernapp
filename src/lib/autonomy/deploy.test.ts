import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { attemptState, changedFilesSince, decideDeploy, deployIntervalH, isAppCodePath, lastProductionDeployAt, planDeploy, renderDeploy, triggerDeploy } from "../../../scripts/autonomy/deploy.mjs";

const now = new Date("2026-10-06T12:00:00Z");

test("Deploy: nur App-Code zählt, Doku/CI/Tests/Autonomie nicht", () => {
  for (const p of ["docs/PRODUCT.md", "README.md", ".github/workflows/status.yml", "e2e/smoke.spec.ts", "scripts/autonomy/deploy.mjs", "src/lib/a.test.ts", "playwright.config.ts"]) {
    assert.equal(isAppCodePath(p), false, p);
  }
  for (const p of ["src/app/page.tsx", "package.json", "src/lib/storage/x.ts", "vercel.json"]) assert.equal(isAppCodePath(p), true, p);
});

test("Deploy: höchstens 1× pro Stunde, nur bei App-Code, ab 90 % alle 3 h", () => {
  const files = ["src/app/page.tsx", "docs/x.md"];
  const d = (over: object) => decideDeploy({ now, lastDeployAt: "2026-10-06T10:30:00Z", changedFiles: files, ...over });
  assert.equal(d({}).deploy, true);
  assert.equal(d({ lastDeployAt: "2026-10-06T11:30:00Z" }).deploy, false); // erst 30 Min
  assert.equal(d({ lastDeployAt: "2026-10-06T11:00:00Z" }).deploy, true); // genau 1 h
  assert.equal(d({ changedFiles: ["docs/x.md", "e2e/a.ts"] }).deploy, false);
  assert.equal(d({ changedFiles: [] }).deploy, false);
  assert.equal(d({ vercelPct: 89 }).deploy, true);
  assert.equal(d({ vercelPct: 90 }).deploy, false); // 1,5 h < 3 h
  assert.equal(d({ vercelPct: 90, lastDeployAt: "2026-10-06T09:00:00Z" }).deploy, true);
  assert.equal(d({ vercelPct: 90 }).nextAt, "2026-10-06T13:30:00.000Z");
  assert.equal(deployIntervalH(null), 1);
  assert.equal(deployIntervalH(95), 3);
});

test("Deploy: Unbekanntes löst nichts aus", () => {
  assert.equal(decideDeploy({ now, lastDeployAt: null, changedFiles: ["src/app/page.tsx"] }).deploy, false);
  assert.equal(decideDeploy({ now, lastDeployAt: "2026-10-06T08:00:00Z", changedFiles: null }).deploy, false);
});

test("Deploy: Statuszeile nennt letzten und nächsten Deploy", () => {
  const line = renderDeploy(decideDeploy({ now, lastDeployAt: "2026-10-06T11:30:00Z", changedFiles: ["src/app/page.tsx"] }));
  assert.match(line, /letzter 11:30 UTC, nächster frühestens 12:30 UTC/);
  assert.equal(renderDeploy(null), "");
});

test("Deploy: Vercel- und GitHub-Abfrage, Hook ohne URL in der Ausgabe", async () => {
  const fetchImpl = (async (url: string) => {
    assert.match(url, /target=production/);
    return new Response(JSON.stringify({ deployments: [{ createdAt: Date.parse("2026-10-06T11:00:00Z"), readyState: "CANCELED" }, { createdAt: Date.parse("2026-10-06T10:00:00Z"), readyState: "READY" }] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  assert.equal(await lastProductionDeployAt({ env: {}, fetchImpl }), null);
  assert.equal(await lastProductionDeployAt({ env: { VERCEL_TOKEN: "t" }, fetchImpl }), "2026-10-06T10:00:00.000Z");

  const call = async (path: string) => (path.includes("/commits?") ? [{ sha: "a" }, { sha: "b" }] : { files: [{ filename: path.endsWith("a") ? "src/app/page.tsx" : "docs/x.md" }] });
  assert.deepEqual((await changedFilesSince("o/r", "2026-10-06T10:00:00.000Z", call)).sort(), ["docs/x.md", "src/app/page.tsx"]);

  const plan = await planDeploy({ env: { VERCEL_TOKEN: "t", GITHUB_REPOSITORY: "o/r" }, now, call, vercelPct: 10, fetchImpl });
  assert.equal(plan.deploy, true);
  const failing = await planDeploy({ env: { VERCEL_TOKEN: "t", GITHUB_REPOSITORY: "o/r" }, now, fetchImpl, call: async () => { throw new Error("down"); } });
  assert.equal(failing.deploy, false);

  assert.deepEqual(await triggerDeploy("https://hook", (async () => new Response("", { status: 201 })) as unknown as typeof fetch), { ok: true });
  assert.deepEqual(await triggerDeploy("https://hook", (async () => new Response("", { status: 429 })) as unknown as typeof fetch), { ok: false, status: 429 });
});

test("vercel.json: keine Git-Deploys, kein Ignore-Skript, das Hook-Deploys abbrechen könnte (SIN-309)", () => {
  const cfg = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.equal(cfg.git?.deploymentEnabled, false);
  assert.equal(cfg.ignoreCommand, undefined);
  assert.equal(existsSync("scripts/vercel-ignore.sh"), false);
});

test("Deploy-Sperre: pro Commit ein Hook-Versuch, nach CANCELED/ERROR kein zweiter (SIN-309)", () => {
  const base = { now, lastDeployAt: "2026-10-05T03:39:00Z", changedFiles: ["src/app/page.tsx"], headSha: "03e0768aaaaaaa" };
  // Fixture: CANCELED-Deploy für denselben Commit → kein zweiter Hook-Aufruf, auch nach 6 h nicht.
  const canceled = { sha: "03e0768aaaaaaa", at: "2026-10-06T01:00:00Z", state: "CANCELED" };
  const d = decideDeploy({ ...base, attempt: canceled });
  assert.equal(d.deploy, false);
  assert.match(d.reason, /CANCELED/);
  assert.deepEqual(d.stuck, { since: canceled.at, sha: canceled.sha, state: "CANCELED" });
  assert.equal(decideDeploy({ ...base, attempt: { ...canceled, state: "ERROR" } }).deploy, false);
  // Neuer Commit: neuer Versuch erlaubt, die Meldung „hängt“ bleibt bis zum READY-Deploy.
  const next = decideDeploy({ ...base, headSha: "bbbbbbb", attempt: canceled });
  assert.equal(next.deploy, true);
  assert.ok(next.stuck);
  // Gleicher Commit, Versuch noch offen oder READY-los: erst nach 6 h wieder.
  const open = { sha: base.headSha, at: "2026-10-06T09:00:00Z", state: null };
  assert.equal(decideDeploy({ ...base, attempt: open }).deploy, false); // 3 h
  assert.equal(decideDeploy({ ...base, attempt: { ...open, at: "2026-10-06T05:59:00Z" } }).deploy, true); // > 6 h
  // Kein Versuch gemerkt: wie bisher.
  assert.equal(decideDeploy(base).deploy, true);
  // Nach einem READY-Deploy ist nichts mehr „hängend“.
  assert.equal(decideDeploy({ ...base, lastDeployAt: "2026-10-06T02:00:00Z", attempt: canceled }).stuck, null);
});

test("Deploy-Sperre: Ergebnis des Versuchs kommt aus Vercel, Status zeigt Live-Stand", async () => {
  const attempt = { sha: "03e0768aaaaaaa", at: "2026-10-06T11:00:00.000Z", state: null };
  const deploys = [
    { state: "CANCELED", at: "2026-10-06T11:00:05.000Z", sha: "03e0768aaaaaaa" },
    { state: "READY", at: "2026-10-06T03:39:00.000Z", sha: "aaaaaaa1111111" },
  ];
  assert.equal(attemptState(attempt, deploys), "CANCELED");
  assert.equal(attemptState(attempt, deploys.slice(1)), null);

  const fetchImpl = (async () =>
    new Response(JSON.stringify({ deployments: [{ createdAt: Date.parse(deploys[0].at), readyState: "CANCELED" }, { createdAt: Date.parse(deploys[1].at), readyState: "READY", meta: { githubCommitSha: deploys[1].sha } }] }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
  const call = async (path: string) => (path.endsWith("/commits/main") ? { sha: attempt.sha } : path.includes("/commits?") ? [{ sha: attempt.sha }, { sha: "c2" }] : { files: [{ filename: "src/app/page.tsx" }] });
  const plan = await planDeploy({ env: { VERCEL_TOKEN: "t", GITHUB_REPOSITORY: "o/r" }, now, call, fetchImpl, prevAttempt: attempt });
  assert.equal(plan.deploy, false);
  assert.equal(plan.attempt?.state, "CANCELED");
  assert.equal(plan.stuck?.state, "CANCELED");
  const text = renderDeploy(plan);
  assert.match(text, /Live-Stand: Commit aaaaaaa \(03:39 UTC\), main ist 2 Merge\(s\) voraus/);
  assert.match(text, /Production hängt seit 11:00 UTC/);
});
