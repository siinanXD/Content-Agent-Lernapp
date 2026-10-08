import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkCoverage, deriveStand, renderReport } from "../../../scripts/autonomy/figma-abdeckung.mjs";

const map = JSON.parse(readFileSync("docs/quality/figma-abdeckung.json", "utf8"));
const figmaMd = readFileSync("docs/design/FIGMA.md", "utf8");

test("Figma-Abdeckung: jeder Frame aus FIGMA.md ist zugeordnet, Stand passt zu den Dateien", () => {
  assert.deepEqual(checkCoverage(map, figmaMd, null), []);
});

test("Figma-Abdeckung: Bericht ist aktuell (npm run figma:abdeckung erzeugt ihn)", () => {
  const md = readFileSync("docs/quality/figma-abdeckung.md", "utf8");
  assert.equal(md, renderReport(map, "nicht verfügbar (FIGMA_ACCESS_TOKEN fehlt)"));
});

test("Figma-Abdeckung: gemappter Frame, den Figma nicht kennt, wird gemeldet", () => {
  const live = map.frames.map((f: { frame: string }) => f.frame).filter((n: string) => n !== "01 Start");
  assert.ok(checkCoverage(map, figmaMd, live).some((x: string) => x.includes("existiert aber nicht")));
});

test("Figma-Abdeckung: fehlende Datei ergibt „fehlt“, unzugeordnete Frames werden gemeldet", () => {
  assert.equal(deriveStand(["a.tsx"], () => false), "fehlt");
  assert.equal(deriveStand([], () => true), "fehlt");
  assert.ok(checkCoverage(map, figmaMd, ["99 Neu"]).some((x: string) => x.includes("99 Neu")));
  const q = checkCoverage({ frames: [{ frame: "01 Start", code: ["x"], stand: "umgesetzt" }] }, figmaMd, null, () => false);
  assert.ok(q.some((x: string) => x.includes("nicht zugeordnet")));
  assert.ok(q.some((x: string) => x.includes("Dateien ergeben")));
});
