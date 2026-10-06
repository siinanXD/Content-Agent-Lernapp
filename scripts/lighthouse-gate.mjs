#!/usr/bin/env node
/**
 * Lighthouse-Gate (AP-09, SIN-257): alle Routen unter src/app, alle vier
 * Kategorien, Schwelle 0,9. Ohne Argument werden die Routen aus src/app gelesen.
 * Usage: node scripts/lighthouse-gate.mjs [--base http://127.0.0.1:43123] [--out messung.json] [--runs 3] [--serve] [route ...]
 * Ein Lauf braucht einen laufenden Server (`npm run build && npm start -- --port 43123`)
 * oder --serve: das Skript startet `next start` selbst und beendet es am Ende.
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "playwright";

const THRESHOLD = 0.9;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
// Dynamische Routen brauchen eine Beispiel-ID.
const SAMPLE_PARAMS = { unitId: "unit-03" };

const args = process.argv.slice(2);
const take = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const base = (take("--base") ?? "http://127.0.0.1:43123").replace(/\/$/, "");
const out = take("--out");
const RUNS = Number(take("--runs") ?? 1);
const serve = args.includes("--serve");
if (serve) args.splice(args.indexOf("--serve"), 1);

let server;
if (serve) {
  const { port, hostname } = new URL(base);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", hostname, "--port", port], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/** Routen aus den page.tsx-Dateien unter src/app. */
function appRoutes(dir = "src/app", prefix = "") {
  const routes = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name === "page.tsx") routes.push(prefix || "/");
    if (e.isDirectory()) {
      const m = /^\[(\w+)\]$/.exec(e.name);
      const seg = m ? (SAMPLE_PARAMS[m[1]] ?? "beispiel") : e.name;
      routes.push(...appRoutes(join(dir, e.name), `${prefix}/${seg}`));
    }
  }
  return routes.sort();
}

const routes = args.length ? args : appRoutes();
const chromePath = process.env.CHROME_PATH || chromium.executablePath();
const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
});

const rows = [];
try {
  for (const route of routes) {
    // Lauf-zu-Lauf-Schwankung der Performance beträgt mehrere Punkte: Median aus RUNS Läufen.
    const lhrs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(`${base}${route}`, {
        port: chrome.port,
        output: "json",
        onlyCategories: CATEGORIES,
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 },
      });
      if (result?.lhr) lhrs.push(result.lhr);
    }
    const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
    const scores = Object.fromEntries(
      CATEGORIES.map((c) => [c, median(lhrs.map((l) => l.categories?.[c]?.score ?? 0))]),
    );
    const lhr = lhrs[0];
    const failing = Object.values(lhr?.audits ?? {})
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary")
      .map((a) => a.id);
    const metric = (id) => Math.round(median(lhrs.map((l) => l.audits?.[id]?.numericValue ?? 0)));
    const metrics = {
      fcpMs: metric("first-contentful-paint"),
      lcpMs: metric("largest-contentful-paint"),
      tbtMs: metric("total-blocking-time"),
      cls: Math.round(median(lhrs.map((l) => l.audits?.["cumulative-layout-shift"]?.numericValue ?? 0)) * 1000) / 1000,
    };
    const lcpNode = lhr?.audits?.["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
    const savings = Object.values(lhr?.audits ?? {})
      .filter((a) => (a.details?.overallSavingsMs ?? 0) > 0)
      .map((a) => `${a.id} ${Math.round(a.details.overallSavingsMs)} ms`);
    rows.push({ route, scores, metrics, lcpElement: lcpNode?.snippet, failing, savings });
    console.log(
      `${route.padEnd(22)} ${CATEGORIES.map((c) => `${c} ${Math.round(scores[c] * 100)}`).join("  ")}  (LCP ${metrics.lcpMs} ms, TBT ${metrics.tbtMs} ms, CLS ${metrics.cls})`,
    );
  }
} finally {
  await chrome.kill();
  server?.kill();
}

if (out) {
  writeFileSync(
    out,
    JSON.stringify({ datum: new Date().toISOString().slice(0, 10), schwelle: THRESHOLD, routen: rows }, null, 2) + "\n",
  );
}

let failed = false;
for (const { route, scores, failing } of rows) {
  const low = CATEGORIES.filter((c) => scores[c] < THRESHOLD);
  if (!low.length) continue;
  failed = true;
  console.error(`✗ ${route}: ${low.join(", ")} unter ${THRESHOLD * 100}`);
  for (const id of failing.slice(0, 12)) console.error(`  - ${id}`);
}
process.exit(failed ? 1 : 0);
