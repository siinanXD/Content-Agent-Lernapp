#!/usr/bin/env node
/**
 * Ensures .env.example names match the checker lists. No secret values.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const example = readFileSync(join(root, ".env.example"), "utf8");
const keys = example
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => line.split("=")[0]);

const expected = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_WORKSPACE_ID",
  "OPENAI_API_KEY",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_BASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "RAILWAY_API_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "HERMES_APP_BASE_URL",
];

const missing = expected.filter((k) => !keys.includes(k));
const extra = keys.filter((k) => !expected.includes(k));

if (missing.length || extra.length) {
  console.error("FAIL .env.example keys mismatch");
  if (missing.length) console.error("missing:", missing.join(", "));
  if (extra.length) console.error("extra:", extra.join(", "));
  process.exit(1);
}

const envDoc = readFileSync(join(root, "docs/ENV.md"), "utf8");
for (const k of expected) {
  if (!envDoc.includes("`" + k + "`")) {
    console.error("FAIL docs/ENV.md missing backtick name:", k);
    process.exit(1);
  }
}

console.log("PASS .env.example and docs/ENV.md cover", expected.length, "names");
