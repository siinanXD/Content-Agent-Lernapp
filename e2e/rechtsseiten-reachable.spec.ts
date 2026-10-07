import { test, expect } from "@playwright/test";

// SIN-344: Rechtsseiten erreichbar und verlinkt

test("Rechtsseiten von der Startseite (Footer) erreichbar", async ({ page }) => {
  await page.goto("/");

  // Fußzeile hat Links zu Impressum, Datenschutz, KI-Hinweis
  const impressumLink = page.getByRole("link", { name: "Impressum" });
  const datenschutzLink = page.getByRole("link", { name: "Datenschutz" });

  await expect(impressumLink).toBeVisible();
  await expect(datenschutzLink).toBeVisible();
  await expect(page.getByRole("link", { name: "Hinweis zu KI-Inhalten" })).toBeVisible();

  await impressumLink.click();
  await expect(page).toHaveURL(/\/impressum$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/");
  await datenschutzLink.click();
  await expect(page).toHaveURL(/\/datenschutz$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/");
  const kiHinweisLink = page.getByRole("link", { name: "Hinweis zu KI-Inhalten" });
  await kiHinweisLink.click();
  await expect(page).toHaveURL(/\/ki-hinweis$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("Rechtsseiten von Einstellungen (Footer) erreichbar", async ({ page }) => {
  await page.goto("/einstellungen");

  // Einstellungen haben die gleichen Footer-Links
  const impressumLink = page.getByRole("link", { name: "Impressum" });
  const datenschutzLink = page.getByRole("link", { name: "Datenschutz" });

  await expect(impressumLink).toBeVisible();
  await expect(datenschutzLink).toBeVisible();
  await datenschutzLink.click();
  await expect(page).toHaveURL(/\/datenschutz$/);
});

test("Einwilligung vom Onboarding erreichbar", async ({ page }) => {
  await page.goto("/willkommen");
  const losGehtsLink = page.getByRole("link", { name: "Los geht’s" });
  await losGehtsLink.click();
  await expect(page).toHaveURL(/\/einwilligung$/);
  await expect(page.getByRole("heading", { name: "Einwilligung" })).toBeVisible();
});

test("Datenschutz-Link aus Einwilligung", async ({ page }) => {
  await page.goto("/einwilligung");
  const datenschutzLink = page.getByRole("link", { name: "Datenschutz" });
  await datenschutzLink.click();
  await expect(page).toHaveURL(/\/datenschutz$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("Demo-Seite von Startseite erreichbar", async ({ page }) => {
  await page.goto("/");
  const demoLinks = page.getByRole("link", { name: /Demo-Zugang/ });
  // Es kann mehrere Demo-Links geben
  await expect(demoLinks.first()).toBeVisible();
  await demoLinks.first().click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: /Demo-Zugang anfragen/ })).toBeVisible();
});

test("Demo-Seite von Anmelden erreichbar", async ({ page }) => {
  await page.goto("/anmelden");
  await page.getByRole("link", { name: "Demo-Zugang anfragen" }).click();
  await expect(page).toHaveURL(/\/demo$/);
});

test("Datenschutz-Link aus Demo-Seite", async ({ page }) => {
  await page.goto("/demo");
  const datenschutzLink = page.getByRole("link", { name: "Datenschutz" });
  await expect(datenschutzLink).toBeVisible();
  await datenschutzLink.click();
  await expect(page).toHaveURL(/\/datenschutz$/);
});
