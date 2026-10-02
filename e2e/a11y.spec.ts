import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/lernpfad", "/einheit/unit-03", "/ergebnis", "/profil"];

for (const path of routes) {
  test(`axe critical/serious: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );
    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toEqual([]);
  });
}
