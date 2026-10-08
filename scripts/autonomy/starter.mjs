#!/usr/bin/env node
/**
 * Projekt-Starter (SIN-202): aus Name und Idee den Plan für ein neues Projekt bauen.
 *
 *   node scripts/autonomy/starter.mjs plan --name "Beleg Scanner" --idee "…" [--supabase geteilt|eigen|aus] [--ohne posthog,langfuse] [--json]
 *   node scripts/autonomy/starter.mjs sql --schema beleg
 *
 * Stand: nur Planung (trocken). Der Plan nennt je Schritt Dienst, Aktion, benötigte Konto-Tokens aus Infisical `plattform/prod/konten`
 * und die Prüfung, ob der Schritt schon erledigt ist (jeder Schritt ist wiederholbar). `--live` führt noch nichts aus:
 * erst wenn die Konto-Tokens in `/konten` liegen und der Loop eine Woche stabil lief (frühestens 12.10.2026).
 * Alles hier ist rein (keine Netzaufrufe, keine Werte von Geheimnissen).
 */
import { pathToFileURL } from "node:url";

/** Konto-Tokens in Infisical `plattform` / `prod` / `/konten`. Nur Namen. */
export const KONTO_TOKENS = [
  "GITHUB_PLATTFORM_TOKEN",
  "VERCEL_TOKEN",
  "SUPABASE_ACCESS_TOKEN",
  "SENTRY_AUTH_TOKEN",
  "POSTHOG_PERSONAL_API_KEY",
  "LINEAR_API_KEY",
  "INFISICAL_CLIENT_ID",
  "INFISICAL_CLIENT_SECRET",
  "CRONJOB_API_KEY",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
];

export const LINEAR_LABELS = ["claude", "design", "frontend", "content", "backend", "abnahme"];
export const OPTIONAL = ["supabase", "langfuse", "posthog"];
/** Free-Tier: höchstens 2 aktive Supabase-Projekte je Organisation (vor dem Anlegen prüfen). */
export const SUPABASE_FREE_MAX = 2;

export const slugify = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Postgres-Schemaname: Kleinbuchstaben, Ziffern, Unterstrich; nie ein reservierter Name. */
const RESERVED = new Set(["public", "auth", "storage", "extensions", "graphql", "graphql_public", "realtime", "vault", "pgsodium", "supabase_functions", "cron", "net"]);
export function schemaName(slug) {
  const s = String(slug ?? "").replace(/-/g, "_");
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(s) || RESERVED.has(s) || s.startsWith("pg_")) throw new Error(`Ungültiger Schemaname: ${s}`);
  return s;
}

/** Prüft die Eingabe; liefert normalisierte Werte oder wirft mit klarer Meldung. */
export function normalizeInput(raw) {
  const name = String(raw?.name ?? "").trim();
  const idee = String(raw?.idee ?? "").trim();
  const slug = slugify(name);
  if (slug.length < 2 || slug.length > 30) throw new Error("Name fehlt oder ergibt kein gültiges Kürzel (2–30 Zeichen).");
  if (idee.length < 20) throw new Error("Die App-Idee braucht mindestens 20 Zeichen (Zielgruppe, Problem, Nutzen).");
  const supabase = raw?.supabase ?? "geteilt";
  if (!["geteilt", "eigen", "aus"].includes(supabase)) throw new Error(`supabase: geteilt, eigen oder aus (nicht „${supabase}“).`);
  const ohne = new Set((raw?.ohne ?? []).map((x) => String(x).trim()).filter(Boolean));
  for (const o of ohne) if (!OPTIONAL.includes(o)) throw new Error(`Unbekannte Option „${o}“ (erlaubt: ${OPTIONAL.join(", ")}).`);
  if (supabase === "aus") ohne.add("supabase");
  return { name, idee, slug, supabase, ohne: [...ohne] };
}

