import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { routes } from "../e2e/routes";

// Live-Check (SIN-319): Checkliste docs/ops/live-checkliste.md, jede Kennung (z. B. UI-01) steht dort und im Testtitel.
// Läuft gegen die laufende App (Handy + Desktop). Lerndaten sind im Test fest vorgegeben, schreibende Endpunkte
// werden abgefangen. So bleiben echte Nutzerdaten unberührt, und der Test prüft trotzdem den ausgelieferten Code.

const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
const base = { sourceUrl: SOURCE, sourceFetchedAt: "2026-10-03", examAreas: ["WISO-1"] };
const questions = [
  { id: "q1", type: "auswahl", prompt: "Welches Zeichen verlangt Gehörschutz?", choices: ["Blaues Gebot", "Gelbes Warnzeichen"], correct: "Blaues Gebot", explanation: "Gebotszeichen sind blau.", ...base },
  { id: "q2", type: "lueckentext", prompt: "Persönliche Schutzausrüstung heißt kurz ____.", blanks: ["PSA", "SPS"], correct: "PSA", explanation: "PSA.", ...base },
  { id: "q3", type: "zuordnen", prompt: "Ordne Gefahr und Schutz zu.", pairs: [["Lärm", "Gehörschutz"], ["Späne", "Augenschutz"]], choices: ["Gehörschutz", "Augenschutz"], correct: ["Gehörschutz", "Augenschutz"], explanation: "Passender Schutz.", ...base },
  { id: "q4", type: "reihenfolge", prompt: "Bringe die Schritte in Reihenfolge.", steps: ["Lesen", "Anlegen"], choices: ["Lesen → Anlegen", "Anlegen → Lesen"], correct: "Lesen → Anlegen", explanation: "Erst lesen.", ...base },
  { id: "q5", type: "rechnen", prompt: "95 dB minus 25 dB ergibt?", choices: ["70 dB", "120 dB"], correct: "70 dB", explanation: "95 − 25 = 70.", sampleSolution: "95 − 25 = 70 dB.", sampleChecklist: ["Abgezogen"], ...base },
];
const units = [1, 2].map((n) => ({
  id: `M0-1-u${n}`,
  title: `Live-Check Einheit ${n}`,
  minutes: 6,
  explanation: "Kurz erklärt.",
  questions: questions.map((q) => ({ ...q, id: `u${n}-${q.id}` })),
  moduleId: "M0",
  blockId: "M0-1",
  ...base,
}));

/** Feste Lerndaten, Schreib-Endpunkte abgefangen (greift auch für den Service Worker). */
async function stubData(context: BrowserContext) {
  await context.route("**/api/learner/phase-a", (r) =>
    r.fulfill({ json: { courseId: "live-check", keyword: "Live-Check", phase: "A", unitCount: units.length, units, source: "supabase" } }),
  );
  await context.route("**/api/progress", (r) => r.fulfill({ status: 201, json: { ok: true } }));
  await context.route("**/api/demo", (r) => r.fulfill({ status: 201, json: { ok: true } }));
}

/** Beantwortet die offene Frage, egal welcher Typ (Auswahlfelder, Optionen, Musterlösung). */
async function answerCurrent(page: Page) {
  const selects = page.locator("select");
  for (let i = 0; i < (await selects.count()); i++) await selects.nth(i).selectOption({ index: 1 });
  const options = page.locator("button[aria-pressed]");
  if ((await options.count()) > 0) await options.first().click();
  const sample = page.getByRole("button", { name: "Musterlösung zeigen" });
  if (await sample.isVisible()) {
    await page.getByRole("textbox").fill("Eigener Lösungsversuch");
    await sample.click();
    await page.getByRole("button", { name: "Selbstkontrolle speichern" }).click();
    return;
  }
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
}

/** Spielt alle Fragen der offenen Einheit durch und öffnet das Ergebnis. */
async function playUnit(page: Page) {
  const counter = page.getByText(/^Frage \d+ von \d+/);
  for (let guard = 0; guard < 30; guard++) {
    const progress = (await counter.textContent()) ?? "";
    const feedback = page.getByTestId("answer-feedback");
    if (!(await feedback.isVisible())) await answerCurrent(page);
    await expect(feedback).toBeVisible();
    if (/^Frage (\d+) von \1\b/.test(progress)) {
      await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
      return;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(counter).not.toHaveText(progress);
  }
  throw new Error("Einheit endet nicht nach 30 Schritten.");
}

const IGNORED_CONSOLE = /Failed to load resource|sentry|posthog|ERR_BLOCKED/i;

// UI-01 Seiten (Handy + Desktop) und UI-02 Konsole ohne Fehler: eine Prüfung je Seite.
for (const route of routes) {
  test(`UI-01 Seite ${route} lädt, Konsole ohne Fehler`, async ({ page, context }) => {
    await stubData(context);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !IGNORED_CONSOLE.test(m.text())) errors.push(`console: ${m.text()}`);
    });
    const res = await page.goto(route, { waitUntil: "networkidle" });
    expect(res?.status(), `HTTP-Status von ${route}`).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });
}

