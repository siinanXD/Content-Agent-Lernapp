import { test, expect } from "@playwright/test";

// SIN-1455: „Heute“ (A1) und „Pfad“ (N5) sind kurz, ohne interne Kennungen und Adressen.
test.use({ serviceWorkers: "block" });

const KENNUNG = /LF\d+-\d+-u\d+/;

for (const route of ["/lernpfad", "/lernpfad/pfad"]) {
  test(`${route}: keine Kennung und keine Adresse im sichtbaren Text`, async ({ page }) => {
    await page.goto(route);
    const text = await page.locator("main").innerText();
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
});
