#!/usr/bin/env node
/**
 * Crawler des Testnutzer-Agents (SIN-640, Ebene 1, ohne KI, nachts): geht alle Routen aus `e2e/routes.ts` ab, auf Handy (390 px)
 * und Desktop, scrollt bis unten, klickt auf dem Handy die Knöpfe an und prüft je Seite: HTTP, Konsolenfehler, 4xx/5xx der
 * Nachbaranfragen, tote interne Links, Seitwärts-Scrollen, LCP unter 2,5 s, axe. Ergebnis `testnutzer-ergebnis/funde-crawler.json`.
 *
 *   LIVE_URL=https://… node scripts/autonomy/crawler.mjs
 *
 * Nur lesend: alle schreibenden Anfragen an /api werden abgefangen (nie in Produktionsdaten schreiben, keine echten Nutzer).
 * shortcut: Knöpfe nur auf dem Handy und höchstens 8 je Seite, bei Bedarf ausbauen. Bildvergleich gegen main macht `visual.yml`.
 */
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { leseRouten, slug } from "./sichtpruefung.mjs";
import { GRENZE_LCP_MS } from "./testnutzer.mjs";
import { stateFuer } from "../agent-testnutzer/sitzung.mjs";

export const VIEWPORTS = [
  { name: "handy", width: 390, height: 844, mobil: true },
  { name: "desktop", width: 1280, height: 800, mobil: false },
];
const MAX_KNOEPFE = 8;
/** Drittanbieter, die ohne Einwilligung blockiert sind, und Rauschen. */
export const IGNORIERT = /sentry|posthog|ERR_BLOCKED|favicon/i;

