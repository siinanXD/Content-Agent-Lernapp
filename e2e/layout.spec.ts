import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { formatFunde, MIN_ZIEL, pruefeLayout, type Fund } from "./layout-pruefer";
import { routes } from "./routes";

// SIN-523: Layout-Prüfer (Gate, Teil von `build`). Alle Hauptseiten (Liste aus routes.ts, wie visual.yml),
// Handy 390×844 und Desktop 1280×800: keine Überlappung, kein waagerechtes Scrollen, kein abgeschnittener Text,
// Klickziele ≥ 44 px, nichts außerhalb des Viewports oder hinter fixen Leisten.
// Absichtlich übereinanderliegende Elemente: `data-layout-ok="Begründung"` setzen.
const viewports = [
  { name: "handy", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const pruefe = (page: Page): Promise<Fund[]> => page.evaluate(pruefeLayout, MIN_ZIEL);

/** Bild der ganzen Seite mit roten Kästen um die betroffenen Elemente. */
async function markiertesBild(page: Page, testInfo: TestInfo, name: string, funde: Fund[]) {
  const boxen = funde.flatMap((f) => f.boxen);
  await page.evaluate((bs) => {
    for (const b of bs) {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;outline:3px solid red;background:rgba(255,0,0,.15);pointer-events:none;z-index:2147483647`;
      document.body.appendChild(d);
    }
  }, boxen);
  const body = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body, contentType: "image/png" });
}

for (const vp of viewports) {
  for (const route of routes) {
    test(`Layout ${route} (${vp.name})`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route, { waitUntil: "networkidle" });
      const funde = await pruefe(page);
      if (funde.length) {
        const slug = route.replace(/^\/+/, "").replace(/\W+/g, "-") || "startseite";
        await markiertesBild(page, testInfo, `layout-${slug}-${vp.name}.png`, funde);
      }
      expect(funde, formatFunde(route, `${vp.name} ${vp.width}×${vp.height}`, funde)).toEqual([]);
    });
  }
}

// Selbsttest: Der Prüfer schlägt an, wenn ein Screen kaputt ist (Akzeptanz SIN-523).
test.describe("Layout-Prüfer erkennt Fehler", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("zwei Knöpfe übereinander", async ({ page }) => {
    await page.setContent(
      `<main><button style="position:absolute;left:10px;top:100px;width:120px;height:48px">Eins</button>
       <button style="position:absolute;left:20px;top:110px;width:120px;height:48px">Zwei</button></main>`,
    );
    const funde = await pruefe(page);
    expect(funde.some((f) => f.regel === "ueberlappung" && f.text.includes("Eins") && f.text.includes("Zwei"))).toBe(true);
  });

  test("data-layout-ok nimmt gewollte Überlagerung aus", async ({ page }) => {
    await page.setContent(
      `<main><button style="position:absolute;left:10px;top:100px;width:120px;height:48px">Eins</button>
       <button data-layout-ok="Test: gewollt" style="position:absolute;left:20px;top:110px;width:120px;height:48px">Zwei</button></main>`,
    );
    expect((await pruefe(page)).filter((f) => f.regel === "ueberlappung")).toEqual([]);
  });

  test("Überbreite, kleines Ziel und abgeschnittener Text", async ({ page }) => {
    await page.setContent(
      `<main><div style="width:600px;height:20px">breit</div>
       <button style="display:block;width:20px;height:20px">x</button>
       <div style="width:50px;overflow:hidden;white-space:nowrap">ein sehr langer Text ohne Auslassungspunkte</div></main>`,
    );
    const regeln = (await pruefe(page)).map((f) => f.regel);
    expect(regeln).toEqual(expect.arrayContaining(["horizontal-scroll", "klickziel", "abgeschnitten"]));
  });

  test("Knopf hinter fixer Leiste", async ({ page }) => {
    await page.setContent(
      `<header style="position:fixed;left:0;right:0;top:0;height:5000px;background:#eee">Leiste</header>
       <main><button style="display:block;width:100px;height:48px">Darunter</button></main>`,
    );
    expect((await pruefe(page)).some((f) => f.regel === "verdeckt")).toBe(true);
  });
});
