import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { loadAllCurricula } from "./curriculum";
import {
  affectedModules,
  applyObservations,
  collectSources,
  diffLock,
  extractGiiStand,
  extractKmkDate,
  filterFeedItems,
  titlesFromHtml,
  type SourceLock,
} from "./source-watch";

const GII_HTML = `<table><tr><td>Ausfertigungsdatum:</td><td>27.04.2004</td></tr></table>
<p>Vollzitat: "Verordnung ... vom 27. April 2004 (BGBl. I S. 647), die zuletzt durch Artikel 2 der Verordnung vom 14. Juni 2023 (BGBl. 2023 I Nr. 151) geändert worden ist"</p>
<table><tr><td>Stand:</td><td>Zuletzt geändert durch Art. 2 V v. 14.6.2023 I Nr. 151</td></tr></table>`;

const KMK_PAGE = `- Maschinen- und Anlagenführer und Maschinen- und Anlageführerin \n\n 31.03.2023 \n- Industriekaufmann und Industriekauffrau 15.12.2023 \n- Bautechnischer Konstrukteur und Bautechnische Konstrukteurin (gültig ab 01.08.2026) \n\n 28.03.2025 \n- Industriemechaniker/Industriemechanikerin 23.02.2018`;

describe("AP-16 source watch (pure logic)", () => {
  it("reads the gesetze-im-internet Stand line from HTML", () => {
    assert.equal(
      extractGiiStand(GII_HTML),
      "Ausfertigungsdatum: 27.04.2004; Stand: Zuletzt geändert durch Art. 2 V v. 14.6.2023 I Nr. 151",
    );
    assert.equal(extractGiiStand("<p>Ausfertigungsdatum: 12.03.2024</p>"), "Ausfertigungsdatum: 12.03.2024");
    assert.equal(extractGiiStand("<p>nothing here</p>"), null);
  });

  it("reads the KMK Beschlussdatum next to a Beruf name, including 'gültig ab' markers", () => {
    assert.equal(extractKmkDate(KMK_PAGE, "Maschinen- und Anlagenführer und Maschinen- und Anlageführerin"), "31.03.2023");
    assert.equal(extractKmkDate(KMK_PAGE, "Industriekaufmann und Industriekauffrau"), "15.12.2023");
    assert.equal(extractKmkDate(KMK_PAGE, "Industriemechaniker/Industriemechanikerin"), "23.02.2018");
    assert.equal(
      extractKmkDate(KMK_PAGE, "Bautechnischer Konstrukteur und Bautechnische Konstrukteurin"),
      "28.03.2025 (gültig ab 01.08.2026)",
    );
    assert.equal(extractKmkDate(KMK_PAGE, "Nicht vorhanden"), null);
  });

  it("collects every source URL across all maps with the maps that cite it", () => {
    const all = loadAllCurricula();
    const sources = collectSources(all);
    const anlage = sources["https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html"];
    assert.ok(anlage, "MAF Anlage must be collected");
    assert.equal(anlage.mapIds.length, 7, "all seven MAF maps cite the Anlage");
    const ind = sources["https://www.gesetze-im-internet.de/indkflausbv/BJNR05E0A0024.html"];
    assert.deepEqual(ind?.mapIds, ["indkfl"]);
  });

  it("diffs observations: standLabel and hash are strong, etag/last-modified weak, errors unreachable", () => {
    const lock: SourceLock = {
      version: 1,
      generatedAt: "2026-10-03",
      watchKeywords: [],
      feeds: [],
      entries: {
        a: { url: "a", kind: "ausbildungsordnung", title: "A", mapIds: ["m1"], sourceIds: ["ao"], standLabel: "Stand: alt", etag: "e1", checkedAt: null },
        b: { url: "b", kind: "rahmenlehrplan", title: "B", mapIds: ["m1"], sourceIds: ["rlp"], standLabel: "23.02.2018", etag: "e1", lastModified: "x", checkedAt: null },
        c: { url: "c", kind: "berufsinformation", title: "C", mapIds: ["m2"], sourceIds: ["bibb"], standLabel: null, contentHash: "h1", checkedAt: null },
        d: { url: "d", kind: "pruefung", title: "D", mapIds: ["m2"], sourceIds: ["p9"], standLabel: "s", checkedAt: null },
      },
    };
    const res = diffLock(lock, {
      a: { standLabel: "Stand: neu", etag: "e2" },
      b: { standLabel: "23.02.2018", etag: "e2" },
      c: { contentHash: "h1" },
      d: { httpStatus: 404 },
      e: { standLabel: "x" },
    });
    assert.deepEqual(res.changed.map((x) => [x.url, x.field]), [["a", "standLabel"]]);
    assert.deepEqual(res.weak.map((x) => [x.url, x.field]), [["b", "etag"]]);
    assert.deepEqual(res.unreachable.map((x) => x.url), ["d"]);
    assert.deepEqual(res.unchanged, ["c"]);
    assert.deepEqual(res.unknown, ["e"]);
    const next = applyObservations(lock, { a: { standLabel: "Stand: neu", etag: "e2" } }, "2026-10-10");
    assert.equal(next.entries.a.standLabel, "Stand: neu");
    assert.equal(next.entries.a.checkedAt, "2026-10-10");
    assert.equal(next.entries.b.standLabel, "23.02.2018");
  });

  it("maps a changed source to the modules and blocks that must be regenerated", () => {
    const metall = loadAllCurricula().find((c) => c.id === "maf-metall")!;
    const hit = affectedModules(metall, "rlp-im");
    assert.ok(hit.some((h) => h.moduleId === "LF1" && h.blockIds.length > 0));
    assert.ok(!hit.some((h) => h.moduleId === "WISO"), "WiSo does not cite the Industriemechaniker RLP");
    const p9 = affectedModules(metall, "ao-p9");
    assert.ok(p9.some((h) => h.moduleId === "APPT"));
  });

  it("filters feed titles by watched Beruf names", () => {
    const titles = titlesFromHtml(
      `<p>BGBl. 2026 I Nr. 233 Verordnung über die Berufsausbildung zum Technischen Modellbauer und zur Technischen Modellbauerin vom 04. August 2026</p>
       <p>BGBl. 2026 I Nr. 999 Verordnung zur Änderung der Verordnung über die Berufsausbildung zum Maschinen- und Anlagenführer vom 01. Oktober 2026</p>`,
    );
    const hits = filterFeedItems(titles.map((t) => ({ title: t })), ["Maschinen- und Anlagenführer", "Industriekaufmann"]);
    assert.equal(hits.length, 1);
    assert.match(hits[0]!.title, /Maschinen- und Anlagenführer/);
  });

  it("ships a seeded lock that covers every source of every map", () => {
    const lock = JSON.parse(readFileSync(path.join(process.cwd(), "docs", "content", "sources.lock.json"), "utf8")) as SourceLock;
    const sources = collectSources(loadAllCurricula());
    for (const url of Object.keys(sources)) assert.ok(lock.entries[url], `lock missing ${url}`);
    assert.ok(lock.watchKeywords.length >= 8);
    assert.ok(lock.feeds.length >= 2);
    for (const e of Object.values(lock.entries)) {
      if (e.url.includes("/BeruflicheBildung/rlp/")) assert.ok(e.kmkName, `${e.url} needs kmkName for the Downloadbereich lookup`);
      assert.ok(e.standLabel || e.kind === "berufsinformation", `${e.url} needs a Stand label`);
    }
  });
});