/** SQL für den Modus „geteilt“: eigenes Schema, eigene Migrations-Tabelle, RLS-Prüfabfrage. Löscht nie etwas. */
export function sharedSchemaSql(schema) {
  const s = schemaName(schema);
  return [
    `-- Schema für App „${s}“ im geteilten Supabase-Projekt (SIN-202). Nur hinzufügen.`,
    `create schema if not exists ${s};`,
    `grant usage on schema ${s} to anon, authenticated, service_role;`,
    `alter default privileges in schema ${s} grant select, insert, update, delete on tables to authenticated, service_role;`,
    `alter default privileges in schema ${s} grant usage, select on sequences to authenticated, service_role;`,
    `create table if not exists ${s}.schema_migrations (version text primary key, applied_at timestamptz not null default now());`,
    `alter table ${s}.schema_migrations enable row level security;`,
    "-- Prüfung: Tabellen ohne RLS in diesem Schema (muss leer sein)",
    `-- select tablename from pg_tables where schemaname = '${s}' and not rowsecurity;`,
  ].join("\n");
}

/**
 * Plan in Reihenfolge. `ctx.supabaseAktiv` = Zahl aktiver Supabase-Projekte (nur für Modus „eigen“ relevant).
 * Engpass → Schritt mit `sinan: true` statt Abbruch.
 */
export function buildPlan(rawInput, ctx = {}) {
  const input = normalizeInput(rawInput);
  const { slug, ohne } = input;
  const has = (o) => !ohne.includes(o);
  const schema = input.supabase === "geteilt" ? schemaName(slug) : null;
  const steps = [];
  const add = (id, dienst, titel, braucht, pruefung, extra = {}) => steps.push({ id, dienst, titel, braucht, pruefung, ...extra });

  add("github", "GitHub", `Repo ${slug} aus Vorlage anlegen (Rulesets, Labels, Workflows als wiederverwendbare Workflows der Plattform, AGENTS.md mit Recherche-Regel SIN-306 und Design-Regeln 2026)`, ["GITHUB_PLATTFORM_TOKEN"], `Repo ${slug} existiert`);
  add("infisical", "Infisical", `Projekt ${slug}: Umgebungen Development und Production, Sync zu GitHub (Development) und Vercel (Production, Sensitive)`, ["INFISICAL_CLIENT_ID", "INFISICAL_CLIENT_SECRET"], `Infisical-Projekt ${slug} existiert`);
  add("vercel", "Vercel", `Projekt ${slug} anlegen, mit Repo verbinden, Auto-Deploys aus, Deploy-Hook erzeugen (SIN-309)`, ["VERCEL_TOKEN"], `Vercel-Projekt ${slug} existiert`);
  add("sentry", "Sentry", `Projekt ${slug} anlegen, DSN nach Infisical`, ["SENTRY_AUTH_TOKEN"], `Sentry-Projekt ${slug} existiert`);
  add("linear", "Linear", `Projekt ${slug} im Team SIN, Labels ${LINEAR_LABELS.join(", ")}, Start-Issues (AP-00, erstes Design-Paket)`, ["LINEAR_API_KEY"], `Linear-Projekt ${slug} existiert`);

  if (input.supabase === "geteilt") {
    add("supabase", "Supabase", `Schema ${schema} im bestehenden Projekt anlegen (Exposed schemas, RLS, Bucket ${slug}-*, Migrations-Tabelle ${schema}.schema_migrations)`, ["SUPABASE_ACCESS_TOKEN"], `Schema ${schema} existiert`, { sql: sharedSchemaSql(schema) });
  } else if (input.supabase === "eigen") {
    const aktiv = ctx.supabaseAktiv;
    if (typeof aktiv === "number" && aktiv >= SUPABASE_FREE_MAX) {
      add("supabase", "Supabase", `Eigenes Projekt nicht möglich: ${aktiv} von ${SUPABASE_FREE_MAX} aktiven Free-Projekten belegt`, [], "Aufgabe für Sinan offen", { sinan: true });
    } else {
      add("supabase", "Supabase", `Eigenes Projekt ${slug} in Region EU anlegen`, ["SUPABASE_ACCESS_TOKEN"], `Supabase-Projekt ${slug} existiert`);
    }
  }
  if (has("posthog")) add("posthog", "PostHog", `Projekt ${slug} anlegen, Key nach Infisical`, ["POSTHOG_PERSONAL_API_KEY"], `PostHog-Projekt ${slug} existiert`);
  if (has("langfuse")) add("langfuse", "Langfuse", "Projekt je App: Organisations-Schlüssel nur, wenn der Plan es erlaubt (Docs prüfen), sonst Aufgabe für Sinan", [], "Aufgabe für Sinan offen oder Keys in Infisical", { sinan: true });
  add("cron", "cron-job.org", "Jobs anlegen: Takt, Tages-Update, Erreichbarkeit", ["CRONJOB_API_KEY"], `Jobs mit Präfix ${slug}- vorhanden`);
  add("leitstand", "Leitstand", `Eintrag ${slug} mit Projektfarbe`, [], `Eintrag ${slug} vorhanden`);
  add("figma", "Figma / FigJam", "Datei je Projekt mit Variablen (Stil E oder abgeleitet), FigJam „Pipeline-Ablauf“ und Nutzerwege je Zielgruppe, Community-Vorlagen per Klick kopieren", [], "Figma-Link im Projekt hinterlegt", { sinan: true });
  return { input, schema, steps, braucht: [...new Set(steps.flatMap((s) => s.braucht))].sort() };
}

