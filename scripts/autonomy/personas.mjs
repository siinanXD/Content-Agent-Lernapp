#!/usr/bin/env node
/**
 * Persona-Wege des Testnutzer-Agents (SIN-640, Ebene 2, wöchentlich): drei feste Wege gegen die Live-App
 * (Einstieg → Kurs wählen → 1 Einheit → Ergebnis → Wiederholung). Playwright spielt, ein Modell bewertet danach
 * (`testnutzer.mjs bewerten`). Hier entsteht nur die Aufnahme: je Schritt Bild, sichtbarer Text, Zeit, Status.
 *
 *   LIVE_URL=https://… node scripts/autonomy/personas.mjs      → testnutzer-ergebnis/personas.json
 *
 * Nur lesend: schreibende Anfragen an /api sind abgefangen, es gibt keine Konten und keine echten Nutzerdaten.
 * Der Ausbilder nutzt die Beispielansicht `?demo=1` (ohne Konto). Bricht ein Schritt ab, endet der Weg dort (toter Weg).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { PERSONAS } from "./testnutzer.mjs";

const SCHRITT_MS = 8000;

/** Onboarding wie in e2e/gesamtweg.spec.ts: Los geht’s → Ablehnen → Beruf → Schwerpunkt → Lernpfad erstellen. */
const onboarding = [
  { label: "Einstieg", route: "/willkommen", tu: (p) => p.goto("/willkommen") },
  { label: "Los geht’s", route: "/willkommen", tu: (p) => p.getByRole("link", { name: "Los geht’s" }).click() },
  { label: "Einwilligung", route: "/einwilligung", tu: (p) => p.getByRole("button", { name: "Ablehnen" }).click() },
  { label: "Beruf wählen", route: "/beruf", tu: (p) => p.getByRole("button", { name: /Maschinen- und Anlagenführer/ }).click() },
  { label: "Schwerpunkt wählen", route: "/schwerpunkt", tu: (p) => p.getByRole("button", { name: "Metall + Kunststoff" }).click() },
  { label: "Lernpfad erstellen", route: "/schwerpunkt", tu: (p) => p.getByRole("button", { name: "Lernpfad erstellen", exact: true }).click() },
];

/** Beantwortet die offene Frage, egal welcher Typ (wie live/live.spec.ts). */
export async function beantworte(p) {
  const selects = p.locator("select");
  for (let i = 0; i < (await selects.count()); i++) await selects.nth(i).selectOption({ index: 1 });
  const optionen = p.locator("button[aria-pressed]");
  if ((await optionen.count()) > 0) await optionen.first().click();
  const muster = p.getByRole("button", { name: "Musterlösung zeigen" });
  if (await muster.isVisible()) {
    await p.getByRole("textbox").fill("Eigener Lösungsversuch");
    await muster.click();
    await p.getByRole("button", { name: "Selbstkontrolle speichern" }).click();
    return;
  }
  await p.getByRole("button", { name: "Antwort prüfen" }).click();
}

async function einheitSpielen(p) {
  const zaehler = p.getByText(/^Frage \d+ von \d+/);
  // Die Einheit lädt den ganzen Kurs nach: erste Frage bekommt mehr Zeit als ein Klick (SIN-874).
  await zaehler.waitFor({ timeout: 4 * SCHRITT_MS });
  for (let i = 0; i < 40; i++) {
    const stand = (await zaehler.textContent()) ?? "";
    if (!(await p.getByTestId("answer-feedback").isVisible())) await beantworte(p);
    await p.getByTestId("answer-feedback").waitFor({ timeout: SCHRITT_MS });
    if (/^Frage (\d+) von \1\b/.test(stand)) return p.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
    await p.getByRole("button", { name: "Weiter", exact: true }).click();
    await p.waitForFunction((alt) => document.body.innerText.match(/Frage \d+ von \d+/)?.[0] !== alt, stand.trim().match(/Frage \d+ von \d+/)?.[0], { timeout: SCHRITT_MS });
  }
  throw new Error("Einheit endet nicht nach 40 Schritten");
}

