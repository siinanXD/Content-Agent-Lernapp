import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

// SIN-277: Ausbilder-Ansicht. Die API wird gemockt (kein Supabase in CI); die Zugriffsregeln
// (RLS, Rolle) prüfen die Unit-Tests der Route und die Migration.
const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();

const overview = {
  group: {
    name: "Gruppe Test",
    schwerpunkt: "Metall- und Kunststofftechnik",
    examDate: "2027-03-12",
    startsOn: "2026-10-01",
  },
  members: [
    { id: "1", name: "Aylin K.", progressPercent: 72, lastActiveAt: ago(0) },
    { id: "2", name: "Jonas M.", progressPercent: 58, lastActiveAt: ago(1) },
    { id: "3", name: "Dennis S.", progressPercent: 21, lastActiveAt: ago(9) },
    { id: "4", name: "Murat R.", progressPercent: 33, lastActiveAt: ago(8) },
  ],
};

async function mockGroup(page: Page, status = 200, body: unknown = overview) {
  await page.route("**/api/ausbilder/gruppe", (route) =>
    route.fulfill({ status, json: body }),
  );
}

test("Ausbilder sieht Kennzahlen, Filter, Liste, Erinnerung und CSV", async ({ page }) => {
  await mockGroup(page);
  await page.goto("/ausbilder");

  await expect(page.getByRole("heading", { level: 1, name: "Gruppenübersicht" })).toBeVisible();
  await expect(page.getByText("Gruppe Test")).toBeVisible();
  await expect(page.getByText("Metall- und Kunststofftechnik · Prüfung am 12.03.2027")).toBeVisible();

  const stats = page.getByRole("region", { name: "Kennzahlen" });
  await expect(stats.getByText("Teilnehmende")).toBeVisible();
  await expect(stats.getByText("46 %")).toBeVisible(); // (72+58+21+33)/4
  await expect(stats.getByText("seit 7 Tagen inaktiv")).toBeVisible();

  const list = page.getByRole("region", { name: "Teilnehmende" });
  await expect(list.getByRole("listitem")).toHaveCount(4);
  await expect(page.getByText("Zuletzt aktiv vor 9 Tagen · Inaktiv · erinnern?")).toBeVisible();

  await page.getByRole("button", { name: "Inaktiv", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list.getByText("Aylin K.")).toHaveCount(0);
  await page.getByRole("button", { name: "Alle", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(4);

  // Keine KI-Bewertung von Personen.
  await expect(page.getByText("Die App bewertet keine Personen.")).toBeVisible();

  // Erinnerung: nur ein E-Mail-Entwurf, kein Versand.
  const mail = page.getByRole("link", { name: "Erinnerung senden" });
  await expect(mail).toHaveAttribute("href", /^mailto:\?subject=/);
  await expect(page.getByText(/Gesendet wird erst, wenn Sie ihn selbst abschicken/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Als CSV exportieren" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^gruppe-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv).toContain('"Dennis S.";"21"');
  expect(csv.trim().split("\r\n")).toHaveLength(5);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toHaveLength(0);
});

test("Ausbilder ohne Anmeldung wird zur Anmeldung geführt", async ({ page }) => {
  await mockGroup(page, 401, { error: "Bitte anmelden." });
  await page.goto("/ausbilder");
  await expect(page.getByText("Bitte anmelden", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Anmelden" })).toHaveAttribute("href", "/anmelden");
  await expect(page.getByText("Aylin K.")).toHaveCount(0);
});

test("Ausbilder ohne Gruppe und bei Fehler: ehrliche Zustände", async ({ page }) => {
  await mockGroup(page, 404, { error: "Ihnen ist noch keine Gruppe zugeordnet." });
  await page.goto("/ausbilder");
  await expect(page.getByText("Noch keine Gruppe", { exact: true })).toBeVisible();

  await page.unroute("**/api/ausbilder/gruppe");
  await mockGroup(page, 503, { error: "Die Gruppe konnte nicht geladen werden." });
  await page.reload();
  await expect(page.locator('[data-state-kind="fehler"]')).toContainText(
    "Die Gruppe konnte nicht geladen werden.",
  );
});

test("Ohne Konfiguration liefert die echte API 401/503, nie Daten", async ({ request }) => {
  const anon = await request.get("/api/ausbilder/gruppe");
  expect(anon.status()).toBe(401);
  const withToken = await request.get("/api/ausbilder/gruppe", {
    headers: { Authorization: "Bearer unbekannt" },
  });
  expect([401, 503]).toContain(withToken.status());
});
