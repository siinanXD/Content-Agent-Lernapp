import { defineConfig } from "@playwright/test";

// Live-Check nach dem Deploy (SIN-319): prüft die laufende App, startet keinen eigenen Server.
// PLAYWRIGHT_BASE_URL ist Pflicht (Production oder eine Vorschau). Optional VERCEL_AUTOMATION_BYPASS_SECRET für geschützte Vorschauen.
// Schreibende Endpunkte (/api/progress, /api/demo) sind in den Tests abgefangen: nie echte Nutzerdaten ändern.
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error("PLAYWRIGHT_BASE_URL fehlt (z. B. https://content-agent-ashen-nu.vercel.app).");
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "live",
  outputDir: "live-ergebnis/dateien",
  fullyParallel: true,
  retries: 1,
  workers: 2,
  timeout: 60_000,
  reporter: [["list"], ["json", { outputFile: "live-ergebnis/ergebnis.json" }]],
  use: {
    baseURL,
    screenshot: "on",
    trace: "retain-on-failure",
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
  },
  projects: [
    { name: "handy", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
  ],
});
