/**
 * Live-Check nach dem Deploy (SIN-319). Drei Befehle, die der Workflow `nach-deploy.yml` nacheinander aufruft:
 *
 *   node scripts/autonomy/live-check.mjs api    --base <URL> --out live-ergebnis/api.json
 *   node scripts/autonomy/live-check.mjs sentry --since <ISO> --out live-ergebnis/sentry.json   (nur mit SENTRY_*-Werten)
 *   node scripts/autonomy/live-check.mjs report --base <URL> [--api …] [--pw …] [--sentry …] [--lighthouse ok|fail|skipped]
 *
 * Die Checkliste steht in docs/ops/live-checkliste.md (Kennungen API-xx, UI-xx, …). Jede Kennung dort kommt hier
 * oder in live/live.spec.ts vor; ein Unit-Test hält beides zusammen. Es werden nur lesende Abrufe und Aufrufe mit
 * Test-Kennung gemacht, nie echte Nutzerdaten verändert.
 * Reine Funktionen (`runApiChecks`, `buildReport`, `analyzeLiveCheck`) sind getestet; nur `main` und `collectLiveCheck` sprechen mit dem Netz.
 */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

/** Kennungen, deren Rot nur ein Hinweis ist: kein Revert (Messwerte schwanken, Sentry kennt Altfehler). */
export const NOTICE_ONLY = new Set(["LH-01", "SE-01"]);

/** Test-UUID für den Live-Check. Muss eine gültige UUID sein (Supabase erkennt nur UUIDs). */
export const LIVECHECK_ANON_ID = "f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0";

const hhmm = (d) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(d);

/**
 * Prüft die API der laufenden App. `fetchImpl` ist austauschbar (Tests).
 * @returns {Promise<{ id: string, name: string, ok: boolean, detail: string }[]>}
 */
