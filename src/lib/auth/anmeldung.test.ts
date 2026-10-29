import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  anmeldeFehler,
  mailFehlerSichtbar,
  mailLink,
  pruefeEmail,
  pruefePasswort,
  sicheresZiel,
  zielNachLogin,
} from "./anmeldung";
import { ausbilderClient } from "../ausbilder/server";

test("pruefeEmail und pruefePasswort", () => {
  assert.equal(pruefeEmail(" a@b.de "), null);
  assert.ok(pruefeEmail("a@b"));
  assert.ok(pruefeEmail(""));
  assert.equal(pruefePasswort("12345678"), null);
  assert.ok(pruefePasswort("1234567"));
  assert.ok(pruefePasswort("x".repeat(73)));
});

test("sicheresZiel lässt nur eigene Pfade durch (kein offener Weiterleiter)", () => {
  assert.equal(sicheresZiel("/lernpfad"), "/lernpfad");
  assert.equal(sicheresZiel("/einheit/unit-03?a=1"), "/einheit/unit-03?a=1");
  for (const boese of ["//evil.de", "https://evil.de", "evil.de", "/\\evil.de", "/a\nb", "", null, undefined]) {
    assert.equal(sicheresZiel(boese), null, String(boese));
  }
});

test("zielNachLogin: gewünschte Seite vor Rolle, Ausbilder zu den Gruppen, alle anderen zum Lernpfad", () => {
  assert.equal(zielNachLogin("ausbilder", null), "/ausbilder/gruppen");
  assert.equal(zielNachLogin(undefined, null), "/lernpfad");
  assert.equal(zielNachLogin("ausbilder", "/profil"), "/profil");
  assert.equal(zielNachLogin(undefined, "//evil.de"), "/lernpfad");
});

test("mailLink hängt den Pfad an die eigene Origin", () => {
  assert.equal(mailLink("https://lernapp.example", "/passwort-neu"), "https://lernapp.example/passwort-neu");
  assert.equal(mailLink("https://lernapp.example", "//evil.de"), "https://lernapp.example/lernpfad");
});

test("Fehlertexte verraten nicht, ob eine Adresse ein Konto hat", () => {
  assert.equal(anmeldeFehler({ status: 400, code: "invalid_credentials" }), anmeldeFehler({ status: 400 }));
  assert.match(anmeldeFehler({ status: 400 }), /stimmt nicht/);
  assert.equal(mailFehlerSichtbar(null), false);
  assert.equal(mailFehlerSichtbar({ status: 422, code: "user_already_exists" }), false);
  assert.equal(mailFehlerSichtbar({ status: 429, code: "over_email_send_rate_limit" }), true);
  assert.equal(mailFehlerSichtbar({ status: 500 }), true);
  assert.equal(mailFehlerSichtbar({ status: 422, code: "weak_password" }), true);
});

// SIN-1197: Selbst registrierte Konten haben keine Rolle (`app_metadata` setzt nur der Server) und keine Organisation.
// Sie sehen deshalb nichts aus Gruppen oder Organisationen. Belegt an der Datenbank (alle Migrationen) und an der API.
const sql = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"))
  .join("\n");

const ROLLE = /app_metadata'\s*->>\s*'role'\)\s*=\s*'ausbilder'/;

test("RLS: jede Lese-Regel auf Gruppen-Tabellen verlangt die Rolle ausbilder", () => {
  const regeln = [...sql.matchAll(/create policy (\w+) on public\.(trainer_groups|group_members|group_invitations)\b([\s\S]*?);/g)];
  assert.ok(regeln.length >= 3, "Regeln nicht gefunden");
  for (const [, name, , rumpf] of regeln) assert.match(rumpf, ROLLE, `${name} prüft die Rolle nicht`);
});

test("RLS: Organisations-Tabellen sind für angemeldete Konten gesperrt", () => {
  for (const t of ["organisations", "organisation_trainers", "trainer_access_links", "demo_requests"]) {
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security;`), t);
    assert.match(sql, new RegExp(`revoke all on public\\.${t} from anon, authenticated;`), t);
    assert.doesNotMatch(sql, new RegExp(`create policy \\w+ on public\\.${t}\\b`), `${t} hat eine Regel für Nutzer`);
  }
});

test("RLS: jede Funktion ausbilder_* prüft die Rolle", () => {
  const funktionen = [...sql.matchAll(/create (?:or replace )?function public\.(ausbilder_\w+\([^)]*\))[\s\S]*?\n\$\$;/gi)];
  assert.ok(funktionen.length >= 5, "Funktionen nicht gefunden");
  for (const [text, name] of funktionen) assert.match(text, /'ausbilder'/, `${name} prüft die Rolle nicht`);
});

test("API: ein Konto ohne Rolle bekommt 403, nie Gruppendaten", async () => {
  const alt = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
  process.env.SUPABASE_URL = "http://supabase.test";
  process.env.SUPABASE_ANON_KEY = "anon";
  globalThis.fetch = async () =>
    Response.json({ id: "u1", aud: "authenticated", email: "neu@example.de", app_metadata: { provider: "email" }, user_metadata: { role: "ausbilder" } });
  try {
    const res = await ausbilderClient(new Request("http://x/api", { headers: { authorization: "Bearer t" } }), "nicht eingerichtet");
    assert.ok("response" in res);
    assert.equal(res.response.status, 403);
  } finally {
    globalThis.fetch = alt.fetch;
    for (const [k, v] of [["SUPABASE_URL", alt.url], ["SUPABASE_ANON_KEY", alt.key]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
