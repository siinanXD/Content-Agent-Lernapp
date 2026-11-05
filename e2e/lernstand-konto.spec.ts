import { test, expect, type Browser, type Page, type Route } from "@playwright/test";

// SIN-1451: Lernstand gehört zum Konto. Browser A schließt eine Einheit ab, ein frischer Browser B (eigener Kontext,
// leerer lokaler Speicher) meldet sich mit demselben Konto an und sieht denselben Stand. Supabase (Auth und
// PostgREST) wird gemockt; `server` steht für die Tabelle learner_state, die beide Browser gemeinsam nutzen.
const AUTH = "http://supabase.test";
const SOURCE = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const user = { id: "00000000-0000-0000-0000-000000001451", aud: "authenticated", email: "konto@example.invalid", app_metadata: {}, user_metadata: {} };
const sitzung = {
  access_token: "a.b.c",
  refresh_token: "r",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user,
};

const units = Array.from({ length: 4 }, (_, i) => ({
  id: `M0-1-u${i + 1}`,
  title: `Berufsbildung ${i + 1}`,
  minutes: 6,
  explanation: "Kurz erklärt.",
  questions: [
    {
      id: `M0-1-u${i + 1}-q1`,
      type: "single",
      prompt: "Wer trägt die Kosten für Schutzkleidung?",
      choices: ["Der Betrieb", "Die Auszubildenden"],
      correct: "Der Betrieb",
      explanation: "Der Betrieb stellt PSA kostenlos.",
      sourceUrl: SOURCE,
      sourceFetchedAt: "2026-10-03",
      examAreas: ["WISO-1"],
    },
  ],
  sourceUrl: SOURCE,
  sourceFetchedAt: "2026-10-03",
  moduleId: "M0",
  blockId: "M0-1",
}));

type Zeile = { user_id: string; events: unknown[]; stack: unknown[] };
let server: { zeile: Zeile | null; aus: boolean };

test.use({ serviceWorkers: "block" });
test.beforeEach(() => {
  server = { zeile: null, aus: false };
});

async function neuerBrowser(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(
    ([url, s]) => {
      (globalThis as { __SUPABASE_TEST__?: unknown }).__SUPABASE_TEST__ = { url, key: "anon-test" };
      window.localStorage.setItem("sb-supabase-auth-token", JSON.stringify(s));
      window.localStorage.setItem(
        "cal-onboarding",
        JSON.stringify({ consent: false, schwerpunktId: "metall-kunststoff", mapId: "maf-metall" }),
      );
    },
    [AUTH, sitzung] as const,
  );
  await page.route("**/api/learner/phase-a", (route) =>
    route.fulfill({ json: { courseId: "e22073de", keyword: "Maschinen- und Anlagenführer", phase: "A", unitCount: units.length, units, source: "supabase" } }),
  );
  await page.route(`${AUTH}/**`, async (route: Route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const pfad = new URL(req.url()).pathname;
    if (pfad !== "/rest/v1/learner_state") return route.fulfill({ status: 404, headers: cors, json: {} });
    if (server.aus) return route.abort("internetdisconnected");
    if (req.method() === "GET") {
      // supabase-js maybeSingle() fragt eine Liste ab: keine Zeile = [], eine Zeile = [zeile].
      return route.fulfill({ headers: cors, json: server.zeile ? [server.zeile] : [] });
    }
    server.zeile = req.postDataJSON() as Zeile;
    return route.fulfill({ status: 201, headers: cors, body: "" });
  });
  return page;
}

async function einheitAbschliessen(page: Page) {
  await page.goto("/lernpfad");
  await expect(page.getByText("Berufsbildung 1").first()).toBeVisible();
  await page.locator('[data-state="heute"]').first().click();
  await page.locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).click();
  await expect(page).toHaveURL(/\/ergebnis$/);
}

async function stand(page: Page) {
  await page.goto("/lernpfad");
  await expect(page.locator('[data-state="erledigt"]')).toHaveCount(1);
  await expect(page.locator('[data-state="erledigt"]')).toContainText("01 · Fertig");
  await expect(page.locator('[data-state="heute"]')).toContainText("02 · Jetzt");
}

test("Einheit in Browser A, frischer Browser B mit demselben Konto zeigt denselben Stand", async ({ browser }) => {
  const a = await neuerBrowser(browser);
  await einheitAbschliessen(a);
  await expect.poll(() => server.zeile?.events.length ?? 0).toBe(1);
  await stand(a);

  const b = await neuerBrowser(browser);
  await b.goto("/lernpfad");
  await expect(b.locator('[data-state="erledigt"]')).toHaveCount(1);
  await expect(b.locator('[data-state="erledigt"]')).toContainText("01 · Fertig");
  await expect(b.locator('[data-state="heute"]')).toContainText("02 · Jetzt");
});

test("offline begonnene Einheit geht nicht verloren: sie wird nach Rückkehr des Netzes übertragen", async ({ browser }) => {
  server.aus = true;
  const a = await neuerBrowser(browser);
  await einheitAbschliessen(a);
  await stand(a); // lokal sofort sichtbar
  expect(server.zeile).toBeNull();

  server.aus = false;
  await a.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => server.zeile?.events.length ?? 0).toBe(1);

  const b = await neuerBrowser(browser);
  await stand(b);
});

test("fertig gelernte Frage kommt durch den Abgleich nicht zurück (Stufe 4 richtig)", async ({ browser }) => {
  const frage = { questionId: "M0-1-u1-q1", stage: 4, dueAt: "2026-11-01T00:00:00.000Z" };
  server.zeile = { user_id: user.id, events: [], stack: [frage] };
  const a = await neuerBrowser(browser);
  await a.goto("/lernpfad");
  await a.evaluate((f) => window.localStorage.setItem("cal-leitner-stack", JSON.stringify({ items: [f], updatedAt: f.dueAt })), frage);
  await a.goto("/wiederholung");
  await a.locator("button[aria-pressed]").first().click();
  await a.getByRole("button", { name: "Antwort prüfen" }).click();

  await expect.poll(() => JSON.stringify(server.zeile?.stack ?? [])).toContain('"entfernt":true');
  await a.waitForTimeout(3000); // der Abgleich lief; früher holte er die Frage nach etwa 1 s zurück
  const lokal = await a.evaluate(() => JSON.parse(window.localStorage.getItem("cal-leitner-stack") ?? "{}").items);
  expect(lokal).toEqual([]);
  expect((server.zeile?.stack as { stage?: number }[]).some((z) => z.stage)).toBe(false);
});
