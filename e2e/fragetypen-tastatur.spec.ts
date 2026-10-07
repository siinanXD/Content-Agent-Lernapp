import { test, expect, type Locator, type Page } from "@playwright/test";

// SIN-326: Alle 5 Fragetypen der Einheit (Auswahl, Lücke, Zuordnen, Reihenfolge, offene Rechenaufgabe)
// lassen sich nur mit der Tastatur beantworten; Feedback und Ergebnis folgen.

const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";

const base = (id: string) => ({
  id,
  level: "verstehen",
  explanation: "Kurz erklärt.",
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  examAreas: ["WISO-1"],
});

const questions = [
  {
    ...base("q-single"),
    type: "single",
    prompt: "Wer trägt die Kosten für Schutzkleidung?",
    choices: ["Der Betrieb", "Die Auszubildenden"],
    correct: "Der Betrieb",
  },
  {
    ...base("q-luecke"),
    type: "lueckentext",
    prompt: "Der Betrieb stellt ___ kostenlos.",
    blanks: ["PSA", "Werkzeug"],
    correct: "PSA",
  },
  {
    ...base("q-zuordnen"),
    type: "zuordnen",
    prompt: "Ordne zu.",
    pairs: [
      ["Helm", "Kopf"],
      ["Handschuh", "Hand"],
    ],
    correct: "Helm",
  },
  {
    ...base("q-reihenfolge"),
    type: "reihenfolge",
    prompt: "Bringe die Schritte in die richtige Reihenfolge.",
    steps: ["Gefahr erkennen", "Maschine stoppen", "Meldung machen"],
    correct: "Gefahr erkennen",
  },
  {
    ...base("q-rechnen"),
    type: "rechnen",
    level: "anwenden",
    prompt: "Wie viele Pausenminuten bei 8 Stunden Arbeit?",
    sampleSolution: "30 Minuten",
    sampleChecklist: ["Rechenweg notiert"],
    correct: "30 Minuten",
  },
];

const unit = {
  id: "M0-1-u1",
  title: "Fragetypen",
  minutes: 6,
  explanation: "Kurz erklärt.",
  questions,
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  moduleId: "M0",
  blockId: "M0-1",
};

const MAX_TABS = 60;

async function tabTo(page: Page, target: Locator, label: string) {
  await expect(target.first(), `${label} ist sichtbar`).toBeVisible();
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    if (await target.first().evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`${label} ist per Tab nicht erreichbar`);
}

async function activate(page: Page, target: Locator, label: string, key = "Enter") {
  await tabTo(page, target, label);
  await page.keyboard.press(key);
}

test("alle 5 Fragetypen per Tastatur bedienbar", async ({ page }) => {
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
  await page.goto("/einheit/M0-1-u1");
  const feedback = page.getByTestId("answer-feedback");
  const weiter = (last = false) =>
    page.getByRole("button", { name: last ? "Ergebnis anzeigen" : "Weiter", exact: true });
  const pruefen = page.getByRole("button", { name: "Antwort prüfen" });

  // 1 Auswahl
  await expect(page.getByText(/^Frage 1 von 5/)).toBeVisible();
  await activate(page, page.getByRole("button", { name: "Der Betrieb", exact: true }), "Option", "Space");
  await activate(page, pruefen, "Antwort prüfen");
  await expect(feedback).toHaveAttribute("data-correct", "true");
  await activate(page, weiter(), "Weiter");

  // 2 Lücke
  await expect(page.getByText(/^Frage 2 von 5/)).toBeVisible();
  await activate(page, page.getByRole("button", { name: "PSA", exact: true }), "Wort", "Space");
  await activate(page, pruefen, "Antwort prüfen");
  await expect(feedback).toHaveAttribute("data-correct", "true");
  await activate(page, weiter(), "Weiter");

  // 3 Zuordnen: Auswahlfelder mit Pfeiltasten
  await expect(page.getByText(/^Frage 3 von 5/)).toBeVisible();
  for (const left of ["Helm", "Handschuh"]) {
    const select = page.getByLabel(`Zuordnung für ${left}`);
    await tabTo(page, select, `Zuordnung ${left}`);
    await page.keyboard.press("ArrowDown");
    await expect(select).not.toHaveValue("");
  }
  await activate(page, pruefen, "Antwort prüfen");
  await expect(feedback).toBeVisible();
  await activate(page, weiter(), "Weiter");

  // 4 Reihenfolge: Schritte mit den Pfeil-Buttons verschieben
  await expect(page.getByText(/^Frage 4 von 5/)).toBeVisible();
  await activate(page, page.getByRole("button", { name: /nach oben$/ }).nth(1), "Nach oben");
  await activate(page, pruefen, "Antwort prüfen");
  await expect(feedback).toBeVisible();
  await activate(page, weiter(), "Weiter");

  // 5 Offene Aufgabe: Eingabe, Musterlösung, Selbstkontrolle
  await expect(page.getByText(/^Frage 5 von 5/)).toBeVisible();
  const field = page.getByLabel(/Deine Lösung/);
  await tabTo(page, field, "Lösungsfeld");
  await page.keyboard.type("480 min minus 30 min");
  await activate(page, page.getByRole("button", { name: "Musterlösung zeigen" }), "Musterlösung zeigen");
  await activate(page, page.getByRole("checkbox", { name: "Rechenweg notiert" }), "Checkliste", "Space");
  await activate(page, page.getByRole("button", { name: "Selbstkontrolle speichern" }), "Selbstkontrolle");
  await expect(feedback).toBeVisible();
  await activate(page, weiter(true), "Ergebnis anzeigen");

  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByRole("heading", { level: 1, name: "Einheit geschafft" })).toBeVisible();
});
