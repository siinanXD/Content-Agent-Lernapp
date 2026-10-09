import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-452: Module ohne Einheiten zeigen „Noch keine Einheiten“, ohne Startknopf, aber fokussierbar.

test("Lernpfad: Modul ohne Einheiten ist beschriftet, fokussierbar und nicht startbar", async ({ page }) => {
  await page.goto("/lernpfad");
  await page.waitForLoadState("networkidle");

  const leer = page.getByTestId("modul-leer");
  expect(await leer.count(), "mindestens ein Modul ohne Einheiten").toBeGreaterThan(0);
  const first = leer.first();
  await expect(first).toContainText("Noch keine Einheiten");
  await expect(first).toHaveAttribute("aria-label", /Noch keine Einheiten/);
  await expect(first.getByRole("link")).toHaveCount(0);
  await expect(first.getByRole("button")).toHaveCount(0);

  await first.focus();
  await expect(first).toBeFocused();
  const outline = await first.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  const box = await first.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toHaveLength(0);
});
