import { test, expect } from "@playwright/test";

// Smoke-Test: Die App startet, die Hauptseiten rendern ohne Absturz.
// Läuft in CI gegen `next start` (COURSE_STORAGE=mock) oder gegen eine
// Preview-URL, wenn PLAYWRIGHT_BASE_URL gesetzt ist.
const pages = [
  "/",
  "/lernpfad",
  "/profil",
  "/einheit/unit-03",
  "/wiederholung",
  "/pruefung",
];

test.describe("smoke", () => {
  test("health endpoint answers ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  for (const path of pages) {
    test(`page ${path} renders without crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const res = await page.goto(path);

      expect(res?.status(), `HTTP status of ${path}`).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});
