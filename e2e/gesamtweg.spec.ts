import { test, expect, type Page } from "@playwright/test";
import phaseAIndex from "../src/lib/learner/phase-a-index.json";

// SIN-255: Gesamtweg Start → Lernpfad → Einheit → Ergebnis → Wiederholung
// (1/3/7 Tage) → Prüfungsmodus für den veröffentlichten Kurs (Phase A).
// Die Phase-A-Antwort ist fest vorgegeben, die Zeit im Browser wird mit
// page.clock gesetzt: keine Live-Keys, keine echten Wartezeiten.

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const START = new Date("2026-10-06T08:00:00Z");

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

// SIN-269: Der Test läuft je veröffentlichtem Kurs. Ein weiterer Kurs im Index
// kommt hier dazu und läuft automatisch mit.
const PUBLISHED_COURSES = [phaseAIndex].filter((c) => c.courseId && c.unitCount > 0);

type StackItem ={ stage: number; dueAt: string };

async function readStack(page: Page): Promise<StackItem[]> {
  return page.evaluate(
    () => JSON.parse(window.sessionStorage.getItem("cal-leitner-stack") ?? "{}").items ?? [],
  );
}

/** Wählt die letzte Option (falsch), damit die Frage in den Leitner-Stapel kommt. */
async function answerWrong(page: Page) {
  await page.locator("button[aria-pressed]").last().click();
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
}

/** Beantwortet alle fälligen Wiederholungsfragen richtig. */
async function reviewAllCorrect(page: Page) {
  const header = page.getByText(/^Wiederholung \d+ von \d+/);
  await expect(header).toBeVisible();
  const total = Number(/von (\d+)/.exec((await header.textContent()) ?? "")![1]);
  for (let i = 0; i < total; i++) {
    await page.getByRole("button", { name: "Der Betrieb", exact: true }).click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    await page
      .getByRole("button", { name: i + 1 >= total ? "Abschließen" : "Weiter", exact: true })
      .click();
  }
  await expect(page.getByRole("heading", { name: "Wiederholung fertig" })).toBeVisible();
  await expect(page.getByText(`${total} von ${total} richtig`)).toBeVisible();
}

test("Es gibt mindestens einen veröffentlichten Kurs", () => {
  expect(PUBLISHED_COURSES.length).toBeGreaterThan(0);
});

for (const course of PUBLISHED_COURSES) {
test(`Gesamtweg bis Prüfungsmodus: ${course.keyword} (${course.courseId.slice(0, 8)})`, async ({ page, context }) => {
  await page.clock.install({ time: START });
  // context.route greift auch für den Service Worker, der phase-a seit SIN-256 selbst lädt.
  await context.route("**/api/learner/phase-a", (route) =>
    route.fulfill({
      json: {
        courseId: course.courseId,
        keyword: course.keyword,
        phase: "A",
        unitCount: units.length,
        units,
        source: "supabase",
      },
    }),
  );

  // Start → Onboarding
  await page.goto("/willkommen");
  await page.getByRole("link", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Ohne Nutzungsdaten weiter" }).click();
  await page.getByRole("button", { name: "Metall- und Kunststofftechnik" }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  // Lernpfad → Einheit
  await expect(page).toHaveURL(/\/lernpfad$/);
  await page.locator('[data-state="heute"]').first().click();
  await expect(page).toHaveURL(/\/einheit\//);

  // Einheit durchspielen. Alle Fragen werden falsch beantwortet;
  // so füllt sich der Leitner-Stapel (Stufe 1, fällig nach 1 Tag).
  const counter = page.getByText(/^Frage \d+ von \d+/);
  for (let guard = 0; guard < 30; guard++) {
    const progress = (await counter.textContent()) ?? "";
    const feedback = page.getByTestId("answer-feedback");
    if (!(await feedback.isVisible())) await answerWrong(page);
    await expect(feedback).toBeVisible();
    if (/^Frage (\d+) von \1\b/.test(progress)) {
      await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
      break;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(counter).not.toHaveText(progress);
  }

  // Ergebnis
  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByRole("heading", { name: "Einheit geschafft" })).toBeVisible();

  // Wiederholung: am selben Tag ist nichts fällig, der Stapel ist gefüllt (Stufe 1).
  await page.getByRole("link", { name: "Zur Wiederholung" }).click();
  await expect(page).toHaveURL(/\/wiederholung$/);
  await expect(page.getByText(/keine fälligen Fragen/)).toBeVisible();
  const items = await readStack(page);
  expect(items.length).toBeGreaterThan(0);
  const dueAt = items.map((i) => new Date(i.dueAt).getTime());
  // Die Browser-Uhr läuft weiter (install), daher ein kleiner Spielraum.
  const wait = Math.min(...dueAt) - START.getTime();
  expect(wait).toBeGreaterThanOrEqual(DAY_MS);
  expect(wait).toBeLessThan(DAY_MS + MINUTE_MS);

  // Je Intervall: kurz davor nichts fällig, danach fällig; richtig → nächste Stufe.
  const intervals = [
    { days: 1, stage: 2 },
    { days: 3, stage: 3 },
    { days: 7, stage: 4 },
  ];
  for (const { days, stage } of intervals) {
    await page.clock.fastForward(days * DAY_MS - 2 * MINUTE_MS);
    await page.goto("/wiederholung");
    await expect(page.getByText(/keine fälligen Fragen/)).toBeVisible();
    await page.clock.fastForward(4 * MINUTE_MS);
    await page.goto("/wiederholung");
    await reviewAllCorrect(page);
    const stages = (await readStack(page)).map((i) => i.stage);
    expect(Math.min(...stages)).toBe(stage);
    await page.goto("/wiederholung");
  }

  // Prüfungsmodus
  await page.goto("/pruefung");
  await expect(page.getByRole("heading", { name: "Prüfungsmodus" })).toBeVisible();
  await page.getByRole("button", { name: "Prüfung starten" }).click();
  await expect(page.getByText(/Frage 1\/\d+/)).toBeVisible();
  const last = page.getByRole("button", { name: "Ergebnis je Gebiet", exact: true });
  for (let guard = 0; guard < 20; guard++) {
    const selects = page.locator("select");
    for (let i = 0; i < (await selects.count()); i++) {
      await selects.nth(i).selectOption({ index: 1 });
    }
    const options = page.locator("button[aria-pressed]");
    if ((await options.count()) > 0) await options.first().click();
    const sample = page.getByRole("button", { name: "Musterlösung zeigen" });
    if (await sample.isVisible()) {
      await page.getByRole("textbox").fill("Eigener Lösungsversuch");
      await sample.click();
      await page.getByRole("button", { name: "Selbstkontrolle speichern" }).click();
    } else {
      await page.getByRole("button", { name: "Antwort prüfen" }).click();
    }
    if (await last.isVisible()) {
      await last.click();
      break;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
  await expect(page.getByRole("heading", { name: /der Bestehensgrenze$/ })).toBeVisible();
  await expect(page.getByText(/Grenze 50 %\. Das ist eine Übungsprüfung/)).toBeVisible();
});
}
