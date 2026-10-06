/**
 * Screenshots für Frontend-PRs (SIN-275): Handy (390 px) und Desktop je Route, dazu Konsolenfehler.
 *
 *   npm run build && node scripts/autonomy/screenshots.mjs /lernpfad /einheit/unit-03
 *
 * Startet `next start` selbst (freier Port), außer BASE_URL ist gesetzt. Ausgabe in screenshots/
 * (nicht im Repo, wird als Artefakt hochgeladen) und screenshots/report.md. Exit 1 bei Seitenfehlern.
 * Ohne Route: Startseite. Chromium einmalig: npx playwright install chromium
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { chromium } from "@playwright/test";

export const VIEWPORTS = [
  { name: "handy", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

/** Dateiname für eine Route: "/einheit/unit-03" → "einheit-unit-03". */
export const slug = (route) => route.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-") || "start";

/** Bericht als Markdown: je Route Status und Konsolenfehler. */
export function renderReport(results) {
  const ok = results.every((r) => r.ok);
  return [
    "# Screenshots und Klickpfad",
    "",
    ok ? "Klickpfad geprüft: alle Seiten öffnen ohne Fehler." : "Klickpfad mit Fehlern: siehe unten.",
    "",
    ...results.map((r) => `- ${r.ok ? "OK" : "FEHLER"} \`${r.route}\` (${r.viewport}, HTTP ${r.status ?? "?"})${r.errors.map((e) => `\n  - ${e}`).join("")}`),
    "",
  ].join("\n");
}

/** Ein freier lokaler Port. */
function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function waitFor(url, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fetch(url).then((r) => r.ok, () => false)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server nicht erreichbar: ${url}`);
}

async function main(routes, outDir = "screenshots") {
  const external = process.env.BASE_URL;
  // Freier Port statt fester 43124: ein übrig gebliebener Server eines früheren Laufs liefert sonst einen alten Build aus.
  const port = external ? 0 : await freePort();
  const base = external ?? `http://127.0.0.1:${port}`;
  // detached: eigene Prozessgruppe, damit am Ende auch `next-server` (Kind von `npx`) beendet wird.
  const server = external
    ? null
    : spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "ignore", detached: true });
  const results = [];
  let browser;
  try {
    await waitFor(base);
    mkdirSync(outDir, { recursive: true });
    browser = await chromium.launch();
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      for (const route of routes) {
        const page = await context.newPage();
        const errors = [];
        page.on("console", (m) => m.type() === "error" && errors.push(`Konsole: ${m.text()}`));
        page.on("pageerror", (e) => errors.push(`Seitenfehler: ${e.message}`));
        const res = await page.goto(new URL(route, base).href, { waitUntil: "networkidle" }).catch((e) => {
          errors.push(`Navigation: ${e.message}`);
          return null;
        });
        if (res && res.status() >= 400) errors.push(`HTTP ${res.status()}`);
        await page.screenshot({ path: `${outDir}/${slug(route)}-${vp.name}.png`, fullPage: true });
        results.push({ route, viewport: `${vp.name} ${vp.width} px`, status: res?.status(), errors, ok: errors.length === 0 });
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser?.close();
    if (server?.pid) {
      try {
        process.kill(-server.pid);
      } catch {
        server.kill();
      }
    }
  }
  writeFileSync(`${outDir}/report.md`, renderReport(results));
  console.log(renderReport(results));
  return results.every((r) => r.ok);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const routes = process.argv.slice(2);
  main(routes.length ? routes : ["/"]).then(
    (ok) => process.exit(ok ? 0 : 1),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
