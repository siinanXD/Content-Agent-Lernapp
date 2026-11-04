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
  // Module sind eingeklappt (SIN-1513): sichtbar ist zuerst die Modulzeile, gezählt wird im ganzen Pfad.
  await expect(page.getByTestId("modul").first()).toBeVisible();
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

test("Weg 5: Falsche Antwort ist in der Wiederholung sofort übbar", async ({ page }, testInfo) => {
  await anmelden(page);
  await einheitDurchspielen(page, true);
  // Dieselbe Stapelzahl in Lernpfad-Karte, Profil und Wiederholungsseite (SIN-1450).
  const stapelKachel = (seite: Page) => seite.locator("p", { hasText: /^Stapel$/ }).locator("xpath=following-sibling::p[1]");
  await page.goto("/lernpfad");
  const karte = await page.getByRole("region", { name: "Wiederholung" }).getByText(/\d+ Fragen? im Stapel|Stapel mit \d+/).textContent();
  const imLernpfad = Number(/(\d+)/.exec(karte ?? "")?.[1]);
  expect(imLernpfad, "Stapel im Lernpfad nach falschen Antworten").toBeGreaterThan(0);
  await page.goto("/profil");
  await expect(stapelKachel(page), "Stapel im Profil").toHaveText(String(imLernpfad));
  await page.goto("/wiederholung");
  await expect(stapelKachel(page), "Stapel auf der Wiederholungsseite").toHaveText(String(imLernpfad));
  // Direkt nach dem Lernen ist nichts fällig; „Jetzt üben“ startet die Runde trotzdem.
  const ueben = page.getByRole("button", { name: "Jetzt üben", exact: true });
  if (await ueben.isVisible()) {
    await testInfo.attach("wiederholung-leer", { body: await page.screenshot(), contentType: "image/png" });
    await ueben.click();
  }
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

test("Weg 8: Lernpfad zeigt zuerst Module, aufklappbar, Fortschritt bleibt (SIN-1513)", async ({ page }) => {
  await anmelden(page);
  await einheitDurchspielen(page, false);
  const erledigt = await anzahlErledigt(page);
  expect(erledigt, "abgeschlossene Einheit ohne Haken im Lernpfad").toBeGreaterThan(0);
  const moduleZeilen = page.getByTestId("modul");
  const offen = page.locator('details[data-testid="modul"][open]');
  expect(await offen.count(), "höchstens das Modul mit der nächsten Einheit ist offen").toBeLessThanOrEqual(1);
  if ((await moduleZeilen.count()) > 1) {
    const sichtbar = await page.locator("[data-state]:visible").count();
    expect(sichtbar, "Einheiten sichtbar, obwohl Module eingeklappt sein sollen").toBeLessThan(await page.locator("[data-state]").count());
    // Index festhalten: ein Locator mit :not([open]) würde nach dem Klick auf das nächste Modul zeigen.
    const index = await moduleZeilen.evaluateAll((els) => els.findIndex((el) => !(el as HTMLDetailsElement).open));
    const zu = moduleZeilen.nth(index);
    await zu.locator("summary").click();
    await expect(zu.locator("[data-state]").first()).toBeVisible();
  }
  // Zähler je Modul: Summe der erledigten Einheiten = Haken im Pfad, auch nach Neuladen.
  const summe = async () => {
    const texte = await moduleZeilen.locator("summary").allInnerTexts();
    return texte.reduce((n, t) => n + Number(/(\d+) \/ \d+\s*$/.exec(t.trim())?.[1] ?? 0), 0);
  };
  expect(await summe(), "erledigt/gesamt je Modul").toBe(erledigt);
  await page.reload();
  await expect(moduleZeilen.first()).toBeVisible();
  expect(await page.locator('[data-state="erledigt"]').count(), "erledigte Einheiten nach Neuladen").toBe(erledigt);
  expect(await summe(), "Modulzähler nach Neuladen").toBe(erledigt);
});

test("Weg 9: Einheit hat Zurück und behält den Stand nach Neuladen, Abmelden führt zur Startseite (SIN-1514)", async ({ page }) => {
  await anmelden(page);
  await page.goto("/lernpfad");
  await page.locator('[data-state="heute"]').first().click();
  await expect(page).toHaveURL(/\/einheit\//);
  await expect(page.getByRole("link", { name: /Zurück zum Lernpfad/ })).toBeVisible();
  const zaehler = page.getByText(/^Frage \d+ von \d+/);
  const erste = (await zaehler.textContent()) ?? "";
  if (!/^Frage (\d+) von \1\b/.test(erste)) {
    await beantworten(page);
    // Neuladen nach der Antwort, vor „Weiter“: dieselbe Frage, nichts doppelt gespeichert.
    await page.reload();
    await expect(page.getByText(/^Frage \d+ von \d+/)).toHaveText(erste);
    await beantworten(page);
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(zaehler).not.toHaveText(erste);
    const zweite = (await zaehler.textContent()) ?? "";
    await page.reload();
    await expect(page.getByText(/^Frage \d+ von \d+/)).toHaveText(zweite);
  }
  await page.goto("/profil");
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("Weg 10: Beispiel beenden beendet den Beispielmodus sichtbar (SIN-1514)", async ({ page }) => {
  await page.goto("/lernpfad?demo=1");
  const hinweis = page.getByRole("note").filter({ hasText: "Beispiel: Die Zahlen" });
  await expect(hinweis).toBeVisible();
  await hinweis.getByRole("link", { name: "Beispiel beenden" }).click();
  await expect(page).toHaveURL(/\/\?demo=0$/);
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("cal-demo"))).toBeNull();
  await expect(page.getByRole("note").filter({ hasText: "Beispiel: Die Zahlen" })).toHaveCount(0);
});

test("Weg 11: Die Navigation steht auf jeder Hauptseite fest unten, auch im langen Lernpfad (SIN-1514)", async ({ page }) => {
  await anmelden(page);
  const hoehe = page.viewportSize()!.height;
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  const unterkante = () => nav.evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
  for (const pfad of ["/lernpfad", "/wiederholung", "/pruefung", "/profil", "/einstellungen"]) {
    await page.goto(pfad);
    await expect(nav).toBeVisible();
    expect(await unterkante(), `Navigation oben auf ${pfad}`).toBe(hoehe);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    expect(await unterkante(), `Navigation in der Mitte von ${pfad}`).toBe(hoehe);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(await unterkante(), `Navigation am Ende von ${pfad}`).toBe(hoehe);
  }
});
