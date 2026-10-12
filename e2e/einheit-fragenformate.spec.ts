import { test, expect } from "@playwright/test";

// SIN-384 (Fixes CONTENT-AGENT-LERNAPP-1): Einheit mit den Formen aus Supabase (Paare als Objekte,
// Lücken mit options/accepted, rechnen mit { value, unit }, Typ-Aliase) lässt sich bis zum Ergebnis
// durchspielen. Die Antwort von /api/learner/phase-a ist fest vorgegeben (ohne Live-Keys).

const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
const base = (id: string) => ({
  id,
  level: "verstehen",
  explanation: "Kurz erklärt.",
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-12",
  examAreas: ["PT-a"],
});

const unit = {
  id: "LF1-1-u11",
  title: "Maßstab und Zeichnung",
  minutes: 6,
  explanation: "Kurz erklärt.",
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-12",
  moduleId: "LF1",
  blockId: "LF1-1",
  questions: [
    {
      ...base("q-zuordnen"),
      type: "zuordnen",
      prompt: "Ordne zu.",
      pairs: [
        { left: "Maßstab", right: "Verhältnis Zeichnung zu Werkstück" },
        { left: "Toleranz", right: "erlaubte Abweichung" },
      ],
      correct: "Maßstab",
    },
    {
      ...base("q-luecke"),
      type: "lueckentext",
      prompt: "Der {{b1}} steht im Schriftfeld.",
      blanks: [{ id: "b1", options: ["Maßstab", "Preis"] }],
      correct: ["Maßstab"],
    },
    {
      ...base("q-luecke-frei"),
      type: "fill",
      prompt: "Die Einheit der Kraft ist {{1}}.",
      blanks: [{ id: "1", accepted: ["Newton", "N"] }],
      correct: "Newton",
    },
    {
      ...base("q-rechnen"),
      type: "numeric",
      level: "anwenden",
      prompt: "Wie lang ist 5 cm bei 1:2?",
      correct: { value: 10, unit: "cm" },
    },
  ],
};

test("Einheit mit erzeugten Fragenformaten lässt sich bis zum Ergebnis durchspielen", async ({ page }) => {
  await page.route("**/api/learner/phase-a", (route) =>
    route.fulfill({
      json: {
        courseId: "e22073de",
        keyword: "Maschinen- und Anlagenführer",
        phase: "A",
        unitCount: 1,
        units: [unit],
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
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/einheit/LF1-1-u11");
  const pruefen = page.getByRole("button", { name: "Antwort prüfen" });
  const weiter = (last = false) =>
    page.getByRole("button", { name: last ? "Ergebnis anzeigen" : "Weiter", exact: true });

  await expect(page.getByText(/^Frage 1 von 4/)).toBeVisible();
  await page.getByLabel("Zuordnung für Maßstab").selectOption("Verhältnis Zeichnung zu Werkstück");
  await page.getByLabel("Zuordnung für Toleranz").selectOption("erlaubte Abweichung");
  await pruefen.click();
  await weiter().click();

  await expect(page.getByText(/^Frage 2 von 4/)).toBeVisible();
  await page.getByRole("button", { name: "Maßstab", exact: true }).click();
  await pruefen.click();
  await weiter().click();

  await expect(page.getByText(/^Frage 3 von 4/)).toBeVisible();
  await page.getByLabel("Lücke 1").fill(" newton ");
  await pruefen.click();
  await expect(page.getByTestId("answer-feedback")).toHaveAttribute("data-correct", "true");
  await weiter().click();

  await expect(page.getByText(/^Frage 4 von 4/)).toBeVisible();
  await page.getByLabel(/Deine Lösung/).fill("10 cm");
  await page.getByRole("button", { name: "Musterlösung zeigen" }).click();
  await expect(page.getByText("10 cm").last()).toBeVisible();
  await page.getByRole("button", { name: "Selbstkontrolle speichern" }).click();
  await weiter(true).click();

  await expect(page).toHaveURL(/\/ergebnis$/);
  expect(errors).toEqual([]);
});
