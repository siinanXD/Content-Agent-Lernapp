import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-415: Meine Gruppen (G5), Archivieren (G6), Archiv (G7), Zugang einlösen (G0).
// Die API ist gemockt und hält den Zustand wie die Datenbank; die Regeln selbst stehen in der Migration.
const A = "6f1c1e0e-3a4b-4c5d-8e9f-0a1b2c3d4e5f";
const B = "7a2d2f1f-4b5c-4d6e-9fa0-1b2c3d4e5f60";

type G = {
  id: string;
  name: string;
  schwerpunkt: string;
  startsOn: string | null;
  examDate: string | null;
  archivedAt: string | null;
  memberCount: number;
  avgPercent: number;
};

const gruppe = (id: string, name: string, memberCount: number, avgPercent: number): G => ({
  id,
  name,
  schwerpunkt: "Maschinen- und Anlagenführer",
  startsOn: "2026-11-04",
  examDate: null,
  archivedAt: null,
  memberCount,
  avgPercent,
});

async function mockApi(page: Page, groups: G[], quota = 40) {
  const posts: unknown[] = [];
  await page.route("**/api/ausbilder/gruppen", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { id: string; aktion: string };
      posts.push(body);
      const g = groups.find((x) => x.id === body.id)!;
      g.archivedAt = body.aktion === "archivieren" ? "2026-06-30T10:00:00Z" : null;
      return route.fulfill({ json: { ok: true } });
    }
    const used = groups.filter((g) => !g.archivedAt).reduce((n, g) => n + g.memberCount, 0);
    return route.fulfill({
      json: {
        groups,
        zugaenge: { organisation: "Beispiel-Bildungsträger", trainerQuota: 3, memberQuota: quota, used },
      },
    });
  });
  return posts;
}