/** Start-Issues in Linear. Freigabe von PRODUCT.md und „fertig“ bleibt beim Menschen (risk:high, Grundsatz). */
export function startIssues(rawInput) {
  const { name, idee, slug } = normalizeInput(rawInput);
  return [
    {
      titel: `AP-00: Recherche und PRODUCT.md für ${name}`,
      labels: ["claude", "content"],
      beschreibung: [
        `Idee (Vorgabe Sinan): ${idee}`,
        "",
        "Ergebnis: `docs/PRODUCT.md` (Konzept, Zielgruppen, Arbeitspakete AP-01 ff.) und Definition „fertig“.",
        "Vor jeder Entscheidung: GitHub, Hugging Face und Figma Community durchsuchen (AGENTS.md), Treffer in `docs/decisions/`.",
        "Die Änderung an `docs/PRODUCT.md` ist `risk:high`: Sinan gibt sie frei.",
      ].join("\n"),
    },
    {
      titel: `Design-Paket 1 für ${name}`,
      labels: ["design"],
      beschreibung: `Figma-Datei ${slug} mit Variablen/Stilblatt, FigJam Pipeline-Ablauf und Nutzerwege je Zielgruppe. Backlog, bis Sinan die Sitzung macht.`,
    },
  ];
}

export function renderPlan(plan) {
  const out = [`Projekt: ${plan.input.name} (${plan.input.slug}), Supabase: ${plan.input.supabase}`, ""];
  plan.steps.forEach((s, i) => out.push(`${i + 1}. [${s.dienst}] ${s.titel}${s.sinan ? "  → Aufgabe für Sinan" : ""}`, `   Prüfung: ${s.pruefung}`));
  out.push("", `Konto-Tokens (nur Namen): ${plan.braucht.join(", ")}`);
  return out.join("\n");
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const arg = (k) => {
    const i = rest.indexOf(`--${k}`);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  try {
    if (rest.includes("--live")) throw Object.assign(new Error("--live ist noch nicht freigeschaltet: erst Konto-Tokens in Infisical /konten und eine stabile Woche (ab 12.10.2026)."), { code: 2 });
    if (cmd === "plan") {
      const plan = buildPlan({ name: arg("name"), idee: arg("idee"), supabase: arg("supabase"), ohne: (arg("ohne") ?? "").split(",") }, { supabaseAktiv: arg("aktiv") ? Number(arg("aktiv")) : undefined });
      console.log(rest.includes("--json") ? JSON.stringify({ ...plan, startIssues: startIssues(plan.input) }, null, 2) : renderPlan(plan));
    } else if (cmd === "sql") {
      console.log(sharedSchemaSql(arg("schema")));
    } else {
      console.error("Aufruf: starter.mjs plan --name N --idee I | sql --schema S");
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(e.message);
    process.exitCode = e.code ?? 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv.slice(2));
