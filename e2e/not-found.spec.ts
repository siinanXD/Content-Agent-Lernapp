import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("unbekannte Route zeigt not-found, Fokus auf Überschrift, axe ohne Verstoß (SIN-403)", async ({ page }) => {
  const res = await page.goto("/gibt-es-nicht");
  expect(res?.status()).toBe(404);
  const h1 = page.getByRole("heading", { level: 1, name: "Diese Seite gibt es nicht" });
  await expect(h1).toBeFocused();
  const link = page.getByRole("link", { name: "Zum Lernpfad" });
  await expect(link).toHaveAttribute("href", "/lernpfad");
  const box = await link.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toHaveLength(0);
});
