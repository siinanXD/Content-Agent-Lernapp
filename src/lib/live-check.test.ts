import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { analyzeLiveCheck, buildReport, parsePlaywright, runApiChecks } from "../../scripts/autonomy/live-check.mjs";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Gesunde App: jede Route antwortet wie in Production. */
const healthy = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const post = init?.method === "POST";
  if (url.endsWith("/api/health")) return json(200, { ok: true, db: "ok" });
  if (url.endsWith("/api/learner/phase-a")) return json(200, { courseId: "c1", units: [{ id: "u1", sourceUrl: "https://x", sourceFetchedAt: "2026-10-03" }] });
  if (url.endsWith("/lernpfad")) return json(200, { units: [] });
  if (url.endsWith("/api/progress")) return post && String(init?.body).includes("anonymousId") ? json(201, { ok: true }) : json(400, { error: "anonymousId_required" });
  if (url.endsWith("/api/demo")) return json(201, { ok: true });
  if (url.endsWith("/api/ausbilder/gruppe")) return json(401, { error: "Bitte anmelden." });
  return json(404, {});
}) as typeof fetch;

test("Live-Check API: gesunde App ist komplett grün", async () => {
  const res = await runApiChecks("https://app.test", healthy, 1);
  assert.equal(res.length, 8);
  assert.deepEqual(res.filter((r: { ok: boolean }) => !r.ok), []);
});

test("Live-Check API: kaputter Deploy (alle Routen 500, wie SIN-308) wird erkannt", async () => {
  const broken = (async () => new Response("Internal Server Error", { status: 500 })) as typeof fetch;
  const res = await runApiChecks("https://app.test", broken, 1);
  const failed = res.filter((r: { ok: boolean }) => !r.ok).map((r: { id: string }) => r.id);
  // API-04 gilt ohne Einheiten als erfüllt; alle anderen müssen rot sein.
  assert.deepEqual(failed, ["API-01", "API-02", "API-03", "API-05", "API-06", "API-07", "API-08"]);
  const report = buildReport({ now: new Date("2026-10-06T19:05:00Z"), base: "https://app.test", api: res, pw: [] });
  assert.equal(report.ok, false);
  assert.match(report.summary, /^Live-Check 21:05: 1\/8 ROT$/);
});

test("Live-Check API: Datenbank nicht erreichbar ist rot", async () => {
  const f = (async (input: string | URL | Request, init?: RequestInit) =>
    String(input).endsWith("/api/health") ? json(503, { ok: false, db: "unreachable" }) : healthy(input, init)) as typeof fetch;
  const res = await runApiChecks("https://app.test", f, 1);
  assert.equal(res[0].ok, false);
});

test("Live-Check Bericht: grün, Zählung und Hinweis-Prüfungen", () => {
  const api = [{ id: "API-01", name: "health", ok: true, detail: "" }];
  const pw = [{ id: "UI-01", name: "Seite / lädt", project: "handy", status: "ok", detail: "" }];
  const green = buildReport({ now: new Date("2026-10-06T19:05:00Z"), base: "u", api, pw, lighthouse: "ok", sentry: { count: 0, titles: [] } });
  assert.equal(green.summary, "Live-Check 21:05: 4/4 grün");
  // Lighthouse und Sentry rot: Hinweis, kein Revert.
  const notice = buildReport({ now: new Date("2026-10-06T19:05:00Z"), base: "u", api, pw, lighthouse: "fail", sentry: { count: 2, titles: ["A", "B"] } });
  assert.equal(notice.ok, true);
  assert.equal(notice.failed.length, 2);
  assert.match(notice.markdown, /nur Hinweis/);
  // Fehlende Browser-Ergebnisse oder ein roter Test: rot.
  const red = buildReport({ now: new Date("2026-10-06T19:05:00Z"), base: "u", api, pw: [{ ...pw[0], status: "fail", detail: "x" }] });
  assert.equal(red.ok, false);
  assert.match(red.markdown, /Sentry: nicht verfügbar/);
});

test("Live-Check Playwright-Ergebnis wird gelesen (flaky = grün, übersprungen zählt nicht)", () => {
  const rows = parsePlaywright({
    suites: [
      {
        specs: [
          { title: "UI-01 Seite / lädt", tests: [{ projectName: "handy", status: "expected", results: [{ status: "passed" }] }] },
          { title: "UI-03 axe /", tests: [{ projectName: "handy", status: "skipped", results: [{ status: "skipped" }] }] },
          { title: "UI-05 Einheit", tests: [{ projectName: "desktop", status: "unexpected", results: [{ status: "failed", error: { message: "\u001b[31mexpect failed\u001b[0m\nmehr" } }] }] },
        ],
      },
    ],
  });
  assert.deepEqual(rows.map((r: { id: string; status: string }) => [r.id, r.status]), [["UI-01", "ok"], ["UI-05", "fail"]]);
  assert.equal(rows[1].detail, "expect failed");
});

test("Live-Check Status: Zeile aus der Annotation, Meldung erst beim zweiten roten Lauf", () => {
  const run = (conclusion: string, at: string) => ({ status: "completed", conclusion, updated_at: at, html_url: `https://run/${at}` });
  const ok = analyzeLiveCheck({ runs: [run("success", "2026-10-06T19:10:00Z")], note: "Live-Check 21:05: 42/42 grün" });
  assert.equal(ok.line, "Live-Check 21:05: 42/42 grün");
  assert.equal(ok.incident, null);
  const once = analyzeLiveCheck({ runs: [run("failure", "2026-10-06T19:10:00Z"), run("success", "2026-10-05T19:10:00Z")], note: "Live-Check 21:05: 40/42 ROT" });
  assert.equal(once.ok, false);
  assert.equal(once.incident, null);
  const twice = analyzeLiveCheck({ runs: [run("failure", "2026-10-06T20:10:00Z"), run("failure", "2026-10-06T19:10:00Z")] });
  assert.match(twice.incident!.text, /zweimal rot/);
  assert.match(twice.line, /ROT/);
  assert.equal(analyzeLiveCheck({ runs: [] }).line, "Live-Check: noch keiner gelaufen");
});

test("Checkliste und Prüfungen gehören zusammen: jede Kennung steht an beiden Orten", () => {
  const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  const list = read("docs/ops/live-checkliste.md");
  const code = read("scripts/autonomy/live-check.mjs") + read("live/live.spec.ts");
  const ids = (text: string) => new Set(text.match(/\b(?:API|UI|LH|SE)-\d{2}\b/g) ?? []);
  const inList = ids(list);
  const inCode = ids(code);
  // UI-02 (Konsole) steckt in UI-01 und hat keine eigene Prüfung.
  const missingInCode = [...inList].filter((i) => !inCode.has(i) && i !== "UI-02");
  const missingInList = [...inCode].filter((i) => !inList.has(i));
  assert.deepEqual(missingInCode, [], "In der Checkliste, aber nicht geprüft");
  assert.deepEqual(missingInList, [], "Geprüft, aber nicht in der Checkliste");
});
