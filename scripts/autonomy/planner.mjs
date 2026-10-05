#!/usr/bin/env node
/**
 * Planer (SIN-223, SIN-227), wöchentlich. Ersetzt den Frontend-Agent aus PRODUCT.md.
 *
 *   node scripts/autonomy/planner.mjs --context [--dry-run] [--out prompt.md]
 *       sammelt Definition fertig, offene Linear-Issues, Kennzahlen und die Produktreife-Tabelle, schreibt den Prompt
 *   node scripts/autonomy/planner.mjs --create plan.json [--dry-run]
 *       prüft den Plan (je Spur max. 3, 1 Design-Paket, Akzeptanzkriterien, Priorität), legt Linear-Issues als
 *       Todo an (Label je Spur, Design blockiert das Frontend-Issue). Ist die Produktreife grün, legt er
 *       das Issue „Produkt-Abnahme MAF Metall“ für Sinan an und plant bis zur Antwort nur Fehler und Content.
 *
 * Kennzahlen ohne Zugang (Supabase, PostHog, Sentry, Kosten, Figma) stehen als „nicht verfügbar“ im Prompt.
 * Dry-Run: nur lesen, nichts in Linear anlegen.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { LANES, fetchProjectIssues, linear, linearTeamAndProject, stateIdByName } from "./linear.mjs";
import { DEFAULT_FILE_KEY, diffColorTokens } from "./figma.mjs";
import {
  ABNAHME_TITLE,
  DEFAULT_GOLDSET_TARGET,
  abnahmeIssue,
  evaluateReadiness,
  expectedFrames,
  fetchFigmaFrames,
  figmaFileKey,
  inMaintenanceMode,
  renderReadiness,
} from "./readiness.mjs";

export const MAX_PER_LANE = 3;
export const MAX_DESIGN_PER_WEEK = 1;
/** Höchstens 3 je Spur (zusammen 9); dazu höchstens 1 Design-Paket. */
export const MAX_ISSUES_PER_WEEK = MAX_PER_LANE * LANES.length;
export const PLAN_LANES = [...LANES, "design"];
/** Pflege-Modus: nur Fehler (Backend) und Content. */
export const MAINTENANCE_LANES = ["backend", "content"];
export const READINESS_FILE = "docs/product-readiness.json";

