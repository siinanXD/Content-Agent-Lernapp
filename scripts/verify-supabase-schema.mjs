#!/usr/bin/env node
/**
 * Verify AP-17 tables exist via PostgREST (service role).
 * Never prints secret values — only SET/MISSING and table status.
 */

const TABLES = [
  "courses",
  "sources",
  "plans",
  "units",
  "questions",
  "evaluations",
  "learning_progress",
  // SIN-268: Kosten-Ledger und Bewertungslauf (Migration 20261006020000 holt beide nach)
  "pipeline_run_costs",
  "judge_runs",
  // SIN-289/SIN-347: Status je Lauf der Content-Fabrik
  "content_factory_runs",
  // SIN-277: Demo-Anfragen und Gruppenübersicht
  "demo_requests",
  "trainer_groups",
  "group_members",
];

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.log("supabase_secrets: MISSING (SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY)");
  console.log("skip: cannot verify tables without service role");
  process.exit(0);
}

console.log("supabase_secrets: SET");
console.log(`supabase_host: ${new URL(url).host}`);

let failed = 0;
for (const table of TABLES) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (res.ok) {
    console.log(`ok   ${table}`);
  } else {
    failed += 1;
    const body = await res.text();
    const snippet = body.replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]").slice(0, 120);
    console.log(`FAIL ${table} status=${res.status} ${snippet}`);
  }
}

if (failed > 0) {
  console.log(`\nverify: ${failed}/${TABLES.length} tables missing — apply supabase/migrations/20261003030000_ap17_course_persistence.sql and 20261006020000_sin268_repair_run_costs.sql`);
  process.exit(1);
}

console.log(`\nverify: all ${TABLES.length} tables present`);
