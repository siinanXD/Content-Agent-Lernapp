import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-385: Weg ohne Konto: /demo → Beispielansicht mit gekennzeichneten, erfundenen Daten. Keine API-Anfrage.
test("Demo-Seite führt ohne Konto in die Gruppenansicht mit Beispieldaten", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/ausbilder")) apiCalls.push(r.url());
  });

  await page.goto("/demo");
  await page.getByRole("link", { name: "Beispielansicht öffnen" }).click();
  await expect(page).toHaveURL(/\/ausbilder\?demo=1$/);

  await expect(page.getByRole("heading", { level: 1, name: "Gruppenübersicht" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Beispieldaten");
  await expect(page.getByRole("note")).toContainText("keine echten Personen");
  const list = page.getByRole("region", { name: "Teilnehmende", exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(5);
  await expect(list.getByText("Beispiel A.")).toBeVisible();
  await page.getByRole("button", { name: "Inaktiv", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Eigenen Demo-Zugang anfragen" })).toHaveAttribute(
    "href",
    "/demo",
  );

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toHaveLength(0);
  expect(apiCalls).toEqual([]);
});

test("Echtes Konto ohne ?demo=1 sieht weiter den Leerzustand", async ({ page }) => {
  await page.route("**/api/ausbilder/gruppe", (route) =>
    route.fulfill({ status: 404, json: { error: "Ihnen ist noch keine Gruppe zugeordnet." } }),
  );
  await page.goto("/ausbilder");
  await expect(page.getByText("Noch keine Gruppe", { exact: true })).toBeVisible();
  await expect(page.getByText("Beispieldaten")).toHaveCount(0);
});
