import { defineConfig } from "@playwright/test";

// Bildvergleich (SIN-300): Referenz ist immer der letzte Stand auf main. Der Workflow `visual.yml`
// baut main und den PR, fotografiert main mit --update-snapshots (Referenz) und den PR gegen diese Bilder.
// PLAYWRIGHT_BASE_URL: bereits laufender Server (z. B. main auf :43125), sonst startet `next start` auf :43123.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "visual",
  // Referenzbilder liegen nicht im Repo (Schrift und Rendering hängen vom System ab).
  snapshotPathTemplate: "{snapshotDir}/{projectName}/{arg}{ext}",
  snapshotDir: "visual-referenz",
  outputDir: "visual-ergebnis",
  fullyParallel: true,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["json", { outputFile: "visual-ergebnis/ergebnis.json" }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: {
    baseURL: externalBaseURL ?? "http://127.0.0.1:43123",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "handy", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npx next start --hostname 127.0.0.1 --port 43123",
        url: "http://127.0.0.1:43123",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
