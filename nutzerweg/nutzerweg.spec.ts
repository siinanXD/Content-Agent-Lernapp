import { test, expect, type Page } from "@playwright/test";

// SIN-1453: Nutzerwege, fachlich richtig. Jeder Test ist ein Weg; rot heißt: ein Mensch würde es merken.
// Läuft gegen LIVE_URL mit dem Testkonto (TESTNUTZER_EMAIL / TESTNUTZER_PASSWORT). Das Passwort wird nie ausgegeben.
// Format und Optik misst die Klickprobe im Leitstand, nicht dieser Lauf.
// shortcut: Fragetypen werden nur so geprüft, wie sie in Prüfung und Einheit des Testkontos vorkommen; ausbauen, wenn es einen Kurs mit allen Typen gibt.

const email = process.env.TESTNUTZER_EMAIL;
const passwort = process.env.TESTNUTZER_PASSWORT;
test.beforeAll(() => {
  if (!email || !passwort) throw new Error("TESTNUTZER_EMAIL und TESTNUTZER_PASSWORT fehlen.");
});

async function anmelden(page: Page) {
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail").fill(email!);
  await page.getByLabel("Passwort", { exact: true }).fill(passwort!);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).not.toHaveURL(/\/anmelden/, { timeout: 20_000 });
}

/** Beantwortet die aktuelle Frage (Auswahl, Auswahlfelder, Text) und prüft sie. Liefert den Fragetyp. */
async function beantworten(page: Page, falsch = false): Promise<string> {
  let typ = "unbekannt";
  const selects = page.locator("select");
  for (let i = 0; i < (await selects.count()); i++) {
    await selects.nth(i).selectOption({ index: 1 });
    typ = "auswahlfelder";
  }
  const optionen = page.locator("button[aria-pressed]");
  if ((await optionen.count()) > 0) {
    await (falsch ? optionen.last() : optionen.first()).click();
    typ = "auswahl";
  }
  const textfeld = page.getByRole("textbox");
  if ((await textfeld.count()) > 0) {
    await textfeld.first().fill("Eigener Lösungsversuch");
    typ = "text";
  }
  const muster = page.getByRole("button", { name: "Musterlösung zeigen" });
  if (await muster.isVisible()) {
    await muster.click();
    await page.getByRole("button", { name: "Selbstkontrolle speichern" }).click();
    return "offen";
  }
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  return typ;
}

async function anzahlErledigt(page: Page) {
  await page.goto("/lernpfad");
  await expect(page.locator("[data-state]").first()).toBeVisible();
  return page.locator('[data-state="erledigt"]').count();
}

async function lerntage(page: Page) {
  await page.goto("/profil");
  const kopf = page.getByText(/\d+ von \d+ Lerntagen · \d+ % des Plans/);
  await expect(kopf).toBeVisible();
  const [, done, total, pct] = /(\d+) von (\d+) Lerntagen · (\d+) %/.exec((await kopf.textContent()) ?? "")!;
  return { done: Number(done), total: Number(total), pct: Number(pct) };
}