/** Abschnitt `## <Überschrift>` aus einem Markdown-Dokument (ohne die Überschrift). */
export function extractSection(markdown, heading) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = markdown.match(new RegExp(`^## ${esc}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  return m ? m[1].trim() : "";
}

/** Abschnitt „Definition fertig“ aus PRODUCT.md. */
export const extractDefinition = (markdown) => extractSection(markdown, "Definition fertig");

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
    bestehensquote_pct: "nicht verfügbar",
    kosten_pro_lauf: "nicht verfügbar (Ledger/Langfuse nicht angebunden)",
    posthog: "nicht verfügbar",
    sentry: "nicht verfügbar",
    sentry_kritisch: "nicht verfügbar",
  };
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
    try {
      m.einheiten = await supabaseCount("units?select=id", h, env.SUPABASE_URL);
      const total = await supabaseCount("question_quality_latest?select=question_id", h, env.SUPABASE_URL);
      const passed = await supabaseCount("question_quality_latest?select=question_id&passed=eq.true", h, env.SUPABASE_URL);
      m.fragen_bewertet = total;
      m.bestehensquote = total ? `${Math.round((passed / total) * 100)} %` : "keine Bewertungen";
      if (total) m.bestehensquote_pct = Math.round((passed / total) * 100);
    } catch (e) {
      m.einheiten = `Fehler: ${e.message}`;
    }
  }
  if (env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT) {
    const sentry = async (query) => {
      const url = `https://de.sentry.io/api/0/projects/${env.SENTRY_ORG}/${env.SENTRY_PROJECT}/issues/?query=${encodeURIComponent(query)}&statsPeriod=7d&limit=25`;
      return fetch(url, { headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` } });
    };
    try {
      const res = await sentry("is:unresolved");
      m.sentry = res.ok ? `${(await res.json()).length} ungelöste Fehler (7 Tage)` : `Fehler: HTTP ${res.status}`;
      // Kritisch = Level error oder fatal (Suchsyntax nicht live geprüft, siehe D-42).
      const crit = await sentry("is:unresolved level:[error,fatal]");
      if (crit.ok) m.sentry_kritisch = (await crit.json()).length;
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
  m.figma_abgleich = await figmaTokenMetric(env);
  return m;
}

/** Abgleich Code ↔ Figma (SIN-239): Token-Farben aus docs/design/tokens.json gegen die Figma-Datei. */
export async function figmaTokenMetric(env = process.env, fetchImpl = fetch) {
  if (!env.FIGMA_ACCESS_TOKEN) return "nicht verfügbar";
  try {
    const tokens = JSON.parse(readFileSync("docs/design/tokens.json", "utf8"));
    const diff = await diffColorTokens(tokens, tokens.meta?.figmaFileKey ?? DEFAULT_FILE_KEY, env, fetchImpl);
    return diff.length ? `Abweichung, Token-Farben ohne Figma-Entsprechung: ${diff.join(", ")}` : "keine Abweichung";
  } catch (e) {
    return `Fehler: ${e.message}`;
  }
}

/** Produktreife-Zeilen aus Kennzahlen, offenen Issues, Bestätigungsdatei und (mit Token) Figma. */
export async function assessReadiness({ metrics, issues, env = process.env, read = readFileSync }) {
  const file = existsSync(READINESS_FILE) ? JSON.parse(read(READINESS_FILE, "utf8")) : {};
  const figmaMd = existsSync("docs/design/FIGMA.md") ? read("docs/design/FIGMA.md", "utf8") : "";
  const rows = evaluateReadiness({
    metrics,
    issues,
    confirmations: file.bestaetigt ?? {},
    goldsetTarget: file.goldsetTarget ?? DEFAULT_GOLDSET_TARGET,
    figma: await fetchFigmaFrames(figmaFileKey(figmaMd), env),
    expected: expectedFrames(figmaMd),
  });
  return { rows, abnahme: file.abnahme ?? null };
}

export function buildPlannerPrompt({ definition, issues, metrics, readiness = "", maintenance = false }) {
  return [
    "Du bist der Planer für die Content-Agent-Lernapp (Regeln: AGENTS.md).",
    "Ziel: ein fertiges Produkt mit einem Modul (MAF Metall komplett), kein MVP. Vergleiche den Ist-Stand mit der Definition fertig und der Produktreife-Tabelle.",
    `Plane getrennt nach drei Spuren, je Spur höchstens ${MAX_PER_LANE} neue Linear-Issues (zusammen höchstens ${MAX_ISSUES_PER_WEEK}):`,
    "- frontend: Lern-Erlebnis, Screens, Motivation (Serie, Tagesziel, Wiederholung), Barrierefreiheit, Offline. Kennzahlen: Lighthouse, axe, PostHog-Abbrüche, Figma-Abgleich.",
    "- content: Abdeckung, Qualität, neue Berufe (nur mit amtlicher Quelle).",
    "- backend: Pipeline, Datenmodell, Kosten, Stabilität, Sentry-Fehler, Skalierung.",
    "Keine Duplikate zu offenen Issues. Pro Issue: ein Arbeitspaket, ein PR. Kein Inhalt ohne amtliche Quelle, keine Personendaten.",
    "",
    "Figma zuerst (SIN-239):",
    "- Ohne Design-Issue: Änderungen, die nur vorhandene Figma-Komponenten und Tokens nutzen (Zustände, Texte, Abstände, Varianten bestehender Screens, Fehler-/Leer-/Ladezustände nach Screen 17). Dann `needsDesign: false`.",
    "- Design nötig (`needsDesign: true`): neue Screens, neue Komponenten, neue Farben/Tokens, geänderte Navigation. Setze `blockedBy` auf den Titel eines Design-Eintrags im Plan (oder eine offene Kennung wie SIN-123).",
    `- Bündle alle Design-Arbeiten zu höchstens ${MAX_DESIGN_PER_WEEK} Design-Paket pro Woche (\`lane: "design"\`, Label \`design\`, Backlog bis Sinan die Sitzung macht, kein Dispatcher-Lauf).`,
    "- Agenten erfinden keine Komponenten im Code. Weicht der Code von Figma ab (Kennzahl `figma_abgleich`), plane die Abweichung als Issue.",
    ...(maintenance
      ? [
          "",
          "**Pflege-Modus:** Die Produktreife ist grün, die Abnahme durch Sinan steht aus. Plane NUR Fehler (backend) und Content. Keine frontend- oder design-Einträge.",
        ]
      : []),
    "",
    "## Definition fertig (docs/PRODUCT.md)",
    definition || "(Abschnitt fehlt)",
    "",
    "## Produktreife MAF Metall (docs/PRODUCT.md)",
    readiness || "(nicht geprüft)",
    "",
    "## Offene Linear-Issues",
    ...(issues.length ? issues.map((i) => `- ${i.identifier} [${i.state.name}, Prio ${i.priority}] ${i.title}`) : ["(keine)"]),
    "",
    "## Kennzahlen",
    ...Object.entries(metrics).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Ausgabe",
    'Schreibe nur die Datei plan.json im Repo-Wurzelverzeichnis: [{"lane": "frontend|content|backend|design", "title": "...", "description": "...", "acceptance": ["..."], "priority": 1-4, "needsDesign": false, "blockedBy": "Titel oder SIN-123"}].',
    "`needsDesign` und `blockedBy` nur bei Frontend-Issues, die ein Design-Paket brauchen (siehe oben). Priorität wie in Linear: 1 dringend, 2 hoch, 3 mittel, 4 niedrig. Danach nichts weiter tun.",
  ].join("\n");
}

/**
 * Prüft den Plan des Modells. Wirft bei ungültigen Einträgen, kürzt je Spur auf MAX_PER_LANE
 * (Design: MAX_DESIGN_PER_WEEK). Im Pflege-Modus bleiben nur MAINTENANCE_LANES.
 * @returns {{ lane: string, title: string, priority: number, description: string, labels: string[], needsDesign?: boolean, blockedBy?: string }[]}
 */
export function validatePlan(plan, existingTitles = [], { maintenance = false } = {}) {
  if (!Array.isArray(plan)) throw new Error("Plan muss eine Liste sein");
  const taken = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  const planTitles = new Set(plan.map((p) => String(p?.title ?? "").trim().toLowerCase()));
  const count = {};
  const out = [];
  for (const [i, p] of plan.entries()) {
    if (!p?.title || typeof p.title !== "string") throw new Error(`Eintrag ${i}: title fehlt`);
    if (!PLAN_LANES.includes(p.lane)) throw new Error(`Eintrag ${i}: lane muss ${PLAN_LANES.join(", ")} sein`);
    if (!Array.isArray(p.acceptance) || p.acceptance.length === 0) throw new Error(`Eintrag ${i}: Akzeptanzkriterien fehlen`);
    if (![1, 2, 3, 4].includes(p.priority)) throw new Error(`Eintrag ${i}: priority muss 1 bis 4 sein`);
    const blockedBy = typeof p.blockedBy === "string" ? p.blockedBy.trim() : "";
    if (p.needsDesign) {
      if (p.lane !== "frontend") throw new Error(`Eintrag ${i}: needsDesign nur für frontend`);
      const known = /^SIN-\d+$/.test(blockedBy) || planTitles.has(blockedBy.toLowerCase());
      if (!known) throw new Error(`Eintrag ${i}: needsDesign braucht blockedBy (Design-Eintrag im Plan oder SIN-Kennung)`);
    }
    if (taken.has(p.title.trim().toLowerCase())) continue;
    if (maintenance && !MAINTENANCE_LANES.includes(p.lane)) continue;
    const cap = p.lane === "design" ? MAX_DESIGN_PER_WEEK : MAX_PER_LANE;
    if ((count[p.lane] = (count[p.lane] ?? 0) + 1) > cap) continue;
    out.push({
      lane: p.lane,
      title: p.title.trim(),
      priority: p.priority,
      labels: p.lane === "design" ? ["design", "frontend"] : [p.lane],
      ...(p.lane === "frontend" ? { needsDesign: Boolean(p.needsDesign) } : {}),
      ...(p.needsDesign ? { blockedBy } : {}),
      description: `${p.description ?? ""}${
        p.lane === "design" ? "\n\nWird in einer Claude-Sitzung mit Figma-Connector erledigt (nicht vom Dispatcher). Danach Frame zur Freigabe in docs/design/." : ""
      }\n\n## Akzeptanzkriterien\n${p.acceptance.map((a) => `- [ ] ${a}`).join("\n")}`.trim(),
    });
  }
  // Design zuerst, damit es beim Anlegen schon existiert, wenn das Frontend-Issue darauf wartet.
  return out.sort((a, b) => Number(b.lane === "design") - Number(a.lane === "design"));
}

async function labelId(teamId, name, cache, call) {
  if (cache.has(name)) return cache.get(name);
  const found = await call(`query($t: ID!, $n: String!) { issueLabels(filter: { team: { id: { eq: $t } }, name: { eqIgnoreCase: $n } }) { nodes { id } } }`, { t: teamId, n: name });
  let id = found.issueLabels.nodes[0]?.id;
  if (!id) {
    const made = await call(`mutation($i: IssueLabelCreateInput!) { issueLabelCreate(input: $i) { issueLabel { id } } }`, { i: { teamId, name } });
    id = made.issueLabelCreate.issueLabel.id;
  }
  cache.set(name, id);
  return id;
}

/** Legt die Issues an; `blockedBy` (Titel aus dem Plan oder SIN-Kennung) wird als „blockiert durch“ verknüpft. */
export async function createIssues(items, existing = [], call = linear) {
  const { teamId, projectId } = await linearTeamAndProject(call);
  const stateId = await stateIdByName(teamId, "Todo", call);
  const labels = new Map();
  const created = new Map(); // Titel (klein) → Issue-ID
  for (const it of items) {
    const labelIds = await Promise.all((it.labels ?? []).map((n) => labelId(teamId, n, labels, call)));
    const data = await call(
      `mutation($i: IssueCreateInput!) { issueCreate(input: $i) { issue { id identifier url } } }`,
      { i: { teamId, projectId, stateId, title: it.title, description: it.description, priority: it.priority, labelIds } },
    );
    const issue = data.issueCreate.issue;
    created.set(it.title.toLowerCase(), issue.id);
    console.log(`Angelegt: ${issue.identifier} ${issue.url}`);
    if (it.blockedBy) {
      const blockerId = created.get(it.blockedBy.toLowerCase()) ?? existing.find((e) => e.identifier === it.blockedBy)?.id;
      if (!blockerId) throw new Error(`${issue.identifier}: Blocker „${it.blockedBy}“ nicht gefunden`);
      await call(
        `mutation($i: IssueRelationCreateInput!) { issueRelationCreate(input: $i) { success } }`,
        { i: { issueId: blockerId, relatedIssueId: issue.id, type: "blocks" } },
      );
    }
  }
}

export async function main(argv) {
  const dry = argv.includes("--dry-run");
  const arg = (name) => argv[argv.indexOf(name) + 1];
  const issues = process.env.LINEAR_API_KEY ? await fetchProjectIssues(linear) : null;

  if (argv.includes("--context")) {
    const metrics = await collectMetrics();
    const { rows, abnahme } = await assessReadiness({ metrics, issues });
    const definition = extractSection(readFileSync("docs/PRODUCT.md", "utf8"), "Definition fertig");
    const prompt = buildPlannerPrompt({
      definition,
      issues: issues ?? [],
      metrics,
      readiness: renderReadiness(rows),
      maintenance: inMaintenanceMode(rows, abnahme),
    });
    if (argv.includes("--out")) writeFileSync(arg("--out"), prompt);
    else console.log(prompt);
    return;
  }

  if (argv.includes("--create")) {
    const plan = JSON.parse(readFileSync(arg("--create"), "utf8"));
    const existingTitles = (issues ?? []).map((i) => i.title);
    const { rows, abnahme } = await assessReadiness({ metrics: await collectMetrics(), issues });
    const maintenance = inMaintenanceMode(rows, abnahme);
    const items = validatePlan(plan, existingTitles, { maintenance });
    if (maintenance && !existingTitles.includes(ABNAHME_TITLE)) items.push({ ...abnahmeIssue(rows), lane: "abnahme" });
    console.log(`Produktreife\n\n${renderReadiness(rows)}\n\n${maintenance ? "Pflege-Modus: nur Fehler und Content.\n" : ""}`);
    if (dry) {
      for (const it of items) console.log(`[dry-run] ${it.lane} P${it.priority} ${it.title}${it.lane === "frontend" ? (it.needsDesign ? " [Design nötig]" : " [ohne Design]") : ""}${it.blockedBy ? ` (blockiert durch: ${it.blockedBy})` : ""}`);
      return;
    }
    await createIssues(items, issues ?? []);
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
