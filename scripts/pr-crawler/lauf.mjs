#!/usr/bin/env node
/**
 * PR-Crawler, Schritt 2 (SIN-906): geht nur die Seiten des PRs auf der Vercel-Vorschau ab, mit der Prüfung des nächtlichen
 * Crawlers (`pruefeSeite`: Fehler, tote Links, Seitwärts-Scrollen, axe; Knöpfe auf dem Handy) und beantwortet auf Einheit und
 * Prüfung die erste Frage. Beleg: je Route ein Bild (Handy, Desktop); berührt der PR 2+ Seiten, ein Video über alle (WebM, Handy).
 *
 *   LIVE_URL=https://<vorschau> node scripts/pr-crawler/lauf.mjs "/lernpfad" "/profil"   → pr-crawler-ergebnis/
 *
 * Routen hinter dem Login (SIN-914) laufen mit der Sitzung des Testkontos, wenn AGENT_STORAGE_STATE(_AUSBILDER) gesetzt ist.
 * Nur lesend: schreibende Anfragen an /api sind abgefangen. LCP ist nur Hinweis (kalte Vorschau streut), alles andere färbt rot.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { slug } from "../autonomy/sichtpruefung.mjs";
import { VIEWPORTS, klickeKnoepfe, pruefeSeite } from "../autonomy/crawler.mjs";
import { beantworte } from "../autonomy/personas.mjs";
import { stateFuer } from "../agent-testnutzer/sitzung.mjs";

export const MAX_VIDEO_MB = 10;
export const ROT = (f) => f.kategorie !== "lcp";

/** Erste Frage beantworten, wo es eine gibt (Einheit, Prüfung); Fehler wird als Fund gemeldet. */
export async function ersteFrage(page, route) {
  if (route.startsWith("/pruefung") && route !== "/pruefung/ergebnis") await page.getByRole("button", { name: "Prüfung starten" }).click({ timeout: 5000 });
  else if (!route.startsWith("/einheit/")) return null;
  try {
    await page.getByText(/^Frage \d+ von \d+/).waitFor({ timeout: 30_000 });
    await beantworte(page);
    await page.getByTestId("answer-feedback").waitFor({ timeout: 8000 });
    return null;
  } catch (e) {
    return { kategorie: "konsole", route, viewport: "handy", text: `Erste Frage lässt sich nicht beantworten: ${e.message.split("\n")[0].slice(0, 160)}` };
  }
}

const kontext = (browser, vp, extra = {}) =>
  browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobil,
    hasTouch: vp.mobil,
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
    ...extra,
  });
const nurLesen = (context) => context.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.fulfill({ status: 201, json: { ok: true } })));

/** Ein Durchgang über alle Seiten in einem Browserfenster, aufgenommen als Video. */
async function ablaufVideo(browser, base, routen, ordner) {
  const vp = VIEWPORTS[0];
  const state = routen.map((r) => stateFuer(r)).find(Boolean);
  const context = await kontext(browser, vp, { ...(state ? { storageState: state } : {}), recordVideo: { dir: `${ordner}/video-roh`, size: { width: vp.width, height: vp.height } } });
  await nurLesen(context);
  const page = await context.newPage();
  for (const route of routen) {
    await page.goto(new URL(route, base).href, { waitUntil: "networkidle", timeout: 30_000 }).catch(() => null);
    await ersteFrage(page, route);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(800);
  }
  const roh = await page.video()?.path();
  await context.close();
  if (!roh) return { hinweis: "Video nicht aufgenommen." };
  const datei = `${ordner}/ablauf.webm`;
  renameSync(roh, datei);
  const mb = Math.round((statSync(datei).size / 1e6) * 10) / 10;
  return mb > MAX_VIDEO_MB ? { hinweis: `Video mit ${mb} MB über der Grenze von ${MAX_VIDEO_MB} MB, nicht angehängt.`, zuGross: true } : { datei: "ablauf.webm", mb };
}

export async function pruefe(base, routen, ordner = "pr-crawler-ergebnis") {
  mkdirSync(ordner, { recursive: true });
  const funde = [];
  const bilder = [];
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      const kontexte = new Map(); // storageState-Pfad (oder "") → Kontext; Sitzung nur für Routen hinter dem Login
      const holeKontext = async (state) => {
        if (!kontexte.has(state ?? "")) {
          const c = await kontext(browser, vp, state ? { storageState: state } : {});
          await nurLesen(c);
          kontexte.set(state ?? "", c);
        }
        return kontexte.get(state ?? "");
      };
      for (const route of routen) {
        const context = await holeKontext(stateFuer(route));
        const { funde: f, page } = await pruefeSeite(context, base, route, vp, ordner);
        funde.push(...f);
        const bild = `${slug(route)}-${vp.name}.png`;
        if (await page.screenshot({ path: `${ordner}/${bild}`, fullPage: true }).then(() => true, () => false)) bilder.push({ route, viewport: vp.name, bild });
        const frage = vp.mobil ? await ersteFrage(page, route) : null;
        if (frage) funde.push(frage);
        await page.close();
        if (vp.mobil) funde.push(...(await klickeKnoepfe(context, base, route)));
      }
      for (const c of kontexte.values()) await c.close();
    }
    const video = routen.length >= 2 ? await ablaufVideo(browser, base, routen, ordner) : null;
    const rot = funde.filter(ROT);
    const ergebnis = { routen, bilder, funde, video, rot: rot.length, grund: rot[0] ? `${rot[0].route}: ${rot[0].text}`.slice(0, 280) : "" };
    writeFileSync(`${ordner}/ergebnis.json`, JSON.stringify(ergebnis, null, 2));
    console.log(`PR-Crawler: ${routen.length} Route(n), ${bilder.length} Bild(er), ${rot.length} Fund(e)${video?.datei ? `, Video ${video.mb} MB` : ""}`);
    return ergebnis;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.LIVE_URL;
  const routen = process.argv.slice(2);
  if (!base || !routen.length) {
    console.error("LIVE_URL und mindestens eine Route nötig");
    process.exit(1);
  }
  pruefe(base, routen).then(
    (e) => process.exit(e.rot ? 1 : 0),
    (e) => {
      // Abgestürzter Lauf ist rot und trägt den Grund, statt still zu fehlen.
      console.error(e.message);
      mkdirSync("pr-crawler-ergebnis", { recursive: true });
      writeFileSync("pr-crawler-ergebnis/ergebnis.json", JSON.stringify({ routen, bilder: [], funde: [], video: null, rot: 1, grund: `Crawler abgestürzt: ${e.message.split("\n")[0].slice(0, 240)}` }, null, 2));
      process.exit(1);
    },
  );
}
