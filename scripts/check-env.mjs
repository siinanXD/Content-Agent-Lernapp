#!/usr/bin/env node
/**
 * Presence-only env audit. Never prints secret values.
 * Canonical names: docs/ENV.md
 */

const REQUIRED_LIVE = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_BASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const REQUIRED_HERMES = [
  "RAILWAY_API_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "HERMES_APP_BASE_URL",
];

const ANTHROPIC_WORKSPACE = ["ANTHROPIC_WORKSPACE_ID"];

const OPTIONAL_NEXT_PUBLIC_ALIASES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const OPTIONAL_OBSERVABILITY = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
];

function status(name) {
  const raw = process.env[name];
  if (raw === undefined) return { name, state: "MISSING", length: 0 };
  if (raw.trim() === "") return { name, state: "EMPTY", length: 0 };
  return { name, state: "SET", length: raw.length };
}

function printGroup(title, names) {
  console.log(`\n## ${title}`);
  for (const row of names.map(status)) {
    const extra = row.state === "SET" ? ` len=${row.length}` : "";
    console.log(`${row.state.padEnd(8)} ${row.name}${extra}`);
  }
}

printGroup("Live pipeline (required)", REQUIRED_LIVE);
printGroup("Hermes / Railway", REQUIRED_HERMES);
printGroup("Anthropic workspace (needed for live Claude)", ANTHROPIC_WORKSPACE);
printGroup(
  "Optional Next.js aliases (not extra Supabase secrets)",
  OPTIONAL_NEXT_PUBLIC_ALIASES,
);
printGroup(
  "Optional observability (Sentry EU + PostHog EU; missing = no-op)",
  OPTIONAL_OBSERVABILITY,
);

const missingLive = REQUIRED_LIVE.map(status).filter((r) => r.state !== "SET");
const missingHermes = REQUIRED_HERMES.map(status).filter((r) => r.state !== "SET");
const missingWorkspace = status("ANTHROPIC_WORKSPACE_ID").state !== "SET";
const supabaseUrl = status("SUPABASE_URL");
const supabaseAnon = status("SUPABASE_ANON_KEY");

console.log("\n## Summary");
console.log(
  missingLive.length === 0
    ? "pipeline_secrets: complete"
    : `pipeline_secrets: incomplete (${missingLive.map((r) => r.name).join(", ")})`,
);
console.log(
  supabaseUrl.state === "SET" && supabaseAnon.state === "SET"
    ? "supabase_url_and_anon: present (SUPABASE_URL + SUPABASE_ANON_KEY)"
    : "supabase_url_and_anon: missing",
);
console.log(
  missingHermes.length === 0
    ? "hermes_secrets: complete"
    : `hermes_secrets: incomplete (${missingHermes.map((r) => r.name).join(", ")})`,
);
console.log(
  missingWorkspace
    ? "anthropic_api_key: set; ANTHROPIC_WORKSPACE_ID missing in this process (new dashboard secrets apply on the next agent run)"
    : "anthropic_workspace: set",
);

// `--require=A,B`: genau diese Namen prüfen (z. B. content-grow.yml, SIN-220), statt der Standardliste.
const requireArg = process.argv.find((a) => a.startsWith("--require="));
if (requireArg) {
  const names = requireArg.slice("--require=".length).split(",").map((n) => n.trim()).filter(Boolean);
  const missingRequired = names.map(status).filter((r) => r.state !== "SET");
  if (missingRequired.length) {
    console.error(
      `::error::Secrets fehlen: ${missingRequired.map((r) => r.name).join(", ")} (Quelle: Infisical /content-agent-lernapp, GitHub-Sync)`,
    );
    process.exit(1);
  }
  console.log(`required: ${names.length} Secrets gesetzt`);
  process.exit(0);
}

const ok = missingLive.length === 0;
process.exit(ok ? 0 : 1);