// UI-03 axe auf den Hauptseiten (nur Desktop).
for (const route of ["/", "/willkommen", "/lernpfad", "/einheit/M0-1-u1", "/profil", "/einstellungen", "/pruefung", "/demo"]) {
  test(`UI-03 axe ${route}`, async ({ page, context }, info) => {
    test.skip(info.project.name !== "desktop", "axe läuft einmal, auf dem Desktop");
    await stubData(context);
    await page.goto(route, { waitUntil: "networkidle" });
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(r.violations, JSON.stringify(r.violations, null, 2)).toHaveLength(0);
  });
}

test("UI-04 Onboarding: Willkommen → Einwilligung → Beruf → Schwerpunkt → Lernpfad", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/willkommen");
  await page.getByRole("link", { name: "Los geht’s" }).click();
  await expect(page).toHaveURL(/\/einwilligung$/);
  await page.getByRole("button", { name: "Ablehnen" }).click();
  // N1 Beruf wählen (SIN-414): neuer Schritt vor dem Schwerpunkt.
  await expect(page).toHaveURL(/\/beruf$/);
  await page.getByRole("button", { name: /Maschinen- und Anlagenführer/ }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page).toHaveURL(/\/schwerpunkt$/);
  await page.getByRole("button", { name: "Metall + Kunststoff" }).click();
  await page.getByRole("button", { name: "Lernpfad erstellen", exact: true }).click();
  await expect(page).toHaveURL(/\/lernpfad$/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("UI-05 Einheit: Erklärung und alle 5 Fragetypen, danach Ergebnis", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/einheit/M0-1-u1");
  await expect(page.getByRole("heading", { name: "Live-Check Einheit 1" })).toBeVisible();
  await expect(page.getByText("Kurz erklärt.")).toBeVisible();
  // Auswahl, Lückentext, Zuordnen (Auswahlfelder), Reihenfolge, Rechnen (Musterlösung).
  await expect(page.getByText(/^Frage 1 von 5/)).toBeVisible();
  await playUnit(page);
  await expect(page).toHaveURL(/\/ergebnis$/);
  await expect(page.getByRole("heading", { name: "Einheit geschafft" })).toBeVisible();
});

test("UI-06 Wiederholung öffnet", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/einheit/M0-1-u1");
  await playUnit(page);
  await page.getByRole("link", { name: "Zur Wiederholung" }).click();
  await expect(page).toHaveURL(/\/wiederholung$/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("UI-07 Prüfung starten, abgeben, Ergebnis", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/pruefung");
  await expect(page.getByRole("heading", { name: "Prüfungsmodus" })).toBeVisible();
  await page.getByRole("button", { name: "Prüfung starten" }).click();
  await expect(page.getByText(/Frage 1\/\d+/)).toBeVisible();
  const last = page.getByRole("button", { name: "Ergebnis je Gebiet", exact: true });
  for (let guard = 0; guard < 40; guard++) {
    await answerCurrent(page);
    if (await last.isVisible()) {
      await last.click();
      break;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
  await expect(page.getByRole("heading", { name: /der Bestehensgrenze$/ })).toBeVisible();
});

test("UI-08 Profil und Einstellungen/Datennutzung", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/profil");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.goto("/einstellungen");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByText(/Nutzungsdaten/).first()).toBeVisible();
});

test("UI-09 Ausbilder-Ansicht mit Test-Gruppe", async ({ page, context }) => {
  await stubData(context);
  await context.route("**/api/ausbilder/gruppe", (r) =>
    r.fulfill({
      json: {
        group: { name: "Gruppe Live-Check", schwerpunkt: "Metall- und Kunststofftechnik", examDate: "2027-03-12", startsOn: "2026-10-01" },
        members: [{ id: "1", name: "Test A.", progressPercent: 50, lastActiveAt: new Date().toISOString() }],
      },
    }),
  );
  await page.goto("/ausbilder");
  await expect(page.getByRole("heading", { level: 1, name: "Gruppenübersicht" })).toBeVisible();
  await expect(page.getByText("Gruppe Live-Check")).toBeVisible();
});

test("UI-10 Demo-Anfrage im Testmodus (abgefangen, kein Versand)", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/demo");
  await page.getByLabel("Bildungsträger").fill("Live-Check");
  await page.getByLabel("Ansprechperson").fill("Live-Check");
  await page.getByLabel("Dienstliche E-Mail").fill("live-check@example.invalid");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Demo-Zugang anfragen" }).click();
  await expect(page.getByRole("heading", { name: "Danke für Ihre Anfrage." })).toBeVisible();
});

test("UI-11 Anmelden-Seite zeigt Formular oder klare Meldung", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/anmelden");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("UI-12 Offline-Modus: geladene Einheit bleibt offline lesbar", async ({ page, context }) => {
  await stubData(context);
  await page.goto("/lernpfad");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto("/einheit/M0-1-u1");
  await expect(page.getByText(/^Frage 1 von 5/)).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Live-Check Einheit 1" })).toBeVisible();
  await context.setOffline(false);
});

test("UI-13 Service-Worker liefert die neue Version", async ({ page, request }) => {
  const res = await request.get("/sw.js");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/javascript/);
  await page.goto("/lernpfad");
  const state = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await reg.update();
    return { active: reg.active?.state, keys: await caches.keys() };
  });
  expect(state.active).toBe("activated");
  expect(state.keys.filter((k) => k.startsWith("cal-shell-")).length).toBeGreaterThan(0);
});
