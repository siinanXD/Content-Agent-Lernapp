import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-290: Serie und Tagesziel aus echten Lernereignissen (Figma 22–26).
// Die Ereignisse werden wie im Produkt in `cal-learn-events` abgelegt, relativ zu „heute“
// im Browser (Kalendertag der Gerätezeitzone).

const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";

const units = Array.from({ length: 3 }, (_, i) => ({
  id: `M0-1-u${i + 1}`,
  title: `Berufsbildung ${i + 1}`,
  minutes: 6,
  explanation: "Kurz erklärt.",
  questions: [
    {
      id: `M0-1-u${i + 1}-q1`,
      type: "single",
      prompt: "Wer trägt die Kosten für Schutzkleidung?",
      choices: ["Der Betrieb", "Die Auszubildenden"],
      correct: "Der Betrieb",
      explanation: "Der Betrieb stellt PSA kostenlos.",
      sourceUrl: SOURCE,
      sourceFetchedAt: "2026-10-03",
      examAreas: ["WISO-1"],
    },
  ],
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  moduleId: "M0",
  blockId: "M0-1",
}));

/** Legt Lernereignisse an: je Eintrag „vor n Tagen“ (0 = heute), mittags Ortszeit. */
async function seedEvents(page: Page, daysAgo: number[]) {
  await page.addInitScript((offsets: number[]) => {
    if (window.localStorage.getItem("cal-learn-events")) return;
    const fmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
    const events = offsets.map((n) => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - n);
      return { at: d.toISOString(), day: fmt.format(d), kind: "unit" };
    });
    window.localStorage.setItem("cal-learn-events", JSON.stringify(events));
  }, daysAgo);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/learner/phase-a", (route) =>
    route.fulfill({
      json: {
        courseId: "e22073de",
        keyword: "Maschinen- und Anlagenführer",
        phase: "A",
        unitCount: units.length,
        units,
        source: "supabase",
      },
    }),
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cal-onboarding",
      JSON.stringify({ consent: false, schwerpunktId: "metall-kunststoff", mapId: "maf-metall" }),
    );
  });
});

