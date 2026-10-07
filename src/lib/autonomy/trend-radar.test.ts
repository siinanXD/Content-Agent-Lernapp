import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildRadarIssues, isoWeek, latestReport, radarTitle, reportPath } from "../../../scripts/autonomy/trend-radar.mjs";

test("isoWeek: Kalenderwoche und Jahreswechsel", () => {
  assert.equal(isoWeek(new Date("2026-10-07T10:00:00Z")), "2026-KW41");
  assert.equal(isoWeek(new Date("2027-01-01T10:00:00Z")), "2026-KW53");
  assert.equal(reportPath(new Date("2026-10-04T04:30:00Z")), "docs/research/trend-radar-2026-KW40.md");
});

test("latestReport nimmt die jüngste Woche", () => {
  const files = ["docs/research/maf-sources.json", "docs/research/trend-radar-2026-KW40.md", "docs/research/trend-radar-2026-KW41.md"];
  assert.equal(latestReport(files), "docs/research/trend-radar-2026-KW41.md");
  assert.equal(latestReport(["a.md"]), null);
});

test("buildRadarIssues: genau ein Issue, Checkliste, höchstens 5 Funde, https Pflicht, Label research", () => {
  const top = Array.from({ length: 7 }, (_, n) => ({ titel: `Fund ${n}`, was: "x", warum: "y", link: n === 1 ? "http://x.de" : `https://example.com/${n}` }));
  const items = buildRadarIssues({ top, sinan: [{ titel: "Datei kopieren", was: "x", link: "https://figma.com/community/file/1" }] }, "2026-KW41");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Trend-Radar KW 2026-41");
  assert.equal(radarTitle("2026-KW41"), items[0].title);
  assert.deepEqual(items[0].labels, ["research"]);
  const boxes = items[0].description.split("\n").filter((l) => l.startsWith("- [ ] "));
  assert.equal(boxes.length, 6); // 5 Funde (Fund 1 ohne https fehlt, Fund 5 rückt nach) + 1 Klick-Aufgabe
  assert.ok(!items[0].description.includes("http://"));
});

test("buildRadarIssues: nichts bei vorhandenem Wochen-Issue oder ohne Funde", () => {
  const radar = { top: [{ titel: "A", was: "x", warum: "y", link: "https://example.com" }] };
  assert.deepEqual(buildRadarIssues(radar, "2026-KW41", new Set(["trend-radar kw 2026-41"])), []);
  assert.deepEqual(buildRadarIssues({ top: [] }, "2026-KW41"), []);
});

test("Workflow: Linear-Schritt ist bei dry_run per if: gesperrt, Anlegen nur ohne dry_run", () => {
  const yml = readFileSync(new URL("../../../.github/workflows/trend-radar.yml", import.meta.url), "utf8");
  const steps = yml.split(/\n {6}- /).filter((s) => s.includes("--create"));
  const echt = steps.filter((s) => !s.includes("--dry-run"));
  assert.equal(echt.length, 1, "genau ein Schritt legt wirklich an");
  assert.match(echt[0], /\n\s+if:.*inputs\.dry_run != true/);
  for (const s of steps.filter((x) => x.includes("--dry-run"))) assert.match(s, /\n\s+if:.*inputs\.dry_run == true/);
});
