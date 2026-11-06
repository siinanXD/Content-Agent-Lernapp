import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  const speichern = page.getByRole("button", { name: "Antwort speichern" });
  if (await speichern.isVisible()) {
    await speichern.click(); // Prüfungsmodus: offene Aufgabe wird gespeichert, Musterlösung erst im Ergebnis
    return "offen";
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
  await page.goto("/lernpfad/pfad");
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
  await page.getByRole("link", { name: "Einheit starten" }).click();
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

// Weg 4 (SIN-1516): Prüfung je Kurs bis zum Ergebnis, Handy und Desktop. Gebietstitel wie in der Map.
const PRUEFUNG_KURSE = [
  { name: "Maschinen- und Anlagenführer", id: "e22073de-7020-4380-9002-c70d46c25e25", map: "maf-metall.json", teil: "PT" },
  { name: "Industriekaufmann", id: "5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31", map: "indkfl.json", teil: "T1" },
];
const ANSICHTEN = [
  { name: "Handy", size: { width: 390, height: 844 } },
  { name: "Desktop", size: { width: 1280, height: 800 } },
];
const VORLAGENFRAGE = "Was ist der erste Schritt vor Aufnahme einer neuen Fertigungstätigkeit?";

for (const kurs of PRUEFUNG_KURSE) {
  for (const ansicht of ANSICHTEN) {
    test(`Weg 4: Prüfung ${kurs.name} läuft mit der angezeigten Dauer bis zum Ergebnis (${ansicht.name})`, async ({ page }, testInfo) => {
      await page.setViewportSize(ansicht.size);
      await anmelden(page);
      const map = JSON.parse(readFileSync(join(process.cwd(), "docs", "content", kurs.map), "utf8"));
      const teil = map.exam.gradedParts.find((p: { id: string }) => p.id === kurs.teil);
      await page.goto(`/pruefung?part=${kurs.teil}&kurs=${kurs.id}`);

      // Gebietstitel stehen wie in der Map, nirgends die Vorlagen oder die Prüfung eines anderen Kurses.
      const dauer = Number(/(\d+) Min/.exec((await page.getByText(/\d+ Min · \d+ Fragen/).first().textContent()) ?? "")?.[1]);
      expect(dauer, "angezeigte Dauer").toBe(Number(/(\d+) Minuten/.exec(teil.duration)![1]));
      for (const g of teil.gebiete) await expect(page.getByText(g.title, { exact: false }).first(), `Gebiet ${g.id}`).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`aufbau-${ansicht.name}.png`), fullPage: true });

      await page.getByRole("button", { name: "Prüfung starten" }).click();
      const uhr = page.locator("p", { hasText: /Restzeit/ });
      const [, m, sek] = /(\d+):(\d{2})/.exec((await uhr.textContent()) ?? "")!;
      expect(Number(m) * 60 + Number(sek), `Restzeit zu Beginn ${m}:${sek}, angezeigt waren ${dauer} Min`).toBeGreaterThanOrEqual(dauer * 60 - 10);

      const typen = new Set<string>();
      const letzte = page.getByRole("button", { name: "Ergebnis je Gebiet", exact: true });
      for (let guard = 0; guard < 60; guard++) {
        const frage = (await page.getByRole("heading", { level: 2 }).first().textContent()) ?? "";
        expect(frage, "Vorlagenfrage in der Prüfung").not.toContain(VORLAGENFRAGE);
        typen.add(await beantworten(page));
        // Die Lösung erscheint erst im Ergebnis: nach der Antwort nur „gespeichert“.
        await expect(page.getByText(/Antwort gespeichert/)).toBeVisible();
        await expect(page.getByTestId("answer-feedback")).toHaveCount(0);
        if (await letzte.isVisible()) {
          await letzte.click();
          break;
        }
        await page.getByRole("button", { name: "Weiter", exact: true }).click();
      }
      await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
      await expect(page.getByText("Nach Prüfungsgebiet")).toBeVisible();
      await expect(page.getByText("Nach Lernfeld")).toHaveCount(0);
      await page.getByRole("button", { name: /Antworten mit Lösung durchgehen/ }).click();
      await expect(page.getByText("Richtig:").first()).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`ergebnis-${ansicht.name}.png`), fullPage: true });
      console.log(`Fragetypen in der Prüfung (${kurs.name}, ${ansicht.name}): ${[...typen].join(", ")}`);
    });
  }
}

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

test("Weg 8: Pfad zeigt genau ein Modul mit Zähler, Fortschritt bleibt (SIN-1513, SIN-1455)", async ({ page }) => {
  await anmelden(page);
  await einheitDurchspielen(page, false);
  const erledigt = await anzahlErledigt(page);
  expect(erledigt, "abgeschlossene Einheit ohne Haken im Pfad").toBeGreaterThan(0);
  await expect(page.getByTestId("modul"), "Pfad zeigt genau ein Modul").toHaveCount(1);
  // Zähler im Kopf („N von M Einheiten“) = Haken im Pfad, auch nach Neuladen.
  const zaehler = async () => Number(/(\d+) von \d+ Einheiten/.exec(await page.locator("header").innerText())?.[1] ?? -1);
  expect(await zaehler(), "erledigt/gesamt im Modul").toBe(erledigt);
  await page.reload();
  await expect(page.getByTestId("modul")).toHaveCount(1);
  expect(await page.locator('[data-state="erledigt"]').count(), "erledigte Einheiten nach Neuladen").toBe(erledigt);
  expect(await zaehler(), "Modulzähler nach Neuladen").toBe(erledigt);
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

test("Weg 12: Gerätewechsel: ein frischer Browser mit demselben Konto zeigt denselben Stand (SIN-1451)", async ({ page, browser }, testInfo) => {
  await anmelden(page);
  await einheitDurchspielen(page, false);
  const a = { haken: await anzahlErledigt(page), profil: await lerntage(page) };
  // Frischer Kontext = anderes Gerät: kein Speicher, keine Sitzung. Der Abgleich mit dem Konto braucht einen Moment.
  const { baseURL, viewport, hasTouch, extraHTTPHeaders } = testInfo.project.use;
  const geraetB = await browser.newContext({ baseURL, viewport, hasTouch, extraHTTPHeaders });
  try {
    const b = await geraetB.newPage();
    await anmelden(b);
    await expect.poll(() => anzahlErledigt(b), { timeout: 30_000, message: "Haken auf dem zweiten Gerät" }).toBe(a.haken);
    expect((await lerntage(b)).done, "Lerntage auf dem zweiten Gerät").toBe(a.profil.done);
  } finally {
    await geraetB.close();
  }
});
