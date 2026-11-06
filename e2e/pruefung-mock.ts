import type { Page } from "@playwright/test";

/** Gemeinsame Attrappe für die Prüfungs-Tests (SIN-1516): veröffentlichter Kurs mit Fragen je Prüfungsgebiet. */
export const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/__9.html";
export const MAF_ID = "e22073de-7020-4380-9002-c70d46c25e25";
export const KFM_ID = "5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31";

/** Frage im Gebiet `area`; die Kennung steht im Text, damit der Test das Gebiet erkennt. */
export const frage = (area: string, n: number) => ({
  id: `${area}-q${n}`,
  type: "auswahl",
  level: "verstehen",
  prompt: `Frage ${area} Nr. ${n}: Welche Antwort stimmt?`,
  choices: ["richtig", "falsch"],
  correct: "richtig",
  explanation: `Erklärung zu ${area} Nr. ${n}.`,
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-11-05",
  examAreas: [area],
});

/** Kurs mit `proGebiet[area]` Fragen je Gebiet, verteilt auf Einheiten zu je einem Gebiet. */
export async function kursMocken(page: Page, courseId: string, keyword: string, proGebiet: Record<string, number>) {
  const units = Object.entries(proGebiet).map(([area, n], i) => ({
    id: `M0-${i + 1}-u1`,
    title: `Einheit ${area}`,
    minutes: 6,
    explanation: "Kurz erklärt.",
    questions: Array.from({ length: n }, (_, k) => frage(area, k + 1)),
    sourceUrl: SOURCE,
    sourceFetchedAt: "2026-11-05",
    moduleId: "M0",
    blockId: `M0-${i + 1}`,
  }));
  await page.route("**/api/learner/phase-a**", (route) =>
    route.fulfill({ json: { courseId, keyword, phase: "A", unitCount: units.length, units, source: "supabase" } }),
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cal-onboarding",
      JSON.stringify({ consent: false, schwerpunktId: "metall-kunststoff", mapId: "maf-metall" }),
    );
  });
}

/** Beantwortet die laufende Prüfung: je Frage `wahl(gebiet)` ("richtig" oder "falsch"), bis das Ergebnis erscheint. */
export async function pruefungSpielen(page: Page, wahl: (area: string) => "richtig" | "falsch") {
  const letzte = page.getByRole("button", { name: "Ergebnis je Gebiet", exact: true });
  for (let guard = 0; guard < 60; guard++) {
    const prompt = (await page.getByRole("heading", { level: 2 }).first().textContent()) ?? "";
    const area = /Frage (\S+) Nr\./.exec(prompt)![1]!;
    await page.getByRole("button", { name: wahl(area), exact: true }).click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    if (await letzte.isVisible()) {
      await letzte.click();
      return;
    }
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
  }
  throw new Error("Prüfung endete nicht");
}
