import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// SIN-1197: Anmelden mit Passwort, Registrieren, Passwort vergessen. Supabase-Auth wird gemockt (kein Dienst in CI);
// die Seite bekommt die Adresse über die Testnaht in browser-client.ts.
const AUTH = "http://supabase.test";
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "*",
};

type Aufruf = { pfad: string; query: URLSearchParams; body: Record<string, unknown> };

async function mockAuth(page: Page, antworten: Record<string, (a: Aufruf) => { status?: number; json: unknown }>) {
  const aufrufe: Aufruf[] = [];
  await page.addInitScript((url) => {
    (globalThis as { __SUPABASE_TEST__?: unknown }).__SUPABASE_TEST__ = { url, key: "anon-test" };
  }, AUTH);
  await page.route(`${AUTH}/**`, async (route: Route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    const aufruf: Aufruf = { pfad: url.pathname, query: url.searchParams, body: req.postDataJSON() ?? {} };
    aufrufe.push(aufruf);
    const antwort = antworten[url.pathname]?.(aufruf) ?? { status: 404, json: { msg: "nicht gemockt" } };
    return route.fulfill({ status: antwort.status ?? 200, headers: cors, json: antwort.json });
  });
  return aufrufe;
}

const user = { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", email: "sinan-test@sjcode.de", app_metadata: {}, user_metadata: {} };
const sitzung = { access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };

test("Login mit Passwort führt zum Lernpfad, Passwort lässt sich anzeigen", async ({ page }) => {
  const aufrufe = await mockAuth(page, {
    "/auth/v1/token": ({ body }) =>
      body.password === "richtiges-passwort"
        ? { json: sitzung }
        : { status: 400, json: { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" } },
  });
  await page.goto("/anmelden");
  await expect(page.getByRole("heading", { level: 1, name: "Anmelden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Passwort vergessen?" })).toHaveAttribute("href", "/passwort-vergessen");
  await expect(page.getByRole("link", { name: "Registrieren" })).toHaveAttribute("href", "/registrieren");
  await expect(page.getByRole("button", { name: "Mit Google anmelden" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Link per E-Mail schicken" })).toBeVisible();

  const passwort = page.getByLabel("Passwort", { exact: true });
  await expect(passwort).toHaveAttribute("type", "password");
  await page.getByLabel("Passwort anzeigen").check();
  await expect(passwort).toHaveAttribute("type", "text");

  await page.getByLabel("E-Mail").fill("sinan-test@sjcode.de");
  await passwort.fill("falsch-falsch");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toHaveText("E-Mail oder Passwort stimmt nicht.");

  await passwort.fill("richtiges-passwort");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/lernpfad$/);
  expect(aufrufe.filter((a) => a.query.get("grant_type") === "password")).toHaveLength(2);
});

test("Google: Weiterleitung geht auf die eigene Origin", async ({ page }) => {
  await mockAuth(page, {});
  await page.route(`${AUTH}/auth/v1/authorize**`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));
  await page.goto("/anmelden?weiter=/profil");
  const anfrage = page.waitForRequest((r) => r.url().startsWith(`${AUTH}/auth/v1/authorize`));
  await page.getByRole("button", { name: "Mit Google anmelden" }).click();
  const url = new URL((await anfrage).url());
  expect(url.searchParams.get("provider")).toBe("google");
  expect(url.searchParams.get("redirect_to")).toBe(`${new URL(page.url()).origin}/profil`);
});

test("Registrieren bis zum Hinweis auf die Bestätigungsmail", async ({ page }) => {
  const aufrufe = await mockAuth(page, {
    "/auth/v1/signup": () => ({ json: { ...user, email: "neu@example.de", identities: [{}], confirmation_sent_at: new Date().toISOString() } }),
  });
  await page.goto("/registrieren");
  await expect(page.getByRole("heading", { level: 1, name: "Registrieren" })).toBeVisible();

  await page.getByLabel("E-Mail").fill("neu@example.de");
  await page.getByLabel("Passwort", { exact: true }).fill("langes-passwort");
  await page.getByRole("button", { name: "Registrieren", exact: true }).click(); // ohne Zustimmung: nativ blockiert
  expect(aufrufe).toHaveLength(0);

  await page.getByLabel(/Datenschutzerklärung/).check();
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Wir haben Ihnen eine E-Mail geschickt");
  expect(aufrufe).toHaveLength(1);
  expect(aufrufe[0].query.get("redirect_to")).toBe(`${new URL(page.url()).origin}/lernpfad`);
  // Keine Rolle und keine Organisation mitschicken: das Konto ist Lernende(r) ohne Organisation.
  expect(JSON.stringify(aufrufe[0].body)).not.toMatch(/role|organisation/i);
});

test("Passwort vergessen bis zum Mailversand", async ({ page }) => {
  const aufrufe = await mockAuth(page, { "/auth/v1/recover": () => ({ json: {} }) });
  await page.goto("/passwort-vergessen");
  await page.getByLabel("E-Mail").fill("sinan-test@sjcode.de");
  await page.getByRole("button", { name: "Link schicken" }).click();
  await expect(page.getByRole("status")).toContainText("Wenn zu dieser Adresse ein Konto besteht");
  expect(aufrufe).toHaveLength(1);
  expect(aufrufe[0].query.get("redirect_to")).toBe(`${new URL(page.url()).origin}/passwort-neu`);
});

test("Passwort neu: ohne gültigen Link keine Eingabe, mit Sitzung wird gespeichert", async ({ page }) => {
  const aufrufe = await mockAuth(page, { "/auth/v1/user": () => ({ json: user }) });
  await page.goto("/passwort-neu");
  await expect(page.getByText("Link nicht gültig")).toBeVisible();
  await expect(page.getByRole("link", { name: "Neuen Link anfordern" })).toHaveAttribute("href", "/passwort-vergessen");

  // Link aus der Mail: Sitzung im Adress-Fragment, wie sie Supabase nach der Bestätigung anhängt.
  const fragment = new URLSearchParams({ access_token: sitzung.access_token, refresh_token: "r", expires_in: "3600", token_type: "bearer", type: "recovery" });
  await page.goto("about:blank"); // frisch laden: nur ein Seitenaufruf wertet das Fragment aus
  await page.goto(`/passwort-neu#${fragment}`);
  await page.getByLabel("Neues Passwort", { exact: true }).fill("neues-passwort-1");
  await page.getByLabel("Neues Passwort wiederholen").fill("anderes-passwort");
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(page.locator("p[role=alert]")).toHaveText("Die beiden Passwörter sind nicht gleich.");

  await page.getByLabel("Neues Passwort wiederholen").fill("neues-passwort-1");
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(page).toHaveURL(/\/lernpfad$/);
  expect(aufrufe.some((a) => a.pfad === "/auth/v1/user" && a.body.password === "neues-passwort-1")).toBe(true);
});

for (const route of ["/anmelden", "/registrieren", "/passwort-vergessen", "/passwort-neu"]) {
  test(`axe: ${route}`, async ({ page }) => {
    await mockAuth(page, {});
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(result.violations).toEqual([]);
  });
}
