import { test, expect, type Locator, type Page } from "@playwright/test";
import phaseAIndex from "../src/lib/learner/phase-a-index.json";

// SIN-286: Kompletter Lernweg nur mit der Tastatur (Tab, Enter, Leertaste), ohne Mausklick:
// Onboarding → Lernpfad → Einheit → Ergebnis → Wiederholung → Prüfungsmodus.

const question = (id: string) => ({
  id,
  type: "single",
  prompt: `Frage ${id}: Wer trägt die Kosten für Schutzkleidung?`,
  choices: ["Der Betrieb", "Die Auszubildenden"],
  correct: "Der Betrieb",
  explanation: "Der Betrieb stellt PSA kostenlos.",
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html",
  sourceFetchedAt: "2026-10-03",
  examAreas: ["WISO-1"],
});

const units = Array.from({ length: 4 }, (_, i) => ({
  id: `M0-1-u${i + 1}`,
  title: `Berufsbildung ${i + 1}`,
  minutes: 6,
  explanation: "Kurz erklärt.",
  questions: [question(`M0-1-u${i + 1}-q1`), question(`M0-1-u${i + 1}-q2`)],
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html",
  sourceFetchedAt: "2026-10-03",
  moduleId: "M0",
  blockId: "M0-1",
}));

const MAX_TABS = 80;

/** Tab bis das Ziel den Fokus hat; schlägt fehl, wenn es per Tastatur nicht erreichbar ist. */
async function tabTo(page: Page, target: Locator, label: string) {
  await expect(target.first(), `${label} ist sichtbar`).toBeVisible();
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    const focused = await target.first().evaluate((el) => el === document.activeElement);
    if (focused) return;
  }
  throw new Error(`${label} ist per Tab nicht erreichbar`);
}

async function activate(page: Page, target: Locator, label: string, key: "Enter" | "Space" = "Enter") {
  await tabTo(page, target, label);
  await page.keyboard.press(key);
}

test("Lernweg komplett mit der Tastatur", async ({ page, context }) => {
  await context.route("**/api/learner/phase-a", (route) =>
    route.fulfill({
      json: {
        courseId: phaseAIndex.courseId,
        keyword: phaseAIndex.keyword,
        phase: "A",
        unitCount: units.length,
        units,
        source: "supabase",
      },
    }),
  );

  // Onboarding
  await page.goto("/willkommen");
  await activate(page, page.getByRole("link", { name: "Los geht’s" }), "Los geht’s");
  await activate(page, page.getByRole("button", { name: "Ohne Nutzungsdaten weiter" }), "Einwilligung");
  await activate(page, page.getByRole("button", { name: /Maschinen- und Anlagenführer/ }), "Beruf", "Space");
  await activate(page, page.getByRole("button", { name: "Weiter", exact: true }), "Beruf bestätigen");
  await activate(page, page.getByRole("button", { name: "Metall- und Kunststofftechnik" }), "Schwerpunkt", "Space");
  await activate(page, page.getByRole("button", { name: "Weiter", exact: true }), "Schwerpunkt bestätigen");

  // Lernpfad → Einheit
  await expect(page).toHaveURL(/\/lernpfad$/);
  await activate(page, page.locator('[data-state="heute"]').first(), "Heutige Einheit");
  await expect(page).toHaveURL(/\/einheit\//);

  // Einheit: jede Frage per Tastatur beantworten.
  const counter = page.getByText(/^Frage \d+ von \d+/);
  for (let guard = 0; guard < 30; guard++) {
    const progress = (await counter.textContent()) ?? "";
    const feedback = page.getByTestId("answer-feedback");
    if (!(await feedback.isVisible())) {
      await activate(page, page.locator("button[aria-pressed]").last(), "Antwortoption", "Space");
      await activate(page, page.getByRole("button", { name: "Antwort prüfen" }), "Antwort prüfen");
    }
    await expect(feedback).toBeVisible();
    if (/^Frage (\d+) von \1\b/.test(progress)) {
      await activate(page, page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }), "Ergebnis anzeigen");
      break;
    }
    await activate(page, page.getByRole("button", { name: "Weiter", exact: true }), "Weiter");
    await expect(counter).not.toHaveText(progress);
  }

  // Ergebnis → Wiederholung
  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByRole("heading", { name: "Einheit geschafft" })).toBeVisible();
  await activate(page, page.getByRole("link", { name: "Zur Wiederholung" }), "Zur Wiederholung");
  await expect(page).toHaveURL(/\/wiederholung$/);
  await expect(page.getByText(/keine fälligen Fragen/)).toBeVisible();

  // Prüfungsmodus
  await page.goto("/pruefung");
  await expect(page.getByRole("heading", { name: "Prüfungsmodus" })).toBeVisible();
  await activate(page, page.getByRole("button", { name: "Prüfung starten" }), "Prüfung starten");
  await expect(page.getByText(/Frage 1\/\d+/)).toBeVisible();
  await activate(page, page.locator("button[aria-pressed]").first(), "Antwortoption Prüfung", "Space");
  await activate(page, page.getByRole("button", { name: "Antwort prüfen" }), "Antwort prüfen (Prüfung)");
  await expect(page.getByRole("button", { name: /^(Weiter|Ergebnis je Gebiet)$/ })).toBeVisible();
});
