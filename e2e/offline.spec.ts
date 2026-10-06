import { test, expect } from "@playwright/test";

// SIN-256: Eine geladene Einheit lässt sich ohne Netz bis zum Ergebnis bearbeiten;
// die Antworten warten lokal und gehen nach Netzrückkehr an /api/progress.
// Phase-A-Antwort und /api/progress sind vorgegeben: keine Live-Keys nötig.

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

const units = Array.from({ length: 8 }, (_, i) => ({
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

test("Geladene Einheit offline bis zum Ergebnis, Antworten kommen nach Netzrückkehr an", async ({
  page,
  context,
}) => {
  // context.route greift auch für Anfragen des Service Workers.
  await context.route("**/api/learner/phase-a", (route) =>
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
  const received: { questionId: string; correct: boolean; anonymousId: string }[] = [];
  await context.route("**/api/progress", (route) => {
    received.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { ok: true } });
  });

  // Online: Worker aktivieren, Einheit und Ergebnis einmal laden (kommen in den Cache).
  await page.goto("/lernpfad");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto("/ergebnis");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/einheit/M0-1-u1");
  await expect(page.getByText(/^Frage 1 von 2/)).toBeVisible();
  await expect(page.locator('[data-state-kind="offline"]')).toHaveCount(0);

  // Netz weg, harter Neuaufruf: Einheit kommt aus dem Cache, Hinweis erscheint.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Berufsbildung 1" })).toBeVisible();
  await expect(page.locator('[data-state-kind="offline"]')).toContainText("Antworten werden gespeichert");

  for (const last of [false, true]) {
    await page.getByRole("button", { name: "Der Betrieb", exact: true }).click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    await expect(page.getByTestId("answer-feedback")).toBeVisible();
    await page
      .getByRole("button", { name: last ? "Ergebnis anzeigen" : "Weiter", exact: true })
      .click();
  }
  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByRole("heading", { name: "Einheit geschafft" })).toBeVisible();

  // Offline: zwei Antworten warten, nichts ging verloren, nichts wurde gesendet.
  const outbox = () =>
    page.evaluate(() => JSON.parse(window.localStorage.getItem("cal-progress-outbox") ?? "[]"));
  expect(await outbox()).toHaveLength(2);
  expect(received).toHaveLength(0);

  // Netz zurück: Warteschlange wird geleert.
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => received.length).toBe(2);
  expect(received.map((r) => r.questionId)).toEqual(["M0-1-u1-q1", "M0-1-u1-q2"]);
  expect(received.every((r) => r.correct && r.anonymousId)).toBe(true);
  await expect.poll(outbox).toHaveLength(0);
});
