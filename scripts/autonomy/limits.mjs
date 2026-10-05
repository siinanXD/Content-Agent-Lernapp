#!/usr/bin/env node
/**
 * Free-Tier-Wächter (SIN-223, 3b): legt ein GitHub-Issue an, sobald ein Limit zu 80 % erreicht ist.
 *
 *   node scripts/autonomy/limits.mjs [--dry-run] [--usage datei.json]
 *
 * Verbrauch: `--usage` (JSON { name: Zahl }) oder Vercel-API (VERCEL_TOKEN, VERCEL_PROJECT_ID, optional
 * VERCEL_TEAM_ID): Deploys der letzten 24 h. Weitere Dienste folgen, sobald ihre Limits in
 * docs/autonomy/free-tier-limits.json stehen. Ein offenes Issue pro Limit, keine Dubletten.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { usageAlerts } from "./budget.mjs";

const LIMITS_FILE = new URL("../../docs/autonomy/free-tier-limits.json", import.meta.url);

export async function vercelDeploymentsLast24h(env = process.env, fetchImpl = fetch) {
  const since = Date.now() - 86_400_000;
  const params = new URLSearchParams({ projectId: env.VERCEL_PROJECT_ID, since: String(since), limit: "100" });
  if (env.VERCEL_TEAM_ID) params.set("teamId", env.VERCEL_TEAM_ID);
  const res = await fetchImpl(`https://api.vercel.com/v7/deployments?${params}`, {
    headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Vercel ${res.status}`);
  return (await res.json()).deployments.length;
}

export function issueFor(alert) {
  const pct = Math.round(alert.ratio * 100);
  return {
    prefix: `Free-Tier: ${alert.name}`,
    title: `Free-Tier: ${alert.name} bei ${pct} %`,
    body: `${alert.used} von ${alert.limit} ${alert.unit ?? ""} (${pct} %). Limits und Quellen: docs/DECISIONS.md (D-39), docs/autonomy/free-tier-limits.json.`,
  };
}

export async function main(argv) {
  const dry = argv.includes("--dry-run");
  const limits = JSON.parse(readFileSync(LIMITS_FILE, "utf8"));
  const usageAt = argv.indexOf("--usage");
  const usage = usageAt >= 0 ? JSON.parse(readFileSync(argv[usageAt + 1], "utf8")) : {};
  if (usageAt < 0 && process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
    usage["vercel-deployments-per-day"] = await vercelDeploymentsLast24h();
  }
  const alerts = usageAlerts(limits, usage);
  if (!alerts.length) return console.log("Alle Free-Tier-Limits unter 80 %.");
  for (const alert of alerts) {
    const { prefix, title, body } = issueFor(alert);
    if (dry) {
      console.log(`[dry-run] Issue: ${title}\n${body}`);
      continue;
    }
    const open = execFileSync("gh", ["issue", "list", "--state", "open", "--search", `${prefix} in:title`, "--json", "number"], {
      encoding: "utf8",
    });
    if (JSON.parse(open).length) {
      console.log(`Issue zu ${alert.name} ist schon offen.`);
      continue;
    }
    execFileSync("gh", ["issue", "create", "--title", title, "--body", body], { stdio: "inherit" });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
