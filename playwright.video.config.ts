import { defineConfig } from "@playwright/test";

// Video-Agent (SIN-483): nimmt den Klickweg gegen die laufende App auf (PLAYWRIGHT_BASE_URL, z. B. Production).
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error("PLAYWRIGHT_BASE_URL fehlt (z. B. https://content-agent-ashen-nu.vercel.app).");
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "video",
  testMatch: "aufnahme.spec.ts",
  outputDir: "video-ergebnis/dateien",
  retries: 1,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    browserName: "chromium",
    actionTimeout: 20_000, // ein hängender Klick scheitert mit Namen, nicht erst nach dem Test-Timeout (SIN-518)
    trace: "retain-on-failure",
    // Handy-Format wie im Bildvergleich (SIN-300); Video in doppelter Auflösung (SIN-522).
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    video: { mode: "on", size: { width: 780, height: 1688 } },
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
  },
});
