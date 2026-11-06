import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { KFM_ID, MAF_ID, kursMocken, pruefungSpielen } from "./pruefung-mock";

// Weg-Test SIN-1516 (Präfix weg-: e2e-video spielt ihn mit Video, SIN-1590). Prüfung öffnen → Aufbau mit Gebieten
// nach § 9 sehen → echte Fragen beantworten, ohne Lösung zwischendurch → Ergebnis je Gebiet, Lösungen erst jetzt.
// Der Kurs kommt gemockt aus `/api/learner/phase-a`; kein Konto, keine Keys.

// `public/sw.js` holt phase-a selbst, Playwright sähe die Anfrage dann nicht (LEHREN SIN-1446).
test.use({ serviceWorkers: "block" });

const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations, JSON.stringify(r.violations, null, 2)).toHaveLength(0);
};

const viewports = [
  { name: "Desktop", size: { width: 1280, height: 800 } },
  { name: "Handy", size: { width: 390, height: 844 } },
];

const VORLAGE = "Was ist der erste Schritt vor Aufnahme einer neuen Fertigungstätigkeit?";

for (const vp of viewports) {
  test(`Maschinen- und Anlagenführer: Produktionsplanung mit Lücke bis zum Ergebnis (${vp.name})`, async ({ page }, info) => {
    await page.setViewportSize(vp.size);
    // PP-c (vorbeugende Instandhaltung) hat keine Fragen, PP-d und PP-e je eine: die Lücke muss sichtbar sein.
    await kursMocken(page, MAF_ID, "Maschinen- und Anlagenführer", {
      "PP-a": 6,
      "PP-b": 6,
      "PP-d": 1,
      "PP-e": 1,
      "PT-a": 6,
    });

    // 1. Prüfung öffnen: Pfad (Prüfungsgebiete stehen nicht auf Heute, SIN-1595) zeigt die Teile mit den Zeiten der Map, nicht die Vorlagen.
    await page.goto("/lernpfad/pfad");
    const teile = page.locator("section", { hasText: "Prüfungsgebiete" });
    await expect(teile.getByText("Produktionsplanung")).toBeVisible();
    await expect(teile.getByText("60 Min · 30%")).toBeVisible();
    await expect(teile.locator("li", { hasText: /Praktischer Teil/ })).toContainText("nicht nachgebildet");
    await page.getByRole("link", { name: /Produktionsplanung/ }).click();
    await expect(page).toHaveURL(/\/pruefung\?part=PP/);

    // 2. Aufbau mit den Gebietstiteln nach § 9, Lücke ehrlich benannt.
    const aufbau = page.getByRole("heading", { name: /^Aufbau: Produktionsplanung/ }).locator("xpath=..");
    for (const titel of ["Arbeitsschritte", "Qualitätssicherung", "vorbeugende Instandhaltung", "Produktionsanlagen", "Übergabeprotokoll"]) {
      await expect(page.getByText(titel).first()).toBeVisible();
    }
    await expect(aufbau.getByText(/0 von \d+ Fragen/)).toBeVisible();
    await expect(page.getByText(/Zu wenige Fragen: .*PP-c: 0 von/)).toBeVisible();
    await expect(page.getByText(VORLAGE)).toHaveCount(0);
    await axe(page);
    await page.screenshot({ path: info.outputPath(`pruefung-aufbau-${vp.name.toLowerCase()}.png`), fullPage: true });

    // 3. Fragen beantworten: keine Lösung und keine Erklärung zwischendurch.
    await page.getByRole("button", { name: "Prüfung starten" }).click();
    await expect(page.getByText(/Frage 1\/9/)).toBeVisible();
    await page.getByRole("button", { name: "richtig", exact: true }).click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    await expect(page.getByText(/Antwort gespeichert/)).toBeVisible();
    await expect(page.getByText(/Erklärung zu/)).toHaveCount(0);
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    // Rest: PP-a richtig, alle übrigen falsch.
    await pruefungSpielen(page, (area) => (area === "PP-a" ? "richtig" : "falsch"));

    // 4. Ergebnis je Gebiet nur aus den eigenen Antworten, Gebiet ohne Fragen „nicht geprüft“.
    await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
    const ergebnis = page.getByText("Nach Prüfungsgebiet").locator("xpath=ancestor::*[self::section or self::div][1]");
    await expect(ergebnis.getByText("100 %")).toBeVisible();
    await expect(ergebnis.getByText("0 %").first()).toBeVisible();
    await expect(ergebnis.getByText("nicht geprüft")).toHaveCount(1);
    await expect(ergebnis.getByText(/Im Kurs gibt es nur 0 von \d+ Fragen/)).toBeVisible();
    // Lösungen erst jetzt.
    await expect(page.getByText(/Erklärung zu/)).toHaveCount(0);
    await page.getByRole("button", { name: /Antworten mit Lösung durchgehen/ }).click();
    await expect(page.getByText(/Erklärung zu PP-a Nr. 1\./)).toBeVisible();
    await expect(page.getByText("Deine Antwort:").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Quelle" }).first()).toBeVisible();
    await axe(page);
    await page.screenshot({ path: info.outputPath(`pruefung-ergebnis-${vp.name.toLowerCase()}.png`), fullPage: true });
  });
}

test("Industriekaufmann: Teil 1 mit seinen Gebieten, nicht die MAF-Prüfung", async ({ page }, info) => {
  await kursMocken(page, KFM_ID, "Industriekaufmann", { "T1-1": 5, "T1-2": 5, "T1-3": 5, "T1-4": 5, "T1-5": 5 });
  await page.goto(`/pruefung?part=T1&kurs=${KFM_ID}`);

  await expect(page.getByText(/^90 Min · \d+ Fragen/)).toBeVisible();
  await expect(page.getByText("mit internen und externen Partnern zusammenarbeiten")).toBeVisible();
  await expect(page.getByText("Produktionstechnik")).toHaveCount(0);
  await expect(page.getByText("Qualitätsmanagement")).toHaveCount(0);
  await expect(page.locator("select option")).toHaveCount(3);
  await page.screenshot({ path: info.outputPath("pruefung-aufbau-kaufmann.png"), fullPage: true });

  await page.getByRole("button", { name: "Prüfung starten" }).click();
  await pruefungSpielen(page, (area) => (area === "T1-1" ? "richtig" : "falsch"));
  await expect(page).toHaveURL(/\/pruefung\/ergebnis$/);
  await expect(page.getByText("Nach Prüfungsgebiet")).toBeVisible();
  await expect(page.getByText(/Buchführung und Bilanzierung/).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath("pruefung-ergebnis-kaufmann.png"), fullPage: true });
});

test("Kurs ohne Prüfungsmodus (Industriemechaniker) zeigt den Satz statt der MAF-Prüfung", async ({ page }) => {
  await kursMocken(page, "00000000-0000-0000-0000-000000000000", "Industriemechaniker", { "PT-a": 3 });
  await page.goto("/pruefung?part=PT&kurs=00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("Für diesen Kurs gibt es noch keinen Prüfungsmodus.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Prüfung starten" })).toHaveCount(0);
});
