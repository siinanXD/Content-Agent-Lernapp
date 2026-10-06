#!/usr/bin/env node
/**
 * Lighthouse-Gate (AP-09, SIN-257): alle Routen unter src/app, alle vier
 * Kategorien, Schwelle 0,9. Ohne Argument werden die Routen aus src/app gelesen.
 * Usage: node scripts/lighthouse-gate.mjs [--base http://127.0.0.1:43123] [--out messung.json] [route ...]
 * Ein Lauf braucht einen laufenden Server (`npm run build && npm start -- --port 43123`).
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
    const result = await lighthouse(`${base}${route}`, {
      port: chrome.port,
      output: "json",
      onlyCategories: CATEGORIES,
      formFactor: "mobile",
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 },
    });
    const lhr = result?.lhr;
    const scores = Object.fromEntries(
      CATEGORIES.map((c) => [c, lhr?.categories?.[c]?.score ?? 0]),
    );
    const failing = Object.values(lhr?.audits ?? {})
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary")
      .map((a) => a.id);
    rows.push({ route, scores, failing });
    console.log(
      `${route.padEnd(22)} ${CATEGORIES.map((c) => `${c} ${Math.round(scores[c] * 100)}`).join("  ")}`,
    );
  }
} finally {
  await chrome.kill();
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