test("Tagesziel erreicht: die vierte Einheit des Tages schließt den Ring", async ({ page }) => {
  // Gestern und vorgestern gelernt (Serie 2), heute 3 von 4.
  await seedEvents(page, [2, 1, 0, 0, 0]);
  await page.goto("/lernpfad");

  await expect(page.getByRole("heading", { name: "Tagesziel: 4 Einheiten" })).toBeVisible();
  await expect(page.getByText(/^Noch 1 Einheit, ca\. 7 Minuten\./)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Tagesziel heute" })).toHaveAttribute(
    "aria-valuetext",
    "3 von 4 heute",
  );
  await expect(page.locator('[data-kind="serie"]')).toContainText("3 Tage");

  await page.locator('[data-state="heute"]').first().click();
  await page.locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();

  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByRole("heading", { name: "Tagesziel geschafft" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Tagesziel heute" })).toHaveAttribute(
    "aria-valuetext",
    "4 von 4 heute",
  );
  await expect(page.locator('[data-kind="serie"]')).toContainText("3 Tage");
});

test("Serie unterbrochen: Neustart ohne Schuld, die alte Serie bleibt im Profil", async ({ page }) => {
  // Acht Lerntage am Stück, der letzte vor drei Tagen; gestern und vorgestern nichts.
  await seedEvents(page, [10, 9, 8, 7, 6, 5, 4, 3]);
  await page.goto("/lernpfad");

  await expect(page.getByRole("heading", { name: "Neue Serie, neuer Start" })).toBeVisible();
  await expect(page.getByText(/Deine 8 Tage bleiben im Profil/)).toBeVisible();
  await expect(page.locator('[data-kind="serie"]')).toContainText("0 Tage");
  await expect(page.getByText(/Strafe|verloren|gescheitert/i)).toHaveCount(0);

  await page.goto("/profil");
  await expect(page.getByText("Letzte Serie")).toBeVisible();
  await expect(page.getByText("8 Tage", { exact: true })).toBeVisible();
});

test("Lernen ohne Ereignis: Serie 0, Tagesziel 0 von 4, nichts erfunden", async ({ page }) => {
  await page.goto("/lernpfad");
  await expect(page.getByRole("heading", { name: "Tagesziel: 0 von 4" })).toBeVisible();
  await expect(page.locator('[data-kind="serie"]')).toContainText("0 Tage");
});

test("Heute (SIN-315): Hauptkachel mit einer Aktion, Wochenpunkte, Prüfungsreife je Lernfeld, Zustand offline", async ({
  page,
  context,
}) => {
  await seedEvents(page, [0]);
  await page.goto("/lernpfad");

  const main = page.getByRole("region", { name: "Als Nächstes" });
  await expect(main.getByRole("link")).toHaveCount(1);
  await expect(main.getByRole("link", { name: /Einheit starten/ })).toBeVisible();

  const week = page.getByRole("list", { name: "Diese Woche" });
  await expect(week.getByRole("listitem")).toHaveCount(7);
  await expect(week.getByText(/\(heute\): gelernt$/)).toHaveCount(1);

  await expect(page.getByRole("progressbar", { name: "M0 Prüfungsreife" })).toHaveAttribute(
    "aria-valuenow",
    /^\d{1,3}$/,
  );
  await expect(page.getByRole("link", { name: /Wiederholung/ }).first()).toBeVisible();

  await context.setOffline(true);
  await expect(page.locator('[data-state-kind="offline"]')).toBeVisible();
  await context.setOffline(false);
});

test("Einwilligungs-Banner: gleichwertige Knöpfe, per Tastatur bedienbar, ohne Zustimmung kein Zwang", async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.removeItem("cal-onboarding"));
  await page.goto("/lernpfad");

  const banner = page.getByRole("region", {
    name: "Dürfen wir anonym messen, wie die App genutzt wird?",
  });
  await expect(banner).toBeVisible();
  const [ja, nein] = await Promise.all([
    banner.getByRole("button", { name: "Einverstanden" }).boundingBox(),
    banner.getByRole("button", { name: "Ablehnen" }).boundingBox(),
  ]);
  expect(ja!.width).toBeCloseTo(nein!.width, 0);
  expect(ja!.height).toBeCloseTo(nein!.height, 0);
  await expect(page.locator("input[type=checkbox]:checked")).toHaveCount(0);

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations).toEqual([]);

  // Tastatur: Fokus auf „Ablehnen“, Enter entscheidet; die App bleibt benutzbar.
  await banner.getByRole("button", { name: "Ablehnen" }).focus();
  await page.keyboard.press("Enter");
  await expect(banner).toHaveCount(0);
  expect(
    await page.evaluate(() => JSON.parse(window.localStorage.getItem("cal-onboarding") ?? "{}").consent),
  ).toBe(false);
  await expect(page.getByRole("heading", { name: "Heute", level: 1 })).toBeVisible();
});

test("Einstellungen · Datennutzung: Erinnerung nur mit Einwilligung, Widerruf stoppt sofort", async ({ page }) => {
  await page.goto("/einstellungen");
  const reminder = page.getByRole("switch", { name: "Lern-Erinnerung" });
  await expect(reminder).toBeDisabled();

  await page.getByRole("switch", { name: "Anonyme Nutzungsdaten" }).check();
  await expect(page.getByText(/^Erteilt am \d{2}\.\d{2}\.\d{4}$/)).toBeVisible();
  await expect(reminder).toBeEnabled();
  await reminder.check();
  await expect(page.getByText("Eine Nachricht am Tag um 18:00")).toBeVisible();

  await page.getByRole("switch", { name: "Anonyme Nutzungsdaten" }).uncheck();
  await expect(page.getByText("Messung gestoppt. Danke trotzdem.")).toBeVisible();
  await expect(reminder).toBeDisabled();
  await expect(reminder).not.toBeChecked();

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations).toEqual([]);
});
