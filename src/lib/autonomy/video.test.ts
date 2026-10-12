import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { heuteSchonGelaufen, pruefeDauer, registrieren, standbildZeiten, storagePfad, werbemittelZeile } from "../../../scripts/autonomy/video.mjs";
import { KLICKWEG } from "../../../scripts/autonomy/video-klickweg";

test("Standbilder: ein Zeitpunkt je Schritt, nach Titel (3 s) und Einblendung", () => {
  const z = standbildZeiten([{ id: "start", startMs: 0 }, { id: "beruf wählen", startMs: 4200 }]);
  assert.deepEqual(z, [
    { datei: "schritt-01-start.png", sekunde: 4 },
    { datei: "schritt-02-beruf-w-hlen.png", sekunde: 8.2 },
  ]);
});

test("Länge: unter 90 Sekunden ist ok, ab 90 und ungültig sind Fehler", () => {
  assert.equal(pruefeDauer("45.5"), 45.5);
  assert.throws(() => pruefeDauer(90));
  assert.throws(() => pruefeDauer(120));
  assert.throws(() => pruefeDauer("abc"));
  assert.throws(() => pruefeDauer(0));
});

test("Tageslimit: ein erfolgreicher oder laufender Lauf heute sperrt, gescheiterte und eigene nicht", () => {
  const now = new Date("2026-10-12T15:00:00Z");
  assert.equal(heuteSchonGelaufen([{ id: 1, created_at: "2026-10-12T08:00:00Z", conclusion: "success" }], now), true);
  assert.equal(heuteSchonGelaufen([{ id: 1, created_at: "2026-10-12T08:00:00Z", conclusion: null }], now), true);
  assert.equal(heuteSchonGelaufen([{ id: 1, created_at: "2026-10-12T08:00:00Z", conclusion: "failure" }], now), false);
  assert.equal(heuteSchonGelaufen([{ id: 1, created_at: "2026-10-11T23:00:00Z", conclusion: "success" }], now), false);
  assert.equal(heuteSchonGelaufen([{ id: 7, created_at: "2026-10-12T14:59:00Z", conclusion: null }], now, "7"), false);
  assert.equal(heuteSchonGelaufen([], now), false);
});

test("Storage-Pfad: Slug, Datum, Kurz-SHA", () => {
  assert.equal(storagePfad("Lern-App", "abcdef1234", new Date("2026-10-12T00:00:00Z")), "lern-app/2026-10-12-abcdef1.mp4");
});

test("Zeile: Status wartet_auf_freigabe, mit KI, ohne Ton, Klickweg ohne Fremdfelder", () => {
  const z = werbemittelZeile({ produkt: "lern-app", pfad: "p.mp4", dauer: 42.04, klickweg: { schritte: [{ ...KLICKWEG[0], startMs: 10, extra: "x" }] } });
  assert.equal(z.status, "wartet_auf_freigabe");
  assert.equal(z.dauer_sekunden, 42);
  assert.equal(z.mit_ki, true);
  assert.equal(z.mit_ton, false);
  assert.deepEqual(Object.keys(z.klickweg[0]), ["id", "titel", "text", "startMs"]);
  assert.throws(() => werbemittelZeile({ produkt: "x", pfad: "p", dauer: 95, klickweg: [] }));
});

test("Registrieren: Upload in den Bucket, dann Zeile; Fehler und fehlende Secrets brechen ab", async () => {
  const calls: { url: string; method?: string }[] = [];
  const ok = (async (url: string, init: { method?: string }) => {
    calls.push({ url, method: init.method });
    return { ok: true, status: 201, text: async () => "" };
  }) as unknown as typeof fetch;
  const zeile = werbemittelZeile({ produkt: "lern-app", pfad: "lern-app/t.mp4", dauer: 30, klickweg: [] });
  await registrieren({ env: { SUPABASE_URL: "https://x.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: "k" }, mp4: Buffer.from("a"), zeile, fetchImpl: ok });
  assert.deepEqual(calls.map((c) => c.url), ["https://x.supabase.co/storage/v1/object/werbemittel/lern-app/t.mp4", "https://x.supabase.co/rest/v1/werbemittel"]);
  const bad = (async () => ({ ok: false, status: 403, text: async () => "denied" })) as unknown as typeof fetch;
  await assert.rejects(registrieren({ env: { SUPABASE_URL: "https://x", SUPABASE_SERVICE_ROLE_KEY: "k" }, mp4: Buffer.from("a"), zeile, fetchImpl: bad }), /403/);
  await assert.rejects(registrieren({ env: {}, mp4: Buffer.from("a"), zeile, fetchImpl: ok }), /fehlt/);
});

test("Migration: nur additiv, privater Bucket, RLS an, Schema-Cache neu laden", () => {
  const sql = readFileSync("supabase/migrations/20261018010000_sin483_werbemittel.sql", "utf8");
  assert.match(sql, /create table if not exists public\.werbemittel/);
  assert.match(sql, /default 'wartet_auf_freigabe'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /'werbemittel', 'werbemittel', false/);
  assert.match(sql, /notify pgrst, 'reload schema'/);
  assert.doesNotMatch(sql, /\b(drop|delete|truncate)\b/i);
});

test("Workflow: Freigabe bleibt offen, Länge und Tageslimit geprüft, nichts veröffentlicht", () => {
  const yml = readFileSync(".github/workflows/video.yml", "utf8");
  assert.match(yml, /workflows: \[production-deploy\]/);
  assert.match(yml, /video\.mjs limit/);
  assert.match(yml, /video\.mjs pruefen/);
  assert.match(yml, /video\.mjs registrieren/);
  assert.doesNotMatch(yml, /ANTHROPIC|OPENAI/);
});