/** Spielt die heutige Einheit bis zum Ergebnis. Liefert die gesehenen Fragetypen. */
async function einheitDurchspielen(page: Page, falsch: boolean) {
  await page.goto("/lernpfad");
  await page.locator('[data-state="heute"]').first().click();
  await expect(page).toHaveURL(/\/einheit\//);
  const typen: string[] = [];
  const zaehler = page.getByText(/^Frage \d+ von \d+/);
  for (let guard = 0; guard < 30; guard++) {
    const stand = (await zaehler.textContent()) ?? "";
    typen.push(await beantworten(page, falsch));
    await expect(page.getByTestId("answer-feedback")).toBeVisible();
    if (/^Frage (\d+) von \1\b/.test(stand)) {
      await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
      break;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(zaehler).not.toHaveText(stand);
  }
  await expect(page).toHaveURL(/\/ergebnis$/);
  return typen;
}

test("Weg 1: Anmelden mit dem Testkonto führt in die App", async ({ page }) => {
  await anmelden(page);
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
});

test("Weg 2: Haken und Prozent im Lernpfad stimmen mit dem echten Stand überein", async ({ page }) => {
  await anmelden(page);
  const erledigt = await anzahlErledigt(page);
  const { done, total, pct } = await lerntage(page);
  expect(pct, "Prozent müssen aus Lerntagen folgen").toBe(Math.min(100, Math.round((done / total) * 100)));
  // Ohne einen einzigen Lerntag darf kein Haken stehen und der Stand muss 0 % sein.
  if (done === 0) {
    expect(erledigt, "Einheiten mit Haken, obwohl noch nie gelernt wurde").toBe(0);
    expect(pct).toBe(0);
  }
});

test("Weg 3: Einheit abschließen erhöht den Stand", async ({ page }) => {
  await anmelden(page);
  const vorher = { haken: await anzahlErledigt(page), profil: await lerntage(page) };
  await einheitDurchspielen(page, false);
  await expect(page.getByRole("heading", { name: "Einheit geschafft" })).toBeVisible();
  const nachher = { haken: await anzahlErledigt(page), profil: await lerntage(page) };
  expect(nachher.haken, "Haken im Lernpfad nach der Einheit").toBeGreaterThan(vorher.haken);
  expect(nachher.profil.pct).toBeGreaterThanOrEqual(vorher.profil.pct);
});

test("Weg 4: Prüfung läuft mit der angezeigten Dauer bis zum Ergebnis", async ({ page }) => {
  await anmelden(page);
  await page.goto("/pruefung");
  const dauer = Number(/(\d+) Min/.exec((await page.getByText(/\d+ Min · \d+ Fragen/).first().textContent()) ?? "")?.[1]);
  expect(dauer).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Prüfung starten" }).click();
  const uhr = page.locator("p", { hasText: /Restzeit/ });
  const [, m, s] = /(\d+):(\d{2})/.exec((await uhr.textContent()) ?? "")!;
  const sekunden = Number(m) * 60 + Number(s);
  expect(sekunden, `Restzeit zu Beginn ${m}:${s}, angezeigt waren ${dauer} Min`).toBeGreaterThanOrEqual(dauer * 60 - 10);
  const typen = new Set<string>();
  const letzte = page.getByRole("button", { name: "Ergebnis je Gebiet", exact: true });
  for (let guard = 0; guard < 30; guard++) {
    typen.add(await beantworten(page));
    if (await letzte.isVisible()) {
      await letzte.click();
      break;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
  console.log(`Fragetypen in der Prüfung: ${[...typen].join(", ")}`);
});

test("Weg 5: Falsche Antwort ist in der Wiederholung sofort übbar", async ({ page }) => {
  await anmelden(page);
  await einheitDurchspielen(page, true);
  await page.goto("/wiederholung");
  await expect(page.getByText(/^Wiederholung \d+ von \d+/), "falsch beantwortete Fragen sind nicht sofort übbar").toBeVisible();
});

test("Weg 6: Die Woche im Profil beginnt am Montag", async ({ page }) => {
  await anmelden(page);
  await page.goto("/profil");
  const tage = page.locator('[aria-labelledby="woche-titel"] li');
  await expect(tage).toHaveCount(7);
  expect(await tage.first().getAttribute("aria-label")).toMatch(/^Mo/);
});

test("Weg 7: Die Navigation ist auf jeder Hauptseite und in der Prüfung sichtbar", async ({ page }) => {
  await anmelden(page);
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  for (const pfad of ["/lernpfad", "/wiederholung", "/pruefung", "/profil"]) {
    await page.goto(pfad);
    await expect(nav, `Navigation fehlt auf ${pfad}`).toBeVisible();
  }
  await page.goto("/pruefung");
  await page.getByRole("button", { name: "Prüfung starten" }).click();
  await expect(nav, "Navigation fehlt in der laufenden Prüfung").toBeVisible();
});
