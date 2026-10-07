import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRadarIssues, isoWeek, latestReport, reportPath } from "../../../scripts/autonomy/trend-radar.mjs";

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

test("buildRadarIssues: höchstens 5, Label research, kein claude, https Pflicht, ohne Duplikate", () => {
  const top = Array.from({ length: 7 }, (_, n) => ({ titel: `Fund ${n}`, was: "x", warum: "y", link: n === 1 ? "http://x.de" : `https://example.com/${n}` }));
  const items = buildRadarIssues({ top, sinan: [{ titel: "Datei kopieren", was: "x", link: "https://figma.com/community/file/1" }] }, "2026-KW41", new Set(["research: fund 0"]));
  const research = items.filter((i) => i.labels.includes("research"));
  assert.equal(research.length, 3); // 5 vorgesehen, Fund 1 ohne https, Fund 0 schon vorhanden
  assert.ok(items.every((i) => !i.labels.includes("claude")));
  assert.deepEqual(items.at(-1)?.labels, ["sinan"]);
});