export async function runApiChecks(base, fetchImpl = fetch) {
  const url = (p) => `${base.replace(/\/$/, "")}${p}`;
  const call = async (path, init = {}) => {
    try {
      const res = await fetchImpl(url(path), { signal: AbortSignal.timeout(20_000), ...init });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {}
      return { status: res.status, json, text };
    } catch (e) {
      return { status: 0, json: null, text: String(e?.message ?? e) };
    }
  };
  const post = (path, body) => call(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const out = [];
  const check = (id, name, ok, detail) => out.push({ id, name, ok: Boolean(ok), detail: ok ? "" : String(detail).slice(0, 160) });

  const health = await call("/api/health");
  check("API-01", "/api/health inkl. Datenbank", health.status === 200 && health.json?.ok === true && health.json?.db !== "unreachable", `HTTP ${health.status}, db=${health.json?.db ?? "?"}: ${health.text.slice(0, 80)}`);

  const phaseA = await call("/api/learner/phase-a");
  const units = phaseA.json?.units;
  // Mock-Speicher (lokaler Lauf ohne Supabase) hat keinen Kurs; Production muss Einheiten liefern.
  const mock = health.json?.storage === "mock";
  check("API-02", "/api/learner/phase-a liefert Kurs mit Einheiten", phaseA.status === 200 && Boolean(phaseA.json?.courseId) && (mock || (Array.isArray(units) && units.length > 0)), `HTTP ${phaseA.status}, Einheiten: ${Array.isArray(units) ? units.length : "?"}, Quelle: ${phaseA.json?.source ?? "?"}`);

  const courseId = phaseA.json?.courseId;
  const path = courseId ? await call(`/api/courses/${encodeURIComponent(courseId)}/lernpfad`) : { status: 0, json: null, text: "keine Kurs-ID aus phase-a" };
  check("API-03", "Kurs- und Einheiten-Abruf (Lernpfad)", (path.status === 200 && Array.isArray(path.json?.units)) || (mock && path.status === 404),`HTTP ${path.status}: ${path.text.slice(0, 80)}`);
  // Mock-Speicher (kein Supabase) liefert leere Listen; dann zählt nur, dass die Antwort stimmt.
  check("API-04", "Einheiten enthalten Quelle und Abrufdatum", !Array.isArray(units) || units.length === 0 || units.slice(0, 5).every((u) => (u.sourceUrl || u.questions?.[0]?.sourceUrl) && (u.sourceFetchedAt || u.questions?.[0]?.sourceFetchedAt || phaseA.json?.publishedAt)), "Einheit ohne Quelle");

  const saved = await post("/api/progress", { anonymousId: LIVECHECK_ANON_ID, questionId: "live-check", correct: true });
  check("API-05", "Fortschritt speichern (Test-UUID)", saved.status === 201, `HTTP ${saved.status}: ${saved.text.slice(0, 80)}`);
  const bad = await post("/api/progress", {});
  check("API-06", "Fortschritt ohne Kennung wird abgelehnt (400)", bad.status === 400, `HTTP ${bad.status}`);

  // Honigtopf-Feld: Die Route antwortet „ok“ und speichert nichts, es geht keine Meldung raus.
  const demo = await post("/api/demo", { website: "live-check" });
  check("API-07", "Demo-Anfrage (Testmodus, kein Versand)", demo.status === 201, `HTTP ${demo.status}: ${demo.text.slice(0, 80)}`);

  const trainer = await call("/api/ausbilder/gruppe");
  check("API-08", "Ausbilder-API ohne Anmeldung: 401/503, nie Daten", trainer.status === 401 || trainer.status === 503, `HTTP ${trainer.status}`);
  return out;
}

/** Playwright-JSON (`live-ergebnis/ergebnis.json`) → eine Zeile je Test: Kennung, Titel, Fenstergröße, Ergebnis. */
export function parsePlaywright(json) {
  const rows = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const last = t.results?.[t.results.length - 1];
        const status = t.status === "skipped" || last?.status === "skipped" ? "skipped" : t.status === "expected" || t.status === "flaky" ? "ok" : "fail";
        const err = (last?.error?.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n").find((l) => l.trim()) ?? "";
        rows.push({ id: /^([A-Z]+-\d+)/.exec(spec.title)?.[1] ?? "UI-??", name: spec.title.replace(/^[A-Z]+-\d+ /, ""), project: t.projectName, status, detail: err.slice(0, 160) });
      }
    }
    for (const s of suite.suites ?? []) walk(s);
  };
  for (const s of json?.suites ?? []) walk(s);
  return rows.filter((r) => r.status !== "skipped");
}

