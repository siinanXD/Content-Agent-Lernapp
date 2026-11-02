import { test, expect } from "@playwright/test";

// SIN-1446: Der Lernpfad zeigt den Stand aus echten Lernereignissen, nichts ist fest eingebaut.
// Mit PLAYWRIGHT_BASE_URL läuft die Datei gegen eine Vorschau; Bilder landen in test-results/.

const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";

const units = Array.from({ length: 4 }, (_, i) => ({
  id: `M0-1-u${i + 1}`,
  title: `Berufsbildung ${i + 1}`,
  minutes: 6,
  explanation: "Kurz erklärt.",
  questions: [
    {
      id: `M0-1-u${i + 1}-q1`,
      type: "single",
      prompt: "Wer trägt die Kosten für Schutzkleidung?",
      choices: ["Der Betrieb", "Die Auszubildenden"],
      correct: "Der Betrieb",
      explanation: "Der Betrieb stellt PSA kostenlos.",
      sourceUrl: SOURCE,
      sourceFetchedAt: "2026-10-03",
      examAreas: ["WISO-1"],
    },
  ],
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  moduleId: "M0",
  blockId: "M0-1",
}));

// Der Service Worker holt /api/learner/phase-a selbst (network-first, sw.js); `page.route` sähe diese Abrufe nicht mehr.
test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/learner/phase-a", (route) =>
    route.fulfill({
      json: { courseId: "e22073de", keyword: "Maschinen- und Anlagenführer", phase: "A", unitCount: units.length, units, source: "supabase" },
    }),
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cal-onboarding",
      JSON.stringify({ consent: false, schwerpunktId: "metall-kunststoff", mapId: "maf-metall" }),
    );
  });
});

/** Wartet, bis die gemockte Liste die vom Server gelieferte ersetzt hat; sonst passt die Id der Einheit nicht zum Pfad. */
const pfadGeladen = (page: import("@playwright/test").Page) =>
  expect(page.getByText("Berufsbildung 1").first()).toBeVisible();

const nodes = (page: import("@playwright/test").Page, state: string) => page.locator(`[data-state="${state}"]`);

test("neues Konto: nichts erledigt, erste Einheit ist Jetzt, Prüfungsreife 0 %", async ({ page }, info) => {
  await page.goto("/lernpfad");
  await expect(nodes(page, "heute")).toHaveCount(1);
  await expect(nodes(page, "heute")).toContainText("01 · Jetzt");
  await expect(nodes(page, "erledigt")).toHaveCount(0);
  await expect(page.getByRole("progressbar", { name: "Modul M0 Fortschritt" })).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByRole("region", { name: "Prüfungsreife" })).toContainText("0 %");
  await page.screenshot({ path: info.outputPath("neues-konto.png"), fullPage: true });
});

test("nach einer abgeschlossenen Einheit: genau diese erledigt, Als Nächstes springt weiter, auch nach Neuladen", async ({ page }, info) => {
  await page.goto("/lernpfad");
  await pfadGeladen(page);
  await nodes(page, "heute").first().click();
  await page.locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
  await expect(page).toHaveURL(/\/ergebnis$/);

  for (const reload of [false, true]) {
    if (reload) await page.reload();
    else await page.goto("/lernpfad");
    await pfadGeladen(page);
    await expect(nodes(page, "erledigt")).toHaveCount(1);
    await expect(nodes(page, "erledigt")).toContainText("01 · Fertig");
    await expect(nodes(page, "heute")).toHaveCount(1);
    await expect(nodes(page, "heute")).toContainText("02 · Jetzt");
    await expect(page.getByRole("progressbar", { name: "Modul M0 Fortschritt" })).toHaveAttribute("aria-valuenow", "25");
  }
  await page.screenshot({ path: info.outputPath("nach-einheit.png"), fullPage: true });
});

test("Beispielmodus ?demo=1 zeigt weiter seine erfundenen Daten", async ({ page }, info) => {
  await page.goto("/lernpfad?demo=1");
  await expect(nodes(page, "erledigt")).toHaveCount(2);
  await expect(nodes(page, "heute")).toContainText("03 · Jetzt");
  await page.screenshot({ path: info.outputPath("beispielmodus.png"), fullPage: true });
});