const lernweg = [
  ...onboarding,
  { label: "Lernpfad", route: "/lernpfad", tu: (p) => p.waitForURL(/\/lernpfad$/, { timeout: SCHRITT_MS }) },
  { label: "Einheit öffnen", route: "/einheit", tu: async (p) => { await p.locator('[data-state="heute"]').first().click(); await p.waitForURL(/\/einheit\//, { timeout: SCHRITT_MS }); } },
  { label: "Einheit durchspielen", route: "/einheit", tu: einheitSpielen },
  { label: "Ergebnis", route: "/ergebnis", tu: (p) => p.getByRole("heading", { name: "Einheit geschafft" }).waitFor({ timeout: SCHRITT_MS }) },
  { label: "Wiederholung", route: "/wiederholung", tu: async (p) => { await p.getByRole("link", { name: "Zur Wiederholung" }).click(); await p.waitForURL(/\/wiederholung$/, { timeout: SCHRITT_MS }); } },
];

const WEGE = {
  "azubi-metall": lernweg,
  "azubi-pruefung": [
    ...onboarding,
    { label: "Prüfungsmodus", route: "/pruefung", tu: (p) => p.goto("/pruefung") },
    { label: "Prüfung starten", route: "/pruefung", tu: (p) => p.getByRole("button", { name: "Prüfung starten" }).click() },
    { label: "Erste Frage beantworten", route: "/pruefung", tu: (p) => beantworte(p) },
    { label: "Wiederholung", route: "/wiederholung", tu: (p) => p.goto("/wiederholung") },
    { label: "Profil", route: "/profil", tu: (p) => p.goto("/profil") },
  ],
  ausbilder: [
    { label: "Einstieg", route: "/", tu: (p) => p.goto("/") },
    { label: "Gruppenübersicht (Beispiel)", route: "/ausbilder", tu: (p) => p.goto("/ausbilder?demo=1") },
    { label: "Meine Gruppen", route: "/ausbilder/gruppen", tu: (p) => p.goto("/ausbilder/gruppen") },
    { label: "Zugang einlösen", route: "/ausbilder/zugang", tu: (p) => p.goto("/ausbilder/zugang") },
    { label: "Archiv", route: "/ausbilder/archiv", tu: (p) => p.goto("/ausbilder/archiv") },
  ],
};

async function laufen(browser, base, persona, ordner) {
  const vp = persona.viewport === "handy" ? { width: 390, height: 844 } : { width: 1280, height: 800 };
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const context = await browser.newContext({
    baseURL: base,
    viewport: vp,
    isMobile: persona.viewport === "handy",
    hasTouch: persona.viewport === "handy",
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
  });
  // Nie in Produktionsdaten schreiben.
  await context.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.fulfill({ status: 201, json: { ok: true } })));
  const p = await context.newPage();
  p.setDefaultTimeout(SCHRITT_MS);
  const schritte = [];
  for (const [i, s] of WEGE[persona.id].entries()) {
    const t0 = Date.now();
    const eintrag = { label: s.label, route: s.route, status: "ok", ms: 0, text: "", bild: `${persona.id}-${i + 1}.png` };
    try {
      await s.tu(p);
      await p.waitForLoadState("networkidle", { timeout: SCHRITT_MS }).catch(() => null);
    } catch (e) {
      eintrag.status = "fehler";
      eintrag.fehler = e.message.split("\n")[0];
    }
    eintrag.ms = Date.now() - t0;
    eintrag.route = new URL(p.url(), base).pathname;
    eintrag.text = (await p.locator("main").first().innerText({ timeout: 2000 }).catch(() => "")).replace(/\s+/g, " ").slice(0, 600);
    await p.screenshot({ path: `${ordner}/${eintrag.bild}` }).catch(() => (eintrag.bild = null));
    schritte.push(eintrag);
    if (eintrag.status === "fehler") break;
  }
  await context.close();
  return { persona: persona.id, ordner, schritte };
}

export async function spielen(base, ordner = "testnutzer-ergebnis") {
  mkdirSync(ordner, { recursive: true });
  const browser = await chromium.launch();
  const ergebnis = [];
  try {
    for (const persona of PERSONAS) ergebnis.push(await laufen(browser, base, persona, ordner));
  } finally {
    await browser.close();
  }
  writeFileSync(`${ordner}/personas.json`, JSON.stringify(ergebnis, null, 2));
  for (const d of ergebnis) console.log(`${d.persona}: ${d.schritte.length} Schritt(e), ${d.schritte.filter((s) => s.status === "fehler").length} Fehler`);
  return ergebnis;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const base = process.env.LIVE_URL;
  if (!base) {
    console.error("LIVE_URL fehlt");
    process.exit(1);
  }
  spielen(base).then(
    () => process.exit(0),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
