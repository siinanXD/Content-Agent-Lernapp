import { test, expect } from "@playwright/test";

// SIN-249: Einheit öffnen mit Daten in der Form der Supabase-Antwort von
// /api/learner/phase-a (Phase A, 248 Einheiten, geteiltes Modul M0). Die
// Antwort wird hier fest vorgegeben, damit der Test ohne Live-Keys läuft.

const question = (id: string) => ({
  id,
  type: "single",
  prompt: "Wer trägt die Kosten für Schutzkleidung?",
  choices: ["Der Betrieb", "Die Auszubildenden"],
  correct: "Der Betrieb",
  explanation: "Der Betrieb stellt PSA kostenlos.",
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html",
  sourceFetchedAt: "2026-10-03",
  examAreas: ["WISO-1"],
});

const units = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `M0-1-u${i + 1}`,
    title: `Berufsbildung ${i + 1}`,
    minutes: 6,
    explanation: "Kurz erklärt.",
    questions: [question(`M0-1-u${i + 1}-q1`)],
    sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html",
    sourceFetchedAt: "2026-10-03",
    moduleId: "M0",
    blockId: "M0-1",
  })),
  // Id mit Sonderzeichen, Einheit ohne sourceUrl: beides darf nicht abstürzen.
  {
    id: "LF1-2:u1",
    title: "Feilen und Sägen",
    minutes: 6,
    explanation: "Kurz erklärt.",
    questions: [question("LF1-2:u1-q1")],
    moduleId: "LF1",
    blockId: "LF1-2",
  },
];

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

test("Lernpfad → Einheit aus Phase-A-Daten öffnet ohne Fehler", async ({ page }) => {
  await page.goto("/lernpfad");
  const node = page.locator('[data-state="heute"]').first();
  await expect(node).toBeVisible();
  await node.click();
  await expect(page).toHaveURL(/\/einheit\//);
  await expect(page.getByText(/^Frage 1 von 1/)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Direktaufruf (Neuladen) mit Sonderzeichen in der Id öffnet die Einheit", async ({ page }) => {
  await page.goto("/einheit/LF1-2%3Au1");
  await expect(page.getByRole("heading", { name: "Feilen und Sägen" })).toBeVisible();
  await expect(page.getByText(/^Frage 1 von 1/)).toBeVisible();
});

test("Unbekannte Einheit zeigt die Fehlerseite statt abzustürzen", async ({ page }) => {
  await page.goto("/einheit/gibt-es-nicht");
  await expect(page.getByRole("alert")).toContainText("Einheit nicht gefunden");
  await expect(page.getByRole("button", { name: "Zum Lernpfad" })).toBeVisible();
});
