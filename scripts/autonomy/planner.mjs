#!/usr/bin/env node
/**
 * Planer (SIN-223), wöchentlich. Ersetzt den Frontend-Agent aus PRODUCT.md.
 *
 *   node scripts/autonomy/planner.mjs --context [--dry-run] [--out prompt.md]
 *       sammelt Definition fertig, offene Linear-Issues und Kennzahlen, schreibt den Prompt
 *   node scripts/autonomy/planner.mjs --create plan.json [--dry-run]
 *       prüft den Plan (max. 5, Akzeptanzkriterien, Priorität) und legt Linear-Issues als Todo an
 *
 * Kennzahlen ohne Zugang (Supabase, PostHog, Sentry, Kosten) stehen als „nicht verfügbar“ im Prompt.
 * Dry-Run: nur lesen, nichts in Linear anlegen.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fetchProjectIssues, linear, linearTeamAndProject, stateIdByName } from "./linear.mjs";

export const MAX_ISSUES_PER_WEEK = 5;

/** Abschnitt „Definition fertig“ aus PRODUCT.md. */
export function extractDefinition(markdown) {
  const m = markdown.match(/^## Definition fertig\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m);
  return m ? m[1].trim() : "";
}

async function supabaseCount(path, headers, base) {
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: { ...headers, Prefer: "count=exact", Range: "0-0" } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return Number(res.headers.get("content-range")?.split("/")[1]);
}

export async function collectMetrics(env = process.env) {
  const m = {
    einheiten: "nicht verfügbar",
    fragen_bewertet: "nicht verfügbar",
    bestehensquote: "nicht verfügbar",
    kosten_pro_lauf: "nicht verfügbar (Ledger/Langfuse nicht angebunden)",
    posthog: "nicht verfügbar",
    sentry: "nicht verfügbar",
  };
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
    try {
      m.einheiten = await supabaseCount("units?select=id", h, env.SUPABASE_URL);
      const total = await supabaseCount("question_quality_latest?select=question_id", h, env.SUPABASE_URL);
      const passed = await supabaseCount("question_quality_latest?select=question_id&passed=eq.true", h, env.SUPABASE_URL);
      m.fragen_bewertet = total;
      m.bestehensquote = total ? `${Math.round((passed / total) * 100)} %` : "keine Bewertungen";
    } catch (e) {
      m.einheiten = `Fehler: ${e.message}`;
    }
  }
  if (env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT) {
    try {
      const res = await fetch(
        `https://de.sentry.io/api/0/projects/${env.SENTRY_ORG}/${env.SENTRY_PROJECT}/issues/?query=is:unresolved&statsPeriod=7d&limit=25`,
        { headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` } },
      );
      m.sentry = res.ok ? `${(await res.json()).length} ungelöste Fehler (7 Tage)` : `Fehler: HTTP ${res.status}`;
    } catch (e) {
      m.sentry = `Fehler: ${e.message}`;
    }
  }
  if (env.POSTHOG_PERSONAL_API_KEY && env.POSTHOG_PROJECT_ID) {
    try {
      const res = await fetch(`https://eu.posthog.com/api/projects/${env.POSTHOG_PROJECT_ID}/query/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: "select event, count() from events where timestamp > now() - interval 7 day and event in ('unit_started','unit_completed','question_answered') group by event",
          },
        }),
      });
      m.posthog = res.ok ? JSON.stringify((await res.json()).results) : `Fehler: HTTP ${res.status}`;
    } catch (e) {
      m.posthog = `Fehler: ${e.message}`;
    }
  }
  return m;
}

export function buildPlannerPrompt({ definition, issues, metrics }) {
  return [
    "Du bist der Planer für die Content-Agent-Lernapp (Regeln: AGENTS.md).",
    `Vergleiche den Ist-Stand mit der Definition fertig und schlage höchstens ${MAX_ISSUES_PER_WEEK} neue Linear-Issues vor.`,
    "Keine Duplikate zu offenen Issues. Pro Issue: ein Arbeitspaket, ein PR. Kein Inhalt ohne amtliche Quelle, keine Personendaten.",
    "",
    "## Definition fertig (docs/PRODUCT.md)",
    definition || "(Abschnitt fehlt)",
    "",
    "## Offene Linear-Issues",
    ...(issues.length ? issues.map((i) => `- ${i.identifier} [${i.state.name}, Prio ${i.priority}] ${i.title}`) : ["(keine)"]),
    "",
    "## Kennzahlen",
    ...Object.entries(metrics).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Ausgabe",
    'Schreibe nur die Datei plan.json im Repo-Wurzelverzeichnis: [{"title": "...", "description": "...", "acceptance": ["..."], "priority": 1-4}].',
    "Priorität wie in Linear: 1 dringend, 2 hoch, 3 mittel, 4 niedrig. Danach nichts weiter tun.",
  ].join("\n");
}

/** Prüft den Plan des Modells. Wirft bei ungültigen Einträgen, kürzt auf das Wochenlimit. */
export function validatePlan(plan, existingTitles = []) {
  if (!Array.isArray(plan)) throw new Error("Plan muss eine Liste sein");
  const taken = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  const out = [];
  for (const [i, p] of plan.entries()) {
    if (!p?.title || typeof p.title !== "string") throw new Error(`Eintrag ${i}: title fehlt`);
    if (!Array.isArray(p.acceptance) || p.acceptance.length === 0) throw new Error(`Eintrag ${i}: Akzeptanzkriterien fehlen`);
    if (![1, 2, 3, 4].includes(p.priority)) throw new Error(`Eintrag ${i}: priority muss 1 bis 4 sein`);
    if (taken.has(p.title.trim().toLowerCase())) continue;
    out.push({
      title: p.title.trim(),
      priority: p.priority,
      description: `${p.description ?? ""}\n\n## Akzeptanzkriterien\n${p.acceptance.map((a) => `- [ ] ${a}`).join("\n")}`.trim(),
    });
  }
  return out.slice(0, MAX_ISSUES_PER_WEEK);
}

async function createIssues(items, call = linear) {
  const { teamId, projectId } = await linearTeamAndProject(call);
  const stateId = await stateIdByName(teamId, "Todo", call);
  for (const it of items) {
    const data = await call(
      `mutation($i: IssueCreateInput!) { issueCreate(input: $i) { issue { identifier url } } }`,
      { i: { teamId, projectId, stateId, title: it.title, description: it.description, priority: it.priority } },
    );
    console.log(`Angelegt: ${data.issueCreate.issue.identifier} ${data.issueCreate.issue.url}`);
  }
}

export async function main(argv) {
  const dry = argv.includes("--dry-run");
  const arg = (name) => argv[argv.indexOf(name) + 1];

  if (argv.includes("--context")) {
    const definition = extractDefinition(readFileSync("docs/PRODUCT.md", "utf8"));
    const issues = process.env.LINEAR_API_KEY ? await fetchProjectIssues(linear) : [];
    const prompt = buildPlannerPrompt({ definition, issues, metrics: await collectMetrics() });
    if (argv.includes("--out")) writeFileSync(arg("--out"), prompt);
    else console.log(prompt);
    return;
  }

  if (argv.includes("--create")) {
    const plan = JSON.parse(readFileSync(arg("--create"), "utf8"));
    const existing = process.env.LINEAR_API_KEY ? (await fetchProjectIssues(linear)).map((i) => i.title) : [];
    const items = validatePlan(plan, existing);
    if (dry) {
      for (const it of items) console.log(`[dry-run] P${it.priority} ${it.title}`);
      return;
    }
    await createIssues(items);
    return;
  }
  throw new Error("Aufruf: --context oder --create plan.json");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