const axeTags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test("Meine Gruppen zeigt Zugänge, archiviert nach Bestätigung und stellt wieder her", async ({ page }) => {
  const posts = await mockApi(page, [gruppe(A, "MAF Herbst 2026", 12, 64), gruppe(B, "IndKfl 2026-B", 16, 41)]);
  await page.goto("/ausbilder/gruppen");

  await expect(page.getByRole("heading", { level: 1, name: "Meine Gruppen" })).toBeVisible();
  await expect(page.getByText("Beispiel-Bildungsträger · 2 aktive Gruppen")).toBeVisible();
  await expect(page.getByText("28 von 40")).toBeVisible();
  await expect(page.getByText("12 frei. Mehr Zugänge bekommen Sie auf Anfrage.")).toBeVisible();
  await expect(page.getByRole("link", { name: "MAF Herbst 2026 öffnen" })).toHaveAttribute(
    "href",
    `/ausbilder?gruppe=${A}`,
  );
  await expect(page.getByRole("link", { name: "Archiv ansehen (0)" })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toHaveLength(0);

  // G6: Bestätigung nennt die Folgen; Abbrechen ändert nichts.
  await page.getByRole("button", { name: "MAF Herbst 2026 archivieren" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("MAF Herbst 2026 ins Archiv verschieben?")).toBeVisible();
  await expect(sheet.getByText("Die 12 Zugänge werden wieder frei.")).toBeVisible();
  await expect(sheet.getByText("Die Azubis sehen die Gruppe danach nicht mehr.")).toBeVisible();
  await sheet.getByRole("button", { name: "Abbrechen" }).click();
  expect(posts).toHaveLength(0);

  await page.getByRole("button", { name: "MAF Herbst 2026 archivieren" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archivieren" }).click();
  await expect(page.getByRole("status").filter({ hasText: "MAF Herbst 2026 ist jetzt im Archiv." })).toBeVisible();
  await expect(page.getByText("16 von 40")).toBeVisible();
  await expect(page.getByRole("link", { name: "Archiv ansehen (1)" })).toBeVisible();
  expect(posts).toEqual([{ id: A, aktion: "archivieren" }]);

  // G7: Archiv zeigt die Gruppe, Wiederherstellen bringt sie zurück.
  await page.getByRole("link", { name: "Archiv ansehen (1)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Archiv" })).toBeVisible();
  await expect(page.getByText("04.11.2026 – 30.06.2026")).toBeVisible();
  await expect(page.getByRole("link", { name: "MAF Herbst 2026 ansehen" })).toHaveAttribute(
    "href",
    `/ausbilder?gruppe=${A}`,
  );
  const axeArchiv = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(axeArchiv.violations, JSON.stringify(axeArchiv.violations, null, 2)).toHaveLength(0);
  await page.getByRole("button", { name: "MAF Herbst 2026 wiederherstellen" }).click();
  await expect(page.getByText("MAF Herbst 2026 ist wieder aktiv.")).toBeVisible();
  await expect(page.getByText("Noch nichts im Archiv")).toBeVisible();
});

test("Archivdialog ist per Tastatur bedienbar: Esc bricht ab", async ({ page }) => {
  await mockApi(page, [gruppe(A, "MAF Herbst 2026", 12, 64)]);
  await page.goto("/ausbilder/gruppen");
  await page.getByRole("button", { name: "MAF Herbst 2026 archivieren" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toHaveLength(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Wiederherstellen ohne freie Zugänge zeigt den Grund", async ({ page }) => {
  const g = gruppe(A, "MAF Herbst 2025", 12, 91);
  g.archivedAt = "2026-06-30T10:00:00Z";
  await mockApi(page, [g]);
  await page.unroute("**/api/ausbilder/gruppen");
  await page.route("**/api/ausbilder/gruppen", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 409, json: { error: "Es sind nicht genug Zugänge frei. Mehr Zugänge bekommen Sie auf Anfrage." } })
      : route.fulfill({ json: { groups: [g], zugaenge: null } }),
  );
  await page.goto("/ausbilder/archiv");
  await page.getByRole("button", { name: "MAF Herbst 2025 wiederherstellen" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "nicht genug Zugänge frei" })).toBeVisible();
  await expect(page.getByText("MAF Herbst 2025", { exact: true })).toBeVisible();
});

test("Zugang einlösen: Link prüfen, E-Mail eintragen, Hinweis auf den Anmelde-Link", async ({ page }) => {
  let sent: unknown = null;
  await page.route("**/api/ausbilder/zugang**", async (route) => {
    if (route.request().method() === "POST") {
      sent = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { ok: true, mailSent: true } });
    }
    return route.fulfill({ json: { organisation: "Beispiel-Bildungsträger", trainerQuota: 3, memberQuota: 40 } });
  });
  await page.goto("/ausbilder/zugang?code=ABCDEF123456XYZ");

  await expect(page.getByRole("heading", { level: 1, name: "Ihr Ausbilder-Zugang" })).toBeVisible();
  await expect(page.getByText("Beispiel-Bildungsträger hat einen Zugang für Sie eingerichtet.")).toBeVisible();
  await expect(page.getByText("Kein Passwort. Sie bekommen einen Anmelde-Link per E-Mail.")).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toHaveLength(0);

  await page.getByLabel("E-Mail für den Anmelde-Link").fill("kaputt");
  await page.getByRole("button", { name: "Zugang aktivieren" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "gültige E-Mail" })).toBeVisible();

  await page.getByLabel("E-Mail für den Anmelde-Link").fill("Name@Traeger.de");
  await page.getByRole("button", { name: "Zugang aktivieren" }).click();
  await expect(page.getByRole("status")).toContainText("Der Anmelde-Link ist unterwegs");
  expect(sent).toEqual({ code: "ABCDEF123456XYZ", email: "name@traeger.de" });
});

test("Zugang einlösen: ungültiger Link bleibt ehrlich", async ({ page }) => {
  await page.route("**/api/ausbilder/zugang**", (route) =>
    route.fulfill({ status: 404, json: { error: "Dieser Link ist nicht gültig oder wurde schon benutzt." } }),
  );
  await page.goto("/ausbilder/zugang?code=ABCDEF123456XYZ");
  await expect(page.getByText("Link nicht gültig")).toBeVisible();
  await expect(page.getByRole("link", { name: /Anmelden/ })).toHaveAttribute("href", "/anmelden");
});
