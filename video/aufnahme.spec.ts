import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { KLICKWEG, type Schritt } from "../scripts/autonomy/video-klickweg";

// Video-Agent (SIN-483): spielt den Klickweg Start → Beruf wählen → erste Einheit → Ergebnis gegen die laufende App
// und schreibt die Zeitpunkte der Schritte. Lesende Aufrufe laufen echt (Lerninhalt ist öffentlich),
// schreibende Endpunkte sind abgefangen: kein Eintrag, keine Personendaten. Die Einwilligung wird abgelehnt (kein Tracking).

const PAUSE = 1600;
const MAX_FRAGEN = 12;
// Je Frage ~6 s Pause plus Klicks; Grundlast für Start, Beruf und Lernpfad dazu (SIN-518).
test.setTimeout(120_000 + MAX_FRAGEN * 20_000);

/** Beantwortet jeden Fragetyp (Auswahl, Lücken, Zuordnen, Reihenfolge, Rechnen), nicht nur Auswahlfragen. */
async function beantworte(page: Page) {
  const optionen = page.locator("button[aria-pressed]");
  if ((await optionen.count()) > 0) await optionen.first().click();
  const auswahl = page.locator("main select:enabled");
  for (let i = 0; i < (await auswahl.count()); i++) await auswahl.nth(i).selectOption({ index: 1 });
  const felder = page.locator("main input:not([type=checkbox]):not([type=search]):enabled, main textarea:enabled");
  for (let i = 0; i < (await felder.count()); i++) await felder.nth(i).fill("Test");
  await page.getByRole("button", { name: /^(Antwort prüfen|Musterlösung zeigen)$/ }).click();
  const speichern = page.getByRole("button", { name: "Selbstkontrolle speichern" });
  if (await speichern.isVisible()) await speichern.click();
}

test("Tutorial: Start bis Ergebnis", async ({ page, context }) => {
  const zeiten: Schritt[] = [];
  const t0 = Date.now();
  const marke = async (id: string) => {
    const s = KLICKWEG.find((k) => k.id === id)!;
    zeiten.push({ ...s, startMs: Date.now() - t0 });
    await page.waitForTimeout(PAUSE);
  };
  await context.route("**/api/progress", (r) => r.fulfill({ status: 201, json: { ok: true } }));
  await context.route("**/api/demo", (r) => r.fulfill({ status: 201, json: { ok: true } }));

  await page.goto("/willkommen");
  await marke("start");
  await page.getByRole("link", { name: "Los geht’s" }).click();
  // Einwilligung nur ablehnen, wenn der Schritt erscheint (sonst hängt der Klick bis zum Test-Timeout).
  const ablehnen = page.getByRole("button", { name: "Ablehnen" });
  if (await ablehnen.isVisible({ timeout: 10_000 }).catch(() => false)) await ablehnen.click();

  await marke("beruf");
  await page.getByRole("button", { name: /Maschinen- und Anlagenführer/ }).click();
  await page.getByRole("button", { name: "Metall + Kunststoff" }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole("button", { name: "Lernpfad erstellen", exact: true }).click();

  await expect(page).toHaveURL(/\/lernpfad$/);
  await marke("lernpfad");
  await page.locator('[data-state="heute"]').first().click();
  await expect(page).toHaveURL(/\/einheit\//);

  await marke("einheit");
  const zaehler = page.getByText(/^Frage \d+ von \d+/);
  for (let guard = 0; guard < MAX_FRAGEN; guard++) {
    const stand = (await zaehler.textContent()) ?? "";
    const rueckmeldung = page.getByTestId("answer-feedback");
    if (!(await rueckmeldung.isVisible())) await beantworte(page);
    await expect(rueckmeldung).toBeVisible();
    await page.waitForTimeout(900);
    if (/^Frage (\d+) von \1\b/.test(stand)) {
      await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
      break;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(zaehler).not.toHaveText(stand);
  }

  await expect(page).toHaveURL(/\/ergebnis$/);
  await marke("ergebnis");

  mkdirSync("video-ergebnis", { recursive: true });
  writeFileSync("video-ergebnis/klickweg.json", JSON.stringify({ schritte: zeiten, aufnahmeMs: Date.now() - t0 }, null, 2));
});