/** Interner Link, den es zu prüfen lohnt: gleiche Herkunft, kein reiner Anker. */
export function istInterneUrl(href, base) {
  if (!href || href.startsWith("#")) return false;
  try {
    return new URL(href, base).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

export async function pruefeSeite(context, base, route, vp, ordner) {
  const funde = [];
  const meld = (kategorie, text, bild) => funde.push({ kategorie, route, viewport: vp.name, text, ...(bild ? { bild } : {}) });
  const page = await context.newPage();
  const konsole = [];
  page.on("console", (m) => m.type() === "error" && !IGNORIERT.test(m.text()) && konsole.push(m.text()));
  page.on("pageerror", (e) => konsole.push(`Seitenfehler: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && !IGNORIERT.test(r.url()) && r.url() !== new URL(route, base).href && meld("http", `HTTP ${r.status()} bei ${new URL(r.url()).pathname}`));
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const res = await page.goto(new URL(route, base).href, { waitUntil: "networkidle", timeout: 30_000 }).catch((e) => {
    meld("tot", `Seite lädt nicht: ${e.message.split("\n")[0]}`);
    return null;
  });
  if (!res) return { funde, page };
  if (res.status() >= 400) meld("http", `Seite antwortet mit HTTP ${res.status()}`);
  // Bis unten scrollen (lädt Nachgeladenes), dann messen.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  const m = await page.evaluate(() => ({ lcp: window.__lcp, breit: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  const bild = `${slug(route)}-${vp.name}.png`;
  const knipse = () => page.screenshot({ path: `${ordner}/${bild}`, fullPage: true }).then(() => bild, () => undefined);
  if (m.lcp > GRENZE_LCP_MS) meld("lcp", `LCP ${Math.round(m.lcp)} ms (Grenze ${GRENZE_LCP_MS} ms)`, await knipse());
  if (m.breit > 1) meld("scroll", `Seite ist ${m.breit} px breiter als der Bildschirm`, await knipse());
  for (const k of [...new Set(konsole)].slice(0, 3)) meld("konsole", k.slice(0, 200));
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze().catch(() => null);
  for (const v of axe?.violations ?? []) meld("a11y", `${v.id} (${v.impact}): ${v.help}, ${v.nodes.length} Stelle(n)`, await knipse());

  // Tote interne Links: Ziel per GET prüfen, ohne zu navigieren.
  const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  for (const href of [...new Set(links)].filter((h) => istInterneUrl(h, base)).slice(0, 30)) {
    const r = await page.request.get(new URL(href, base).href).catch(() => null);
    if (!r || r.status() >= 400) meld("tot", `Link ${href} führt ins Leere (${r ? `HTTP ${r.status()}` : "keine Antwort"})`);
  }
  return { funde, page };
}

export async function klickeKnoepfe(context, base, route) {
  const funde = [];
  const page = await context.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  const laden = () => page.goto(new URL(route, base).href, { waitUntil: "networkidle", timeout: 30_000 }).catch(() => null);
  await laden();
  const n = Math.min(await page.locator("main button:visible").count(), MAX_KNOEPFE);
  for (let i = 0; i < n; i++) {
    fehler.length = 0;
    await laden();
    const knopf = page.locator("main button:visible").nth(i);
    if (await knopf.isDisabled().catch(() => true)) continue;
    const name = ((await knopf.textContent().catch(() => "")) ?? "").trim().slice(0, 40) || `Knopf ${i + 1}`;
    await knopf.click({ timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(300);
    if (fehler.length) funde.push({ kategorie: "konsole", route, viewport: "handy", text: `Klick auf „${name}“ löst Fehler aus: ${fehler[0].slice(0, 160)}` });
  }
  await page.close();
  return funde;
}

/** SIN-914: zweiter Durchgang mit den Sitzungen der Testkonten (AGENT_STORAGE_STATE*), nur Routen hinter dem Login. */
async function crawlEingeloggt(browser, base, routen, ordner) {
  const funde = [];
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const nachState = new Map();
  for (const route of routen) {
    const state = stateFuer(route);
    if (state) nachState.set(state, [...(nachState.get(state) ?? []), route]);
  }
  for (const [state, liste] of nachState) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        storageState: state,
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobil,
        hasTouch: vp.mobil,
        extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
      });
      await context.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.fulfill({ status: 201, json: { ok: true } })));
      for (const route of liste) {
        const { funde: f, page } = await pruefeSeite(context, base, route, vp, ordner);
        funde.push(...f.map((x) => ({ ...x, text: `[eingeloggt] ${x.text}` })));
        // Die Sitzung greift nur, wenn die Seite nicht zu /anmelden zurückführt.
        if (new URL(page.url()).pathname.startsWith("/anmelden")) funde.push({ kategorie: "tot", route, viewport: vp.name, text: "[eingeloggt] Sitzung wird nicht erkannt, Seite führt zu /anmelden" });
        await page.close();
      }
      await context.close();
    }
  }
  return funde;
}

export async function crawl(base, ordner = "testnutzer-ergebnis") {
  mkdirSync(ordner, { recursive: true });
  const routen = leseRouten(readFileSync("e2e/routes.ts", "utf8"));
  const funde = [];
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobil,
        hasTouch: vp.mobil,
        extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
      });
      // Nie in Produktionsdaten schreiben: schreibende Anfragen an die API werden beantwortet, ohne die App zu erreichen.
      await context.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.fulfill({ status: 201, json: { ok: true } })));
      for (const route of routen) {
        const { funde: f, page } = await pruefeSeite(context, base, route, vp, ordner);
        funde.push(...f);
        await page.close();
        if (vp.mobil) funde.push(...(await klickeKnoepfe(context, base, route)));
      }
      await context.close();
    }
    funde.push(...(await crawlEingeloggt(browser, base, routen, ordner)));
  } finally {
    await browser.close();
  }
  writeFileSync(`${ordner}/funde-crawler.json`, JSON.stringify({ routen: routen.length, funde }, null, 2));
  console.log(`Crawler: ${routen.length} Routen, ${funde.length} Fund(e)`);
  return funde;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const base = process.env.LIVE_URL;
  if (!base) {
    console.error("LIVE_URL fehlt");
    process.exit(1);
  }
  crawl(base).then(
    () => process.exit(0),
    (e) => {
      // Abgestürzter Lauf zählt als Fund: der Bericht (und damit die Serie, SIN-770) entsteht trotzdem, statt still zu fehlen.
      console.error(e.message);
      mkdirSync("testnutzer-ergebnis", { recursive: true });
      writeFileSync("testnutzer-ergebnis/funde-crawler.json", JSON.stringify({ routen: 0, funde: [{ kategorie: "tot", route: "/", text: `Crawler abgestürzt: ${e.message.split("\n")[0]}` }] }, null, 2));
      process.exit(1);
    },
  );
}
