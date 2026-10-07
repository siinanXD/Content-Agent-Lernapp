import { test, expect, type Page } from "@playwright/test";

// SIN-354: Ohne Einwilligung geht keine Anfrage an PostHog. Läuft lokal und gegen die Live-App
// (PLAYWRIGHT_BASE_URL). Ist im Build kein NEXT_PUBLIC_POSTHOG_KEY gesetzt, ist die Aussage
// trivial wahr; der Live-Lauf gegen die Vercel-URL deckt den Fall mit Key ab.
const POSTHOG = /posthog\.com|\/i\/v0\/e/i;

function watchTracking(page: Page) {
  const hits: string[] = [];
  page.on("request", (req) => {
    if (POSTHOG.test(req.url())) hits.push(req.url());
  });
  return hits;
}

test("Ohne Einwilligung keine Tracking-Anfrage", async ({ page }) => {
  const hits = watchTracking(page);
  for (const path of ["/", "/willkommen", "/einwilligung", "/demo", "/einstellungen"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(hits).toEqual([]);
});

test("Widerruf: nach Ausschalten keine Tracking-Anfrage", async ({ page }) => {
  await page.goto("/einwilligung");
  await page.getByRole("button", { name: "Einverstanden" }).click();
  await page.goto("/einstellungen");
  await page.getByRole("switch", { name: "Anonyme Nutzungsdaten" }).uncheck();
  await expect(page.getByText("Messung gestoppt. Danke trotzdem.")).toBeVisible();
  const hits = watchTracking(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.goto("/demo");
  await page.waitForLoadState("networkidle");
  expect(hits).toEqual([]);
});
