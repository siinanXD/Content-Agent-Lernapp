import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-324: falsche Antwort zeigt Feedback im Stil 2026, „Warum?“ öffnet das
// KI-Panel von unten; der Inhalt bleibt sichtbar, Esc schließt es.

test("falsche Antwort → Feedback → Warum-Panel", async ({ page }) => {
  await page.goto("/einheit/unit-03");
  const first = page.getByRole("button", { name: "Antwort prüfen" });
  await expect(first).toBeVisible();

  // Alle Optionen durchprobieren, bis ein „falsch“ entsteht: die erste Option
  // ist je nach Einheit richtig oder falsch, daher die zweite als Gegenprobe.
  const options = page.locator("button[aria-pressed], [role=radio]");
  const count = await options.count();
  expect(count).toBeGreaterThan(1);
  await options.nth(1).click();
  await first.click();

  const feedback = page.getByTestId("answer-feedback");
  await expect(feedback).toBeVisible();
  const correct = await feedback.getAttribute("data-correct");
  await page.screenshot({ path: "test-results/warum-feedback.png", fullPage: true });
  await expect(feedback).toContainText(correct === "true" ? "RICHTIG" : "FALSCH");

  await page.getByRole("button", { name: "Warum?" }).click();
  const panel = page.getByTestId("why-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("KI-erklärt · geprüft");
  await expect(feedback).toBeVisible();
  await page.screenshot({ path: "test-results/warum-panel.png" });

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  await page.getByRole("button", { name: "Passt nicht? Melden" }).click();
  await expect(panel).toContainText("Gemeldet");

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
});
