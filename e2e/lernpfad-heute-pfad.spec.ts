import { test, expect } from "@playwright/test";

// SIN-1455: „Heute“ (A1) und „Pfad“ (N5) sind kurz, ohne interne Kennungen und Adressen.
test.use({ serviceWorkers: "block" });

const KENNUNG = /LF\d+-\d+-u\d+/;

for (const route of ["/lernpfad", "/lernpfad/pfad"]) {
  test(`${route}: keine Kennung und keine Adresse im sichtbaren Text`, async ({ page }) => {
    await page.goto(route);
    // Beim Streamen steht kurz die Ladeansicht (main[aria-busy]) neben der fertigen Seite.
    await expect(page.locator("main[aria-busy]")).toHaveCount(0);
    const text = await page.locator("main").last().innerText();
    expect(text).not.toMatch(KENNUNG);
    expect(text).not.toMatch(/https?:\/\//);
  });
}

test("Heute ist im Handyformat höchstens 1,2 Bildschirme hoch, Pfad zeigt ein Modul", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lernpfad");
  const hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
  info.annotations.push({ type: "hoehe-heute", description: `${hoehe}px` });
  expect(hoehe).toBeLessThanOrEqual(844 * 1.2);
  await page.goto("/lernpfad/pfad");
  await expect(page.locator("section[data-module-state]")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /^Einheit \d+ starten$/ })).toBeVisible();
});

// SIN-1595: Prüfungsreife zeigt höchstens 2 Module, auch mit 17 Modulen bleibt Heute unter 1,2 Bildschirmen.
test("Heute mit 17 Modulen: Prüfungsreife begrenzt, höchstens 1,2 Bildschirme (390×844)", async ({ page }, info) => {
  const quelle = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
  const units = Array.from({ length: 17 }, (_, m) =>
    [1, 2].map((n) => ({
      id: `M${m}-1-u${n}`,
      title: `Einheit ${m}.${n}`,
      minutes: 6,
      explanation: "Kurz erklärt.",
      questions: [
        {
          id: `M${m}-1-u${n}-q1`,
          type: "single",
          prompt: "Wer trägt die Kosten für Schutzkleidung?",
          choices: ["Der Betrieb", "Die Auszubildenden"],
          correct: "Der Betrieb",
          explanation: "Der Betrieb stellt PSA kostenlos.",
          sourceUrl: quelle,
          sourceFetchedAt: "2026-10-03",
          examAreas: ["WISO-1"],
        },
      ],
      sourceUrl: quelle,
      sourceFetchedAt: "2026-10-03",
      moduleId: `M${m}`,
      blockId: `M${m}-1`,
    })),
  ).flat();
  await page.route("**/api/learner/phase-a", (route) =>
    route.fulfill({
      json: { courseId: "e22073de", keyword: "Maschinen- und Anlagenführer", phase: "A", unitCount: units.length, units, source: "supabase" },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lernpfad");
  const reife = page.getByRole("region", { name: "Prüfungsreife" });
  await expect(reife.getByRole("progressbar")).toHaveCount(2);
  await expect(reife.getByRole("link", { name: "Alle 17 Module" })).toBeVisible();
  const hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
  info.annotations.push({ type: "hoehe-heute-17-module", description: `${hoehe}px` });
  expect(hoehe).toBeLessThanOrEqual(844 * 1.2);
});
