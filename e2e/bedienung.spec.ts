import { test, expect, type Page } from "@playwright/test";

// SIN-1514: Bedienung. Navigation fest unten, „Beispiel beenden“ beendet den Beispielmodus,
// Neuladen in der Einheit zählt eine beantwortete Frage nicht doppelt. Ohne Live-Keys.
test.use({ serviceWorkers: "block" });

const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
const frage = (id: string) => ({
  id,
  type: "single",
  prompt: "Wer trägt die Kosten für Schutzkleidung?",
  choices: ["Der Betrieb", "Die Auszubildenden"],
  correct: "Der Betrieb",
  explanation: "Der Betrieb stellt PSA kostenlos.",
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  examAreas: ["WISO-1"],
});
const einheit = {
  id: "M0-1-u1",
  title: "Berufsbildung 1",
  minutes: 6,
  explanation: "Kurz erklärt.",
  questions: [frage("M0-1-u1-q1"), frage("M0-1-u1-q2")],
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  moduleId: "M0",
  blockId: "M0-1",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/learner/phase-a", (route) =>
    route.fulfill({
      json: { courseId: "e22073de", keyword: "Maschinen- und Anlagenführer", phase: "A", unitCount: 1, units: [einheit], source: "supabase" },
    }),
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cal-onboarding",
      JSON.stringify({ consent: false, schwerpunktId: "metall-kunststoff", mapId: "maf-metall" }),
    );
  });
});

/** Unterkante der Hauptnavigation im Viewport; fest unten heißt: Unterkante = Fensterhöhe. */
async function navUnterkante(page: Page) {
  return page.getByRole("navigation", { name: "Hauptnavigation" }).evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
}

for (const vp of [
  { name: "handy", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  for (const pfad of ["/lernpfad", "/wiederholung", "/pruefung", "/profil", "/einstellungen"]) {
    test(`Navigation steht auf ${pfad} fest unten (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(pfad, { waitUntil: "networkidle" });
      const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
      await expect(nav).toBeVisible();
      // Fest am Fenster nur auf dem Handy; auf dem Desktop (axe: Link nicht verdecken) steht sie am Seitenende.
      if (vp.width < 768) expect(await navUnterkante(page), `Navigation oben auf ${pfad}`).toBe(vp.height);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await navUnterkante(page), `Navigation am Seitenende auf ${pfad}`).toBe(vp.height);
    });
  }
}

test("Beispiel beenden beendet den Beispielmodus sofort", async ({ page }) => {
  await page.goto("/lernpfad?demo=1");
  const hinweis = page.getByRole("note").filter({ hasText: "Beispiel: Die Zahlen" });
  await expect(hinweis).toBeVisible();
  await hinweis.getByRole("link", { name: "Beispiel beenden" }).click();
  await expect(page).toHaveURL(/\/\?demo=0$/);
  // Erst nach dem Einhängen wertet die Seite `?demo=0` aus und löscht das Flag.
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("cal-demo"))).toBeNull();
  await expect(page.getByRole("note").filter({ hasText: "Beispiel: Die Zahlen" })).toHaveCount(0);
  // Auch ein späterer Aufruf zeigt den Hinweis nicht mehr.
  await page.goto("/lernpfad");
  await expect(page.getByRole("note").filter({ hasText: "Beispiel: Die Zahlen" })).toHaveCount(0);
});

test("Neuladen nach der Antwort, vor „Weiter“, zählt die Frage nicht doppelt", async ({ page }) => {
  const stand = `cal-einheit-${einheit.id}`;
  const zaehler = (n: number) => page.getByText(new RegExp(`^Frage ${n} von 2`));
  const richtig = async () => {
    await page.getByRole("button", { name: "Der Betrieb", exact: true }).click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    await expect(page.getByTestId("answer-feedback")).toBeVisible();
  };
  await page.goto(`/einheit/${einheit.id}`);
  await expect(zaehler(1)).toBeVisible();
  await expect(page.getByRole("link", { name: /Zurück zum Lernpfad/ })).toBeVisible();
  await richtig();
  await page.reload();
  await expect(zaehler(1)).toBeVisible();
  expect(await page.evaluate((k) => window.sessionStorage.getItem(k), stand)).toBeNull();
  await richtig();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(zaehler(2)).toBeVisible();
  await page.reload();
  await expect(zaehler(2)).toBeVisible();
  await richtig();
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByText(/2 von 2 richtig/)).toBeVisible();
  expect(await page.evaluate((k) => window.sessionStorage.getItem(k), stand)).toBeNull();
});
