import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { KLICKWEG, type Schritt } from "../scripts/autonomy/video-klickweg";

// Video-Agent (SIN-483): spielt den Klickweg Start → Beruf wählen → erste Einheit → Ergebnis gegen die laufende App
// und schreibt die Zeitpunkte der Schritte. Lesende Aufrufe laufen echt (Lerninhalt ist öffentlich),
// schreibende Endpunkte sind abgefangen: kein Eintrag, keine Personendaten. Die Einwilligung wird abgelehnt (kein Tracking).

const PAUSE = 1600;

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
  await page.getByRole("button", { name: "Ablehnen" }).click();

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
  for (let guard = 0; guard < 12; guard++) {
    const stand = (await zaehler.textContent()) ?? "";
    const rueckmeldung = page.getByTestId("answer-feedback");
    if (!(await rueckmeldung.isVisible())) {
      const optionen = page.locator("button[aria-pressed]");
      if ((await optionen.count()) > 0) await optionen.first().click();
      await page.getByRole("button", { name: "Antwort prüfen" }).click();
    }
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
