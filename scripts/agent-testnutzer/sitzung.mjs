#!/usr/bin/env node
/**
 * Agent-Testnutzer eingeloggt (SIN-914): zwei Testkonten (Lernende, Ausbilder; nie Admin), Sitzung ohne Passwort.
 * Ablauf: Konto idempotent anlegen → `auth.admin.generateLink({ type: "magiclink" })` → `verifyOtp` mit dem Hash →
 * Playwright-`storageState` (localStorage-Eintrag von supabase-js). Nutzt SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY, kein neues Secret.
 * Die Sitzung liegt nur im Job (Datei in $RUNNER_TEMP oder --out), nie als Artefakt.
 *
 *   AGENT_LERNEND_EMAIL=… AGENT_AUSBILDER_EMAIL=… LIVE_URL=https://… node scripts/agent-testnutzer/sitzung.mjs --out "$RUNNER_TEMP/agent"
 *   → <out>/lernend.json, <out>/ausbilder.json; in $GITHUB_ENV landen AGENT_STORAGE_STATE und AGENT_STORAGE_STATE_AUSBILDER (nur Pfade)
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Testdaten tragen diese Kennung als `anonymous_id` (localStorage `cal-anonymous-id`); Kennzahlen filtern darauf. */
export const TEST_PREFIX = "agent-test-";
export const ANONYM_ID_KEY = "cal-anonymous-id";
/** Rolle → Konto. Kein Admin-Konto für Agenten. */
export const KONTEN = {
  lernend: { env: "AGENT_LERNEND_EMAIL", appMetadata: () => ({ agent: true }) },
  ausbilder: {
    env: "AGENT_AUSBILDER_EMAIL",
    appMetadata: (organisationId) => ({ agent: true, role: "ausbilder", ...(organisationId ? { organisation_id: organisationId } : {}) }),
  },
};

export const istTestdatum = (anonymousId) => typeof anonymousId === "string" && anonymousId.startsWith(TEST_PREFIX);
/** Zeilen mit `anonymous_id` ohne Testkonten: für alle Kennzahlen und Auswertungen. */
export const ohneTestdaten = (rows) => rows.filter((r) => !istTestdatum(r.anonymous_id ?? r.anonymousId));

/** Seiten hinter dem Login (SIN-914): hier prüfen Crawler und PR-Crawler mit Sitzung. `/ausbilder/zugang` ist öffentlich. */
const LOGIN_ROUTEN = ["/lernpfad", "/profil", "/pruefung", "/einstellungen", "/ergebnis", "/wiederholung", "/einheit", "/ausbilder"];
export const hinterLogin = (route) => route !== "/ausbilder/zugang" && LOGIN_ROUTEN.some((p) => route === p || route.startsWith(`${p}/`));
/** Pfad der `storageState`-Datei für eine Route (Ausbilder-Bereich: Ausbilder, sonst Lernende); `undefined` = ohne Sitzung. */
/** @param {string} route @param {Record<string, string | undefined>} [env] */
export const stateFuer = (route, env = process.env) =>
  hinterLogin(route) ? (route.startsWith("/ausbilder") ? env.AGENT_STORAGE_STATE_AUSBILDER : env.AGENT_STORAGE_STATE) || undefined : undefined;

/** supabase-js speichert die Sitzung im Browser unter `sb-<Projekt>-auth-token`. */
export const storageKey = (supabaseUrl) => `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

/** Playwright-`storageState` mit der Sitzung und der Test-Kennung im localStorage der App. */
export function baueStorageState({ supabaseUrl, appUrl, session, rolle }) {
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(appUrl).origin,
        localStorage: [
          { name: storageKey(supabaseUrl), value: JSON.stringify(session) },
          { name: ANONYM_ID_KEY, value: `${TEST_PREFIX}${rolle}` },
        ],
      },
    ],
  };
}

/** Konto anlegen, falls es fehlt (E-Mail bestätigt, als Test markiert). Zweiter Lauf ändert nichts. */
export async function stelleKontoSicher(admin, email, appMetadata) {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true, app_metadata: appMetadata });
  if (error && error.code !== "email_exists" && error.status !== 422) throw new Error(`Konto nicht angelegt: ${error.message}`);
}

/** Sitzung ohne Passwort: generateLink → verifyOtp. `admin` ist ein Supabase-Client mit Service-Role-Key. */
export async function holeSitzung(admin, email) {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = link?.properties?.hashed_token;
  if (error || !hash) throw new Error(`Anmelde-Link nicht erzeugt: ${error?.message ?? "kein Hash"}`);
  const { data, error: otpError } = await admin.auth.verifyOtp({ type: "magiclink", token_hash: hash });
  if (otpError || !data?.session) throw new Error(`Sitzung nicht bestätigt: ${otpError?.message ?? "keine Sitzung"}`);
  return data.session;
}

/** Legt beide Konten an und liefert je Rolle den `storageState`. */
export async function baueSitzungen({ admin, env, appUrl }) {
  const ergebnis = {};
  for (const [rolle, konto] of Object.entries(KONTEN)) {
    const email = env[konto.env]?.trim();
    if (!email) throw new Error(`${konto.env} fehlt (Repo-Variable)`);
    await stelleKontoSicher(admin, email, konto.appMetadata(env.AGENT_ORGANISATION_ID?.trim()));
    const session = await holeSitzung(admin, email);
    ergebnis[rolle] = baueStorageState({ supabaseUrl: env.SUPABASE_URL, appUrl, session, rolle });
  }
  return ergebnis;
}

async function main() {
  const out = process.argv[process.argv.indexOf("--out") + 1];
  const env = process.env;
  const appUrl = env.LIVE_URL;
  if (!out || !appUrl || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.AGENT_LERNEND_EMAIL || !env.AGENT_AUSBILDER_EMAIL) {
    console.log("Agent-Sitzung übersprungen: --out, LIVE_URL, Supabase-Zugang oder Testkonto-Adressen (Repo-Variablen) fehlen.");
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const sitzungen = await baueSitzungen({ admin, env, appUrl });
  mkdirSync(out, { recursive: true, mode: 0o700 });
  for (const [rolle, state] of Object.entries(sitzungen)) writeFileSync(`${out}/${rolle}.json`, JSON.stringify(state), { mode: 0o600 });
  if (env.GITHUB_ENV) appendFileSync(env.GITHUB_ENV, `AGENT_STORAGE_STATE=${out}/lernend.json\nAGENT_STORAGE_STATE_AUSBILDER=${out}/ausbilder.json\n`);
  console.log(`Agent-Sitzungen bereit: ${Object.keys(sitzungen).join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`::error::${e.message}`);
    process.exit(1);
  });
}
