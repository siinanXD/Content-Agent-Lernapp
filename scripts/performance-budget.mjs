#!/usr/bin/env node
/**
 * Leistungsbudget (SIN-300): feste Grenzen je Route aus performance-budget.json, gemessen mit Lighthouse
 * (mobil, Median aus `runs` Läufen). Überschreitung → Exit 1 → der CI-Job `build` wird rot und blockiert den Merge.
 * Messgrößen: LCP, CLS, TBT und Größe der übertragenen JavaScript-Dateien der Route (resource-summary).
 *
 * Usage: node scripts/performance-budget.mjs [--base http://127.0.0.1:43123] [--out messung.json] [--runs 3] [--serve] [--details]
 * --details zeigt je Route das LCP-Element und die LCP-Phasen (Ursachenanalyse, SIN-311); bei Überschreitung immer.
 * Braucht einen laufenden Server (`npm run build && npm start -- --port 43123`) oder --serve: startet `next start` selbst.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MEDIAN = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

const allowed = (key, limit, tolerance) => (key === "lcpMs" || key === "tbtMs" ? Math.round(limit * (1 + tolerance)) : limit);

/**
 * Vergleicht Messwerte mit der Grenze einer Route.
 * @param {{ lcpMs: number, cls: number, tbtMs: number, jsKb: number }} measured
 * @param {{ lcpMs: number, cls: number, tbtMs: number, jsKb: number }} limit
 * @param {number} [tolerance] Toleranz auf die Zeitgrenzen LCP und TBT (SIN-322, Messrauschen im CI); CLS und JS-Größe sind exakt
 * @returns {string[]} eine Zeile je überschrittener Grenze (leer = im Budget)
 */
export function violations(measured, limit, tolerance = 0) {
  const rows = [
    ["LCP", "lcpMs", "ms"],
    ["CLS", "cls", ""],
    ["TBT", "tbtMs", "ms"],
    ["JS", "jsKb", "KB"],
  ];
  return rows
    .filter(([, key]) => limit[key] !== undefined && measured[key] >= allowed(key, limit[key], tolerance))
    .map(([name, key, unit]) => `${name} ${measured[key]}${unit && ` ${unit}`} (Grenze ${limit[key]}${unit && ` ${unit}`}${allowed(key, limit[key], tolerance) !== limit[key] ? `, mit Toleranz ${allowed(key, limit[key], tolerance)}` : ""})`);
}

/** Messwerte aus Lighthouse-Berichten (lhr) einer Route: Median je Größe. */
export function measure(lhrs) {
  const audit = (id) => lhrs.map((l) => l.audits?.[id]?.numericValue ?? 0);
  const scriptBytes = lhrs.map((l) => l.audits?.["resource-summary"]?.details?.items?.find((i) => i.resourceType === "script")?.transferSize ?? 0);
  return {
    lcpMs: Math.round(MEDIAN(audit("largest-contentful-paint"))),
    cls: Math.round(MEDIAN(audit("cumulative-layout-shift")) * 1000) / 1000,
    tbtMs: Math.round(MEDIAN(audit("total-blocking-time"))),
    jsKb: Math.round((MEDIAN(scriptBytes) / 1024) * 10) / 10,
  };
}

async function main(argv) {
  const args = [...argv];
  const take = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args.splice(i, 2)[1];
  };
  const base = (take("--base") ?? "http://127.0.0.1:43123").replace(/\/$/, "");
  const out = take("--out");
  const budget = JSON.parse(readFileSync(new URL("../performance-budget.json", import.meta.url), "utf8"));
  const runs = Number(take("--runs") ?? budget.runs ?? 3);
  const serve = args.includes("--serve");
  const details = args.includes("--details");

  let server;
  if (serve) {
    const { port, hostname } = new URL(base);
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", hostname, "--port", port], { stdio: "ignore" });
    for (let i = 0; i < 60 && !(await fetch(base).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 1000));
  }

  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  const { chromium } = await import("@playwright/test");
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  const rows = [];
  try {
    for (const [route, limit] of Object.entries(budget.routes)) {
      const lhrs = [];
      // Aufwärmlauf (SIN-329): der erste Abruf trifft kalte Caches und Server; er zählt nicht in den Median.
      await lighthouse(`${base}${route}`, { port: chrome.port, output: "json", onlyCategories: ["performance"] });
      for (let i = 0; i < runs; i++) {
        const result = await lighthouse(`${base}${route}`, {
          port: chrome.port,
          output: "json",
          onlyCategories: ["performance"],
          formFactor: "mobile",
          screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 },
        });
        if (result?.lhr) lhrs.push(result.lhr);
      }
      const measured = measure(lhrs);
      const over = violations(measured, limit, budget.tolerance ?? 0);
      rows.push({ route, measured, limit, over });
      console.log(`${over.length ? "✗" : "✓"} ${route.padEnd(18)} LCP ${measured.lcpMs} ms, CLS ${measured.cls}, TBT ${measured.tbtMs} ms, JS ${measured.jsKb} KB`);
      for (const line of over) console.error(`  - ${line}`);
      if ((details || over.length) && lhrs[0]) {
        const a = lhrs[0].audits ?? {};
        const el = a["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
        console.log(`    LCP-Element: ${el?.selector ?? "?"} ${(el?.snippet ?? "").slice(0, 120)}`);
        const m = a.metrics?.details?.items?.[0] ?? {};
        console.log(`    FCP ${Math.round(a["first-contentful-paint"]?.numericValue ?? 0)} ms (gemessen ${Math.round(m.observedFirstContentfulPaint ?? 0)}), LCP gemessen ${Math.round(m.observedLargestContentfulPaint ?? 0)} ms`);
        console.log(`    Render-blockierend: ${JSON.stringify(a["render-blocking-insight"]?.details?.items?.map((i) => `${i.url} ${i.wastedMs}ms`) ?? a["render-blocking-resources"]?.details?.items?.map((i) => `${i.url} ${i.wastedMs}ms`))}`);
        console.log(`    LCP-Phasen: ${JSON.stringify(a["lcp-breakdown-insight"]?.details?.items ?? a["largest-contentful-paint-element"]?.details?.items?.[1]?.items)}`);
      }
    }
  } finally {
    await chrome.kill();
    server?.kill();
  }

  if (out) writeFileSync(out, JSON.stringify({ datum: new Date().toISOString().slice(0, 10), runs, routen: rows }, null, 2) + "\n");
  return rows.every((r) => !r.over.length);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (ok) => process.exit(ok ? 0 : 1),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
