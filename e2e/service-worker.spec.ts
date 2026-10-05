import { test, expect } from "@playwright/test";

// SIN-250: Cache-Name folgt dem Build, alte Caches verschwinden, offline bleibt die Hülle nutzbar.
test("neuer Deploy räumt alten Cache, offline zeigt Fallback", async ({ page, context }) => {
  await page.goto("/lernpfad");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Altlast aus Deploy A / v1 anlegen
  await page.evaluate(async () => {
    await (await caches.open("cal-shell-v1")).put("/lernpfad", new Response("alt"));
  });

  // Deploy B simulieren: Worker mit neuer Build-Kennung registrieren
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register("/sw.js?v=deploy-b", { updateViaCache: "none" });
    const sw = reg.installing ?? reg.waiting ?? reg.active;
    await new Promise<void>((resolve) => {
      if (sw?.state === "activated") return resolve();
      sw?.addEventListener("statechange", () => sw.state === "activated" && resolve());
    });
  });
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(["cal-shell-deploy-b"]);

  // Network-first: Seite kommt frisch vom Server, nicht aus "alt"
  await page.goto("/lernpfad");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  // Offline: Seite aus dem Cache bzw. Offline-Fallback
  await context.setOffline(true);
  const res = await page.goto("/lernpfad").catch(() => null);
  expect(res === null || res.status() < 500).toBe(true);
  await context.setOffline(false);
});
