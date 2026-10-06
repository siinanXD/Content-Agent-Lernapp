import { test, expect } from "@playwright/test";
import { routes } from "./routes";

// SIN-257: Tastaturdurchlauf je Screen. Tab erreicht die bedienbaren
// Elemente, der Fokus ist sichtbar, Ziele sind mindestens 44 px hoch.

const MAX_TABS = 60;
const MIN_TARGET = 44;

for (const route of routes) {
  test(`Tastatur: Fokus und Zielgröße auf ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const seen = new Set<string>();
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const outlined = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
        const shadowed = s.boxShadow !== "none";
        const inline = s.display === "inline" && !el.closest("nav, [role=tablist]");
        return {
          id: `${el.tagName}|${el.textContent?.trim().slice(0, 40)}|${el.getAttribute("href") ?? ""}`,
          visibleFocus: outlined || shadowed,
          height: r.height,
          width: r.width,
          inline,
        };
      });
      if (!info) break;
      if (seen.has(info.id)) break; // Fokus ist einmal rundherum gelaufen
      seen.add(info.id);
      expect(info.visibleFocus, `Kein sichtbarer Fokus: ${info.id}`).toBe(true);
      // Links im Fließtext sind nach WCAG 2.5.8 vom Zielmaß ausgenommen.
      if (!info.inline) {
        expect(
          info.height >= MIN_TARGET,
          `Ziel kleiner als ${MIN_TARGET} px (${Math.round(info.width)}×${Math.round(info.height)}): ${info.id}`,
        ).toBe(true);
      }
    }
  });
}
