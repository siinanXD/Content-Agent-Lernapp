import { expect, test } from "@playwright/test";
import { routes } from "../e2e/routes";

// SIN-300: alle Hauptseiten (Liste aus e2e/routes.ts), Handy und Desktop, ganze Seite.
for (const route of routes) {
  test(`Bild ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page).toHaveScreenshot(`${route.replace(/^\/+/, "").replace(/\W+/g, "-") || "startseite"}.png`, { fullPage: true });
  });
}
