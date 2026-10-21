import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ANONYM_ID_KEY,
  KONTEN,
  TEST_PREFIX,
  baueSitzungen,
  baueStorageState,
  hinterLogin,
  holeSitzung,
  ohneTestdaten,
  stateFuer,
  storageKey,
} from "../../../scripts/agent-testnutzer/sitzung.mjs";
import { weakestUnits } from "../../../scripts/autonomy/content-metrics.mjs";

const SESSION = { access_token: "a.b.c", refresh_token: "r", expires_at: 1, token_type: "bearer", user: { id: "u1" } };

/** Supabase-Client-Attrappe: merkt sich die Aufrufe. */
function attrappe({ linkFehler = null, otpFehler = null, vorhanden = false }: { linkFehler?: { message: string } | null; otpFehler?: { message: string } | null; vorhanden?: boolean } = {}) {
  const calls: string[] = [];
  const admin = {
    auth: {
      admin: {
        createUser: async (a: { email: string; app_metadata: Record<string, unknown> }) => {
          calls.push(`createUser:${a.email}:${JSON.stringify(a.app_metadata)}`);
          return { error: vorhanden ? { code: "email_exists", status: 422, message: "x" } : null };
        },
        generateLink: async (a: { type: string; email: string }) => {
          calls.push(`generateLink:${a.type}:${a.email}`);
          return linkFehler ? { data: null, error: linkFehler } : { data: { properties: { hashed_token: "hash-1" } }, error: null };
        },
      },
      verifyOtp: async (a: { type: string; token_hash: string }) => {
        calls.push(`verifyOtp:${a.type}:${a.token_hash}`);
        return otpFehler ? { data: {}, error: otpFehler } : { data: { session: SESSION }, error: null };
      },
    },
  };
  return { admin, calls };
}

test("holeSitzung: generateLink (magiclink) → verifyOtp mit dem Hash", async () => {
  const { admin, calls } = attrappe();
  assert.deepEqual(await holeSitzung(admin, "agent@example.invalid"), SESSION);
  assert.deepEqual(calls, ["generateLink:magiclink:agent@example.invalid", "verifyOtp:magiclink:hash-1"]);
});

test("holeSitzung: Fehler bei Link oder Bestätigung brechen ab", async () => {
  await assert.rejects(holeSitzung(attrappe({ linkFehler: { message: "nope" } }).admin, "a@b.c"), /Anmelde-Link nicht erzeugt: nope/);
  await assert.rejects(holeSitzung(attrappe({ otpFehler: { message: "abgelaufen" } }).admin, "a@b.c"), /Sitzung nicht bestätigt: abgelaufen/);
});

test("baueStorageState: localStorage mit Sitzung und Test-Kennung, Herkunft der App", () => {
  const state = baueStorageState({ supabaseUrl: "https://abc123.supabase.co", appUrl: "https://app.example/lernpfad", session: SESSION, rolle: "lernend" });
  assert.equal(state.origins[0].origin, "https://app.example");
  const ls = Object.fromEntries(state.origins[0].localStorage.map((e: { name: string; value: string }) => [e.name, e.value]));
  assert.equal(storageKey("https://abc123.supabase.co"), "sb-abc123-auth-token");
  assert.deepEqual(JSON.parse(ls["sb-abc123-auth-token"]), SESSION);
  assert.equal(ls[ANONYM_ID_KEY], `${TEST_PREFIX}lernend`);
});

test("baueSitzungen: beide Konten, idempotent, Ausbilder mit Rolle, kein Admin", async () => {
  const { admin, calls } = attrappe({ vorhanden: true });
  const env = { AGENT_LERNEND_EMAIL: "l@x.invalid", AGENT_AUSBILDER_EMAIL: "a@x.invalid", SUPABASE_URL: "https://p.supabase.co" };
  const s = await baueSitzungen({ admin, env, appUrl: "https://app.example" });
  assert.deepEqual(Object.keys(s), ["lernend", "ausbilder"]);
  assert.match(calls.join("\n"), /createUser:a@x.invalid:.*"role":"ausbilder"/);
  assert.ok(!calls.some((c) => c.includes("admin\"")));
  assert.deepEqual(Object.keys(KONTEN), ["lernend", "ausbilder"]);
  await assert.rejects(baueSitzungen({ admin, env: { ...env, AGENT_AUSBILDER_EMAIL: "" }, appUrl: "https://app.example" }), /AGENT_AUSBILDER_EMAIL fehlt/);
});

test("Routen hinter dem Login bekommen die passende Sitzung", () => {
  const env = { AGENT_STORAGE_STATE: "/t/lernend.json", AGENT_STORAGE_STATE_AUSBILDER: "/t/ausbilder.json" };
  assert.equal(stateFuer("/lernpfad", env), "/t/lernend.json");
  assert.equal(stateFuer("/einheit/unit-03", env), "/t/lernend.json");
  assert.equal(stateFuer("/ausbilder/gruppen", env), "/t/ausbilder.json");
  assert.equal(stateFuer("/ausbilder/zugang", env), undefined);
  assert.equal(stateFuer("/impressum", env), undefined);
  assert.equal(stateFuer("/lernpfad", {}), undefined);
  assert.equal(hinterLogin("/lernpfadx"), false);
});

test("Probe in docs/abnahme.yml: Datei-Check auf den Sitzungs-Helfer", () => {
  const yml = readFileSync("docs/abnahme.yml", "utf8");
  const pfad = /pfad: (\S+)/.exec(yml)?.[1];
  const enthaelt = /enthaelt: (\S+)/.exec(yml)?.[1];
  assert.equal(pfad, "scripts/agent-testnutzer/sitzung.mjs");
  assert.ok(readFileSync(pfad, "utf8").includes(enthaelt as string));
});

test("Kein Passwort, Token oder Sitzung im Helfer: nur Umgebungsvariablen", () => {
  const code = readFileSync("scripts/agent-testnutzer/sitzung.mjs", "utf8");
  assert.ok(!/eyJ[A-Za-z0-9_-]{10,}/.test(code));
  assert.ok(!/password/i.test(code.replace(/ohne Passwort|kein Passwort/gi, "")));
});

test("Testkonten fließen nicht in Kennzahlen ein", () => {
  const rows = [
    ...Array.from({ length: 5 }, () => ({ anonymous_id: `${TEST_PREFIX}lernend`, course_id: "c", unit_id: "u1", correct: false })),
    ...Array.from({ length: 5 }, (_, i) => ({ anonymous_id: `echt-${i}`, course_id: "c", unit_id: "u1", correct: true })),
  ];
  assert.equal(ohneTestdaten(rows).length, 5);
  const { learners, weakest } = weakestUnits(ohneTestdaten(rows), "c");
  assert.equal(learners, 5);
  assert.equal(weakest[0].pct, 100);
  assert.equal(weakestUnits(rows, "c").learners, 6);
});
