import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mafSeedSources, seedCoversAcceptance } from "./maf-seed-sources";

describe("mafSeedSources", () => {
  it("covers AO, RLP, and Prüfung kinds for AP-03 acceptance", () => {
    const sources = mafSeedSources("2026-10-02T00:00:00.000Z");
    assert.equal(seedCoversAcceptance(sources), true);
    assert.ok(sources.some((s) => s.kind === "ausbildungsordnung"));
    assert.ok(sources.some((s) => s.kind === "rahmenlehrplan"));
    assert.ok(sources.some((s) => s.kind === "pruefung"));
  });

  it("only stores https links and never claims IHK exam copies", () => {
    for (const s of mafSeedSources()) {
      assert.match(s.url, /^https:\/\//);
      assert.doesNotMatch(s.title.toLowerCase(), /prüfungsaufgabe|exam copy/);
      if (s.note) {
        assert.doesNotMatch(s.note.toLowerCase(), /ihk-aufgabe kopieren/);
      }
    }
  });

  it("includes KMK RLP and gesetze-im-internet AO", () => {
    const sources = mafSeedSources();
    const hosts = sources.map((s) => new URL(s.url).hostname);
    assert.ok(hosts.includes("www.kmk.org"));
    assert.ok(hosts.includes("www.gesetze-im-internet.de"));
  });
});
