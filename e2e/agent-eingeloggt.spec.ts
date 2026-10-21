import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import path from "node:path";

// SIN-914: Agent-Testnutzer sind eingeloggt. Der Smoke baut denselben storageState wie der Sitzungs-Helfer (hier mit einer
// Attrappen-Sitzung) und öffnet /lernpfad: die Seite bleibt auf /lernpfad und leitet nicht zu /anmelden. Gegen eine echte Vorschau
// mit AGENT_STORAGE_STATE (Sitzung aus dem Workflow) gilt dieselbe Erwartung mit echter Sitzung.
const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:43123";
const attrappe = {
  access_token: "attrappe",
  refresh_token: "attrappe",
  token_type: "bearer",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "00000000-0000-0000-0000-000000000000", email: "agent-lernend@example.invalid" },
};

test("/lernpfad öffnet eingeloggt, nicht /anmelden", async ({ browser }) => {
  // Der Helfer ist ein ES-Modul (.mjs); Playwright lädt Specs als CommonJS, daher per Dateiadresse.
  const helfer = pathToFileURL(path.resolve("scripts/agent-testnutzer/sitzung.mjs")).href;
  const { baueStorageState } = await (new Function("u", "return import(u)") as (u: string) => Promise<typeof import("../scripts/agent-testnutzer/sitzung.mjs")>)(helfer);
  const storageState =
    process.env.AGENT_STORAGE_STATE ||
    baueStorageState({ supabaseUrl: "https://attrappe.supabase.co", appUrl: base, session: attrappe, rolle: "lernend" });
  const context = await browser.newContext({
    storageState,
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
    baseURL: base,
  });
  const page = await context.newPage();
  await page.goto("/lernpfad");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/lernpfad");
  await context.close();
});
