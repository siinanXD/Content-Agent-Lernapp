import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-230: Onboarding → Einheit → Feedback → Einheit geschafft.

async function answerCurrentQuestion(page: Page) {
  const check = page.getByRole("button", { name: "Antwort prüfen" });
  const showSample = page.getByRole("button", { name: "Musterlösung zeigen" });

  const selects = page.locator("select");
  for (let i = 0; i < (await selects.count()); i++) {
    await selects.nth(i).selectOption({ index: 1 });
  }
  const options = page.locator("button[aria-pressed]");
  if ((await options.count()) > 0) await options.first().click();

  if (await showSample.isVisible()) {
    await page.getByRole("textbox").fill("Eigener Lösungsversuch");
    await showSample.click();
    await page.getByRole("button", { name: "Selbstkontrolle speichern" }).click();
    return;
  }
  await check.click();
}

test("Onboarding → Einheit → Feedback → Einheit geschafft", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/willkommen$/);
  await page.getByRole("link", { name: "Los geht’s" }).click();

  await expect(page).toHaveURL(/\/einwilligung$/);
  await page.getByRole("button", { name: "Ohne Nutzungsdaten weiter" }).click();

  await expect(page).toHaveURL(/\/schwerpunkt$/);
  const weiter = page.getByRole("button", { name: "Weiter", exact: true });
  await expect(weiter).toBeDisabled();
  await page.getByRole("button", { name: "Metall- und Kunststofftechnik" }).click();
  // Zwei Maps: zweite Auswahl (Referenzberuf) mit Default
  await expect(page.getByRole("group", { name: "Referenzberuf" })).toBeVisible();
  await weiter.click();

  await expect(page).toHaveURL(/\/lernpfad$/);
  await page.locator('[data-state="heute"]').first().click();
  await expect(page).toHaveURL(/\/einheit\//);

  const counter = page.getByText(/^Frage \d+ von \d+/);
  for (let guard = 0; guard < 30; guard++) {
    const feedback = page.getByTestId("answer-feedback");
    const progress = (await counter.textContent()) ?? "";
    const isLast = /^Frage (\d+) von \1\b/.test(progress);
    if (!(await feedback.isVisible())) await answerCurrentQuestion(page);
    await expect(feedback).toBeVisible();
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      axe.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? "")),
    ).toHaveLength(0);
    if (isLast) {
      await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
      await expect(page).toHaveURL(/\/ergebnis$/);
      break;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(counter).not.toHaveText(progress);
  }

  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByRole("heading", { name: "Einheit geschafft" })).toBeVisible();
});

test("Einwilligung steuert Nutzungsdaten, Widerruf in den Einstellungen", async ({ page }) => {
  await page.goto("/einwilligung");
  await page.getByRole("button", { name: "Einverstanden" }).click();
  await page.goto("/einstellungen");
  const consent = page.getByRole("switch", { name: "Nutzungsdaten teilen" });
  await expect(consent).toBeChecked();
  await consent.uncheck();
  await page.reload();
  await expect(page.getByRole("switch", { name: "Nutzungsdaten teilen" })).not.toBeChecked();
});

for (const route of [
  "/willkommen",
  "/einwilligung",
  "/schwerpunkt",
  "/einstellungen",
  "/impressum",
  "/datenschutz",
  "/ki-hinweis",
  "/quellen",
]) {
  test(`axe + Überschrift auf ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? "")),
      JSON.stringify(results.violations, null, 2),
    ).toHaveLength(0);
  });
}
