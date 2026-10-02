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

const OPTIONAL_ALIASES = [
  "ANTHROPIC_WORKSPACE_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
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

const groups = [
  ["Live pipeline (required)", REQUIRED_LIVE],
  ["Hermes / Railway", REQUIRED_HERMES],
  ["Aliases / workspace", OPTIONAL_ALIASES],
];

printGroup(...groups[0]);
printGroup(...groups[1]);
printGroup(...groups[2]);

const missingLive = REQUIRED_LIVE.map(status).filter((r) => r.state !== "SET");
const missingHermes = REQUIRED_HERMES.map(status).filter((r) => r.state !== "SET");
const missingWorkspace = status("ANTHROPIC_WORKSPACE_ID").state !== "SET";

console.log("\n## Summary");
console.log(
  missingLive.length === 0
    ? "pipeline_secrets: complete"
    : `pipeline_secrets: incomplete (${missingLive.map((r) => r.name).join(", ")})`,
);
console.log(
  missingHermes.length === 0
    ? "hermes_secrets: complete"
    : `hermes_secrets: incomplete (${missingHermes.map((r) => r.name).join(", ")})`,
);
console.log(
  missingWorkspace
    ? "anthropic_workspace: missing (live Claude calls need ANTHROPIC_WORKSPACE_ID or a workspace-scoped key)"
    : "anthropic_workspace: set",
);

const ok = missingLive.length === 0;
process.exit(ok ? 0 : 1);
