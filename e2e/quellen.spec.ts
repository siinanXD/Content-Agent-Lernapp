import { test, expect } from "@playwright/test";

// SIN-1581: Auf /quellen steht keine rohe Adresse im Text; der Link liegt im href.
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`/quellen zeigt Namen statt Adressen (${viewport.width} px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/quellen");
    await expect(page.getByRole("main")).not.toContainText(/https?:\/\//);

    const links = page.locator("main li a");
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", /^https:\/\//);
      await expect(link).toHaveText(/\S/);
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator("main li time").first()).toBeVisible();
  });
}
