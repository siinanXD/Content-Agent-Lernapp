import { test, expect } from "@playwright/test";

// SIN-1455: Als angemeldetes Konto (Sitzung per Testnaht, siehe anmelden.spec.ts) landet /start auf „Heute“,
// und /ausbilder sagt ohne Rolle „Kein Zugang“. Beides ohne Konsolenfehler und ohne Anfrage, die 401/403 melden würde.
const AUTH = "http://supabase.test";
const user = { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", email: "lernende@example.invalid", app_metadata: {}, user_metadata: {} };
const sitzung = { access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([url, wert]) => {
      (globalThis as { __SUPABASE_TEST__?: unknown }).__SUPABASE_TEST__ = { url, key: "anon-test" };
      window.localStorage.setItem("sb-supabase-auth-token", wert);
      window.localStorage.setItem("cal-onboarding", JSON.stringify({ consent: false, schwerpunktId: "metall-kunststoff", mapId: "maf-metall" }));
    },
    [AUTH, JSON.stringify(sitzung)],
  );
  await page.route(`${AUTH}/**`, (route) =>
    route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, json: {} }),
  );
});

test("Angemeldet: /start führt auf Heute, /ausbilder sagt „Kein Zugang“, keine Konsolenfehler", async ({ page }) => {
  const konsole: string[] = [];
  const anfragen: string[] = [];
  page.on("console", (m) => m.type() === "error" && konsole.push(m.text()));
  page.on("pageerror", (e) => konsole.push(e.message));
  page.on("request", (r) => anfragen.push(r.url()));

  await page.goto("/start");
  await expect(page).toHaveURL(/\/lernpfad$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Heute" })).toHaveAttribute("aria-current", "page");

  await page.goto("/ausbilder");
  await expect(page.getByText("Kein Zugang", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Zurück zu Heute" })).toHaveAttribute("href", "/lernpfad");
  expect(anfragen.filter((u) => u.includes("/api/ausbilder/")), "keine Anfrage ohne Rolle").toEqual([]);
  expect(konsole).toEqual([]);
});
