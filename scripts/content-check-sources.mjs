#!/usr/bin/env node
/**
 * AP-16 source monitor: compare the official documents behind docs/content/*.json
 * with docs/content/sources.lock.json and report changes.
 *
 *   node --import tsx scripts/content-check-sources.mjs            # live check, exit 2 on change
 *   node --import tsx scripts/content-check-sources.mjs --update   # live check and rewrite the lock
 *   node --import tsx scripts/content-check-sources.mjs --offline  # coverage report only, no network
 *
 * Runs on Railway (Hermes weekly job) or a CI cron. The Cloud-Agent sandbox blocks
 * gesetze-im-internet.de and kmk.org, so use --offline there.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const { loadAllCurricula } = await import("../src/lib/content/curriculum.ts");
const watch = await import("../src/lib/content/source-watch.ts");

const LOCK_PATH = path.join(process.cwd(), "docs", "content", "sources.lock.json");
const KMK_LIST = "https://www.kmk.org/service/servicebereich-berufliche-schulen/downloadbereich-rahmenlehrplaene.html";
const args = new Set(process.argv.slice(2));
const offline = args.has("--offline");
const update = args.has("--update");
const now = new Date().toISOString();

const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
const curricula = loadAllCurricula();
const sources = watch.collectSources(curricula);
const missing = Object.keys(sources).filter((u) => !lock.entries[u]);

const hash = (s) => createHash("sha256").update(s.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);

async function get(url, method = "GET") {
  const res = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(25_000), headers: { "user-agent": "content-agent-lernapp source-monitor" } });
  return { res, text: method === "GET" ? await res.text() : "" };
}

const observed = {};
const feedHits = [];
if (!offline) {
  let kmkPage = null;
  for (const [url, entry] of Object.entries(lock.entries)) {
    try {
      const isPdf = url.toLowerCase().endsWith(".pdf");
      if (url.includes("gesetze-im-internet.de")) {
        const { res, text } = await get(url);
        observed[url] = { httpStatus: res.status, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified"), standLabel: watch.extractGiiStand(text), contentHash: hash(text.replace(/<[^>]+>/g, " ")) };
      } else if (url.includes("/BeruflicheBildung/rlp/") && entry.kmkName) {
        if (kmkPage == null) kmkPage = (await get(KMK_LIST)).text;
        const { res } = await get(url, "HEAD");
        observed[url] = { httpStatus: res.status, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified"), standLabel: watch.extractKmkDate(kmkPage, entry.kmkName) };
      } else if (isPdf) {
        const { res } = await get(url, "HEAD");
        observed[url] = { httpStatus: res.status, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") };
      } else {
        const { res, text } = await get(url);
        observed[url] = { httpStatus: res.status, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified"), contentHash: hash(text.replace(/<[^>]+>/g, " ")) };
      }
    } catch (err) {
      observed[url] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  for (const feed of lock.feeds) {
    try {
      const { text } = await get(feed.url);
      const titles = feed.type === "rss"
        ? [...text.matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim())
        : watch.titlesFromHtml(text);
      for (const hit of watch.filterFeedItems(titles.map((t) => ({ title: t })), lock.watchKeywords)) feedHits.push({ feed: feed.id, ...hit });
    } catch (err) {
      feedHits.push({ feed: feed.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
}

const diff = offline ? null : watch.diffLock(lock, observed);
const affected = [];
if (diff) {
  for (const ch of diff.changed) {
    for (const c of curricula.filter((x) => ch.mapIds.includes(x.id))) {
      for (const sid of lock.entries[ch.url].sourceIds) affected.push({ mapId: c.id, sourceId: sid, modules: watch.affectedModules(c, sid) });
    }
  }
}

const report = {
  mode: offline ? "offline" : "live",
  checkedAt: now,
  maps: curricula.map((c) => c.id),
  sourcesTracked: Object.keys(lock.entries).length,
  sourcesMissingInLock: missing,
  summary: {
    changed: diff?.changed.map((c) => c.url) ?? [],
    unreachable: diff?.unreachable.map((u) => u.url) ?? [],
    ok: diff?.unchanged ?? [],
    weak: diff?.weak.map((w) => w.url) ?? [],
  },
  diff,
  feedHits,
  affected,
};
console.log(JSON.stringify(report, null, 2));

if (update && diff) {
  writeFileSync(LOCK_PATH, JSON.stringify(watch.applyObservations(lock, observed, now), null, 2) + "\n");
  console.error(`[source-monitor] lock updated: ${LOCK_PATH}`);
}

const changed = (diff?.changed.length ?? 0) + feedHits.filter((h) => !h.error).length;
if (missing.length) {
  console.error(`[source-monitor] ${missing.length} source(s) missing in lock — run with --update after adding them`);
  process.exit(3);
}
process.exit(changed > 0 ? 2 : 0);
