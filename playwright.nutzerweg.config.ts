import { defineConfig } from "@playwright/test";

// Nutzerwege (SIN-1453): spielt die Lernapp wie ein Mensch durch, gegen jede Adresse.
// Pflicht: LIVE_URL, TESTNUTZER_EMAIL, TESTNUTZER_PASSWORT. Optional VERCEL_AUTOMATION_BYPASS_SECRET für geschützte Vorschauen.
// Das Testkonto wird echt benutzt (Einheit abschließen schreibt in dessen Stand). Keine KI-Kosten, keine neue Abhängigkeit.
const baseURL = process.env.LIVE_URL;
if (!baseURL) throw new Error("LIVE_URL fehlt (z. B. https://content-agent-ashen-nu.vercel.app).");
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "nutzerweg",
  outputDir: "nutzerweg-ergebnis/dateien",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"], ["json", { outputFile: "nutzerweg-ergebnis/ergebnis.json" }]],
  use: {
    baseURL,
    screenshot: "on",
    trace: "off", // Traces würden das getippte Passwort enthalten
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
  },
});
