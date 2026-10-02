#!/usr/bin/env node
/**
 * AP-09: Lighthouse accessibility gate (blocks on score < 0.9).
 * Usage: node scripts/lighthouse-gate.mjs [url]
 */
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:43123/";
const THRESHOLD = 0.9;
const chromePath = process.env.CHROME_PATH || chromium.executablePath();

const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
});

try {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: "json",
    onlyCategories: ["accessibility"],
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 },
  });
  const score = result?.lhr?.categories?.accessibility?.score ?? 0;
  console.log(`Lighthouse accessibility score for ${url}: ${score}`);
  if (score < THRESHOLD) {
    const audits = Object.values(result.lhr.audits).filter(
      (a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary",
    );
    for (const a of audits.slice(0, 12)) {
      console.error(`- ${a.id}: ${a.title}`);
    }
    process.exit(1);
  }
} finally {
  await chrome.kill();
}