/** Sentry: neue Fehler seit `since` (Zeitpunkt des Deploys). Ohne Zugang → null („nicht verfügbar“). */
export async function collectSentryNew(since, env = process.env, fetchImpl = fetch) {
  if (!env.SENTRY_AUTH_TOKEN || !env.SENTRY_ORG || !env.SENTRY_PROJECT) return null;
  const base = env.SENTRY_BASE_URL || "https://de.sentry.io";
  const q = new URLSearchParams({ query: `is:unresolved firstSeen:>${since}`, limit: "25" });
  const res = await fetchImpl(`${base}/api/0/projects/${encodeURIComponent(env.SENTRY_ORG)}/${encodeURIComponent(env.SENTRY_PROJECT)}/issues/?${q}`, {
    headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Sentry HTTP ${res.status}`);
  const list = await res.json();
  return { count: list.length, titles: list.slice(0, 5).map((i) => String(i.title).slice(0, 80)) };
}

/**
 * Bericht aus allen Teilergebnissen. Rot zählt nur bei Prüfungen, die nicht „nur Hinweis“ sind.
 * @param {{ now: Date, base: string, api: {id:string,name:string,ok:boolean,detail:string}[], pw: ReturnType<typeof parsePlaywright>, lighthouse?: string, sentry?: {count:number,titles:string[]}|null|undefined }} p
 */
export function buildReport({ now, base, api, pw, lighthouse = "skipped", sentry }) {
  /** @type {{ id: string, name: string, ok: boolean, detail: string }[]} */
  const items = [
    ...api,
    ...pw.map((r) => ({ id: r.id, name: `${r.name} (${r.project})`, ok: r.status === "ok", detail: r.detail })),
  ];
  if (lighthouse !== "skipped") items.push({ id: "LH-01", name: "Lighthouse-Kurzlauf Startseite und Lernpfad", ok: lighthouse === "ok", detail: "unter Schwelle 0,9, siehe Lauf-Protokoll" });
  if (sentry) items.push({ id: "SE-01", name: "Sentry: keine neuen Fehler seit dem Deploy", ok: sentry.count === 0, detail: `${sentry.count} neu: ${sentry.titles.join("; ")}` });
  const failed = items.filter((i) => !i.ok);
  const red = failed.filter((i) => !NOTICE_ONLY.has(i.id));
  const green = items.length - failed.length;
  // Rote Kennungen (je Kennung einmal, höchstens 5) gehören in die Annotation, damit Status-Seite und Agenten sie sehen (SIN-391).
  const ids = [...new Set(red.map((i) => i.id))];
  const named = ids.length ? ` (${ids.slice(0, 5).join(", ")}${ids.length > 5 ? ` +${ids.length - 5} weitere` : ""})` : "";
  const summary = `Live-Check ${hhmm(now)}: ${green}/${items.length} ${red.length ? "ROT" : "grün"}${named}`;
  const lines = [
    `# ${summary}`,
    "",
    `Geprüft: ${base} · ${now.toISOString()}`,
    "",
    ...items.map((i) => `- [${i.ok ? "x" : " "}] ${i.id} ${i.name}${i.ok ? "" : ` — ${i.detail || "fehlgeschlagen"}${NOTICE_ONLY.has(i.id) ? " (nur Hinweis)" : ""}`}`),
  ];
  if (sentry === undefined) lines.push("- Sentry: nicht verfügbar (kein Zugang im Workflow)");
  if (lighthouse === "skipped") lines.push("- Lighthouse: nicht gelaufen");
  return { summary, markdown: lines.join("\n"), failed, red, ok: red.length === 0, total: items.length, green };
}

// ---------- Status-Seite und Tages-Update ----------

const NOTE_RE = /^Live-Check (\d{2}:\d{2}): (\d+)\/(\d+) (grün|ROT)(?: \((.+)\))?/;

/**
 * Letzter Live-Check für Status-Seite und Tages-Update. Quelle: Läufe von `nach-deploy.yml`; der Lauf schreibt das
 * Ergebnis als Annotation „Live-Check hh:mm: n/m grün“ in den Job (wie bei der Sicherung, SIN-293).
 * @param {{ runs: { status: string, conclusion: string|null, updated_at: string, html_url: string }[], note?: string }} p neueste Läufe zuerst
 */
export function analyzeLiveCheck({ runs, note = "" }) {
  const done = runs.filter((r) => r.status === "completed" && r.conclusion !== "cancelled" && r.conclusion !== "skipped");
  const last = done[0];
  if (!last) return { line: "Live-Check: noch keiner gelaufen", ok: true, incident: null };
  const m = NOTE_RE.exec(String(note));
  const text = m ? `Live-Check ${m[1]}: ${m[2]}/${m[3]} ${m[4]}${m[5] ? ` (${m[5]})` : ""}` : `Live-Check ${last.updated_at.slice(11, 16)} UTC: ${last.conclusion === "success" ? "grün" : "ROT"}`;
  const ok = last.conclusion === "success";
  // Eine Aufgabe für Sinan nur, wenn der Revert nicht geholfen hat: der Lauf davor war schon rot.
  const twice = !ok && done[1] && done[1].conclusion !== "success";
  return {
    line: ok ? text : `${text} ([Lauf](${last.html_url}))`,
    ok,
    incident: twice ? { key: `live-check-red:${last.html_url}`, text: `Live-Check zweimal rot, der Revert hat nicht geholfen: ${last.html_url}` } : null,
  };
}

/** Liest die letzten Läufe und die Annotation des neuesten. Fehler → null („nicht lesbar“). */
export async function collectLiveCheck(repo, call) {
  try {
    const { workflow_runs } = await call(`/repos/${repo}/actions/workflows/nach-deploy.yml/runs?per_page=5`);
    const runs = workflow_runs.map((r) => ({ id: r.id, status: r.status, conclusion: r.conclusion, updated_at: r.updated_at, html_url: r.html_url }));
    const last = runs.find((r) => r.status === "completed" && r.conclusion !== "cancelled" && r.conclusion !== "skipped");
    let note = "";
    if (last) {
      const { jobs } = await call(`/repos/${repo}/actions/runs/${last.id}/jobs?per_page=10`);
      for (const job of jobs) {
        const notes = await call(`/repos/${repo}/check-runs/${job.id}/annotations`);
        note = notes.map((n) => n.message ?? "").find((t) => NOTE_RE.test(t)) ?? note;
      }
    }
    return analyzeLiveCheck({ runs, note });
  } catch {
    return null;
  }
}

// ---------- Befehlszeile ----------

const arg = (args, name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const writeJson = (file, data) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
};
const readJson = (file) => (file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);

export async function main(argv = process.argv.slice(2), env = process.env) {
  const [cmd, ...args] = argv;
  const base = arg(args, "--base") ?? env.LIVE_BASE_URL;
  if (cmd === "api") {
    if (!base) throw new Error("--base fehlt");
    const results = await runApiChecks(base);
    for (const r of results) console.log(`${r.ok ? "OK    " : "FEHLER"} ${r.id} ${r.name}${r.ok ? "" : ` — ${r.detail}`}`);
    writeJson(arg(args, "--out") ?? "live-ergebnis/api.json", results);
    return 0;
  }
  if (cmd === "sentry") {
    const since = arg(args, "--since") ?? new Date(Date.now() - 15 * 60_000).toISOString();
    const result = await collectSentryNew(since, env).catch((e) => {
      console.log(`::warning::Sentry nicht lesbar: ${e.message}`);
      return null;
    });
    writeJson(arg(args, "--out") ?? "live-ergebnis/sentry.json", result);
    return 0;
  }
  if (cmd === "report") {
    const now = new Date(arg(args, "--now") ?? Date.now());
    const pwJson = readJson(arg(args, "--pw") ?? "live-ergebnis/ergebnis.json");
    const report = buildReport({
      now,
      base: base ?? "?",
      api: readJson(arg(args, "--api") ?? "live-ergebnis/api.json") ?? [],
      pw: pwJson ? parsePlaywright(pwJson) : [{ id: "UI-00", name: "Browser-Prüfungen haben kein Ergebnis geliefert", project: "-", status: "fail", detail: "ergebnis.json fehlt" }],
      lighthouse: arg(args, "--lighthouse") ?? "skipped",
      sentry: readJson(arg(args, "--sentry") ?? "live-ergebnis/sentry.json") ?? undefined,
    });
    console.log(report.markdown);
    writeFileSync(arg(args, "--md") ?? "live-ergebnis/bericht.md", report.markdown);
    // Annotation für Status-Seite und Tages-Update (collectLiveCheck liest sie), Zusammenfassung für den Lauf.
    console.log(`::${report.ok ? "notice" : "error"}::${report.summary}`);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${report.markdown}\n`);
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `summary=${report.summary}\nok=${report.ok}\n`);
    return report.ok ? 0 : 1;
  }
  throw new Error("Befehl: api | sentry | report");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e.message);
      process.exit(2);
    },
  );
}
