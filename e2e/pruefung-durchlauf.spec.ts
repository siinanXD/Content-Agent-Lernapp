import { test, expect, type Page } from "@playwright/test";

// SIN-1449: Prüfung mit allen Fragetypen bis zum Ergebnis (Handy und Desktop), echte Zeit,
// Pause und Zeitablauf wie angezeigt. Fragen kommen nur aus dem veröffentlichten Kurs (gemockte API).

const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";

const base = (id: string) => ({
  id,
  level: "verstehen",
  explanation: "Kurz erklärt.",
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  examAreas: [],
});

const questions = [
  {
    ...base("p-single"),
    type: "auswahl",
    prompt: "Wer trägt die Kosten für Schutzkleidung?",
    choices: ["Der Betrieb", "Die Auszubildenden"],
    correct: "Der Betrieb",
  },
  {
    ...base("p-luecke"),
    type: "lueckentext",
    prompt: "Der Betrieb stellt ___ kostenlos.",
    blanks: ["PSA", "Werkzeug"],
    correct: "PSA",
  },
  {
    ...base("p-zuordnen"),
    type: "zuordnen",
    prompt: "Ordne zu.",
    pairs: [
      ["Helm", "Kopf"],
      ["Handschuh", "Hand"],
    ],
    correct: "Helm",
  },
  {
    ...base("p-reihenfolge"),
    type: "reihenfolge",
    prompt: "Bringe die Schritte in die richtige Reihenfolge.",
    steps: ["Gefahr erkennen", "Maschine stoppen", "Meldung machen"],
    correct: "Gefahr erkennen",
  },
  {
    ...base("p-rechnen"),
    type: "rechnen",
    level: "anwenden",
    prompt: "Wie viele Pausenminuten bei 8 Stunden Arbeit?",
    sampleSolution: "30 Minuten",
    sampleChecklist: ["Rechenweg notiert"],
    correct: "30 Minuten",
  },
];

async function vorbereiten(page: Page) {
  await page.route("**/api/learner/phase-a**", (route) =>
    route.fulfill({
      json: {
        courseId: "e22073de",
        keyword: "Maschinen- und Anlagenführer",
        phase: "A",
        unitCount: 1,
        units: [
          {
            id: "M0-1-u1",
            title: "Fragetypen",
            minutes: 6,
            explanation: "Kurz erklärt.",
            questions,
            sourceUrl: SOURCE,
            sourceFetchedAt: "2026-10-03",
            moduleId: "M0",
            blockId: "M0-1",
          },
        ],
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
}

const viewports = [
  { name: "Desktop", size: { width: 1280, height: 800 } },
  { name: "Handy", size: { width: 390, height: 844 } },
];

for (const vp of viewports) {
  test(`Prüfung mit allen Fragetypen bis zum Ergebnis (${vp.name})`, async ({ page }, info) => {
    await page.setViewportSize(vp.size);
    await vorbereiten(page);
    await page.goto("/pruefung");

    // Ehrlich: 5 Fragen, nicht aufgefüllt; die Dauer ist die angezeigte.
    await expect(page.getByText(/^120 Min · 5 Fragen/)).toBeVisible();
    await expect(page.getByText(/Es wird nichts aufgefüllt/)).toBeVisible();
    await page.getByRole("button", { name: "Prüfung starten" }).click();

    const pruefen = page.getByRole("button", { name: "Antwort prüfen" });
    const weiter = page.getByRole("button", { name: "Weiter", exact: true });

    await expect(page.getByText(/Frage 1\/5/)).toBeVisible();
    await page.getByRole("button", { name: "Der Betrieb", exact: true }).click();
    await pruefen.click();
    await expect(weiter).toBeVisible();
    await weiter.click();

    await expect(page.getByText(/Frage 2\/5/)).toBeVisible();
    await page.getByRole("button", { name: "PSA", exact: true }).click();
    await pruefen.click();
    await expect(weiter).toBeVisible();
    await weiter.click();

    await expect(page.getByText(/Frage 3\/5/)).toBeVisible();
    await page.getByLabel("Zuordnung für Helm").selectOption({ index: 1 });
    await page.getByLabel("Zuordnung für Handschuh").selectOption({ index: 1 });
    await pruefen.click();
    await expect(weiter).toBeVisible();
    await weiter.click();

    await expect(page.getByText(/Frage 4\/5/)).toBeVisible();
    await page.getByRole("button", { name: /nach oben$/ }).nth(1).click();
    await pruefen.click();
    await expect(weiter).toBeVisible();
    await weiter.click();

    await expect(page.getByText(/Frage 5\/5/)).toBeVisible();
    await page.getByLabel(/Deine Lösung/).fill("480 min minus 30 min");
    await page.getByRole("button", { name: "Musterlösung zeigen" }).click();
    await page.getByRole("checkbox", { name: "Rechenweg notiert" }).check();
    await page.getByRole("button", { name: "Selbstkontrolle speichern" }).click();
    await page.getByRole("button", { name: "Ergebnis je Gebiet" }).click();

    await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
    // Zwei richtige Auswahlfragen, die übrigen nicht (oder Selbstkontrolle): Ergebnis nennt 5 Fragen.
    await expect(page.getByText(/von 5/).first()).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`pruefung-ergebnis-${vp.name.toLowerCase()}.png`),
      fullPage: true,
    });
  });
}

test("Zeit läuft in echten Sekunden, Pause hält an, Ablauf beendet die Prüfung", async ({ page }) => {
  await page.clock.install();
  await vorbereiten(page);
  await page.goto("/pruefung");
  await page.getByRole("button", { name: "Prüfung starten" }).click();

  const zeit = page.locator("p", { hasText: "Restzeit" });
  await expect(zeit).toContainText("120:00");
  await page.clock.runFor(10_000);
  await expect(zeit).toContainText("119:50");

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(zeit).toContainText("Pause");
  await page.clock.runFor(60_000);
  await page.getByRole("button", { name: "Fortsetzen" }).click();
  await expect(zeit).toContainText("119:50");

  await page.clock.runFor(120 * 60 * 1000);
  await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
});
