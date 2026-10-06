import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-277: Demo-Zugang anfragen. Läuft gegen den Mock-Speicher (COURSE_STORAGE=mock), kein Versand.
test("Startseite → Demo-Zugang anfragen → Einwilligung Pflicht → Danke", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Prüfungsreif in kleinen Schritten." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Demo-Zugang anfragen" }).first().click();
  await expect(page).toHaveURL(/\/demo$/);

  await page.getByLabel("Bildungsträger").fill("Bildungswerk Beispiel");
  await page.getByLabel("Ansprechperson").fill("Erika Muster");
  await page.getByLabel("Dienstliche E-Mail").fill("erika@beispiel.de");
  await expect(page.getByLabel("Teilnehmende (ca.)")).toHaveValue("10");

  // Ohne Einwilligung wird nichts gespeichert.
  await page.getByRole("button", { name: "Demo-Zugang anfragen" }).click();
  await expect(page.getByText("Ohne Einwilligung können wir die Anfrage nicht speichern.")).toBeVisible();
  await expect(page).toHaveURL(/\/demo$/);

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Demo-Zugang anfragen" }).click();
  await expect(page.getByRole("heading", { name: "Danke für Ihre Anfrage." })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("innerhalb eines Werktags");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toHaveLength(0);
});

test("Demo-Formular: falsche E-Mail zeigt Fehler am Feld", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("Bildungsträger").fill("Bildungswerk Beispiel");
  await page.getByLabel("Ansprechperson").fill("Erika Muster");
  await page.getByLabel("Dienstliche E-Mail").fill("keine-mail");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Demo-Zugang anfragen" }).click();
  await expect(page.getByLabel("Dienstliche E-Mail")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Bitte eine gültige E-Mail-Adresse angeben.")).toBeVisible();
});

test("Anmelden: ohne eingerichtete Anmeldung klare Meldung statt Absturz", async ({ page }) => {
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail").fill("trainer@beispiel.de");
  await page.getByRole("button", { name: "Anmelde-Link senden" }).click();
  await expect(page.getByText("Anmeldung nicht eingerichtet")).toBeVisible();
});

test("Startseite: bei „Bewegung reduzieren“ stehen die 4 Schritte statisch untereinander", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const stage = page.locator(".story-stage");
  await expect(stage).toHaveCSS("position", "static");
  const steps = page.locator(".story-step");
  await expect(steps).toHaveCount(4);
  const tops: number[] = [];
  for (let i = 0; i < 4; i++) {
    await expect(steps.nth(i)).toBeVisible();
    await expect(steps.nth(i)).toHaveCSS("opacity", "1");
    tops.push((await steps.nth(i).boundingBox())!.y);
  }
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  expect(new Set(tops).size).toBe(4);
  await context.close();
});
