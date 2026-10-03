import type { Curriculum, CurriculumSource } from "./curriculum";

/**
 * Pure logic for the weekly source monitor (AP-16): which official documents the
 * curriculum maps depend on, how to read their "Stand" label, and how to diff a
 * new observation against docs/content/sources.lock.json. Network access lives in
 * scripts/content-check-sources.mjs so this file stays unit-testable.
 */

export type SourceLockEntry = {
  url: string;
  kind: CurriculumSource["kind"] | string;
  title: string;
  /** Map ids (e.g. "maf-metall") that cite this URL. */
  mapIds: string[];
  /** Source ids used inside those maps (usually one, e.g. "ao-anlage"). */
  sourceIds: string[];
  /** Human-readable version marker: gesetze-im-internet "Stand" line or KMK Beschlussdatum. */
  standLabel: string | null;
  /** For kmk.org PDFs: the Beruf name as printed in the KMK Downloadbereich list. */
  kmkName?: string;
  etag?: string | null;
  lastModified?: string | null;
  contentHash?: string | null;
  httpStatus?: number | null;
  checkedAt: string | null;
};

export type WatchFeed = { id: string; url: string; type: "html" | "rss" };

export type SourceLock = {
  version: 1;
  generatedAt: string;
  /** How the seed values were obtained (e.g. manual read on a given date). */
  note?: string;
  /** Beruf names to scan in feeds and overview pages (case-insensitive substring). */
  watchKeywords: string[];
  feeds: WatchFeed[];
  entries: Record<string, SourceLockEntry>;
};

export type Observation = Partial<
  Pick<SourceLockEntry, "standLabel" | "etag" | "lastModified" | "contentHash" | "httpStatus">
> & { error?: string };

export type DiffResult = {
  changed: Array<{ url: string; field: "standLabel" | "contentHash"; before: string | null; after: string | null; mapIds: string[] }>;
  weak: Array<{ url: string; field: "etag" | "lastModified"; before: string | null; after: string | null; mapIds: string[] }>;
  unreachable: Array<{ url: string; httpStatus: number | null; error?: string; mapIds: string[] }>;
  unchanged: string[];
  unknown: string[];
};

/** Collect every distinct source URL across maps with the maps and ids that cite it. */
export function collectSources(curricula: Curriculum[]): Record<string, Omit<SourceLockEntry, "standLabel" | "checkedAt">> {
  const out: Record<string, Omit<SourceLockEntry, "standLabel" | "checkedAt">> = {};
  for (const c of curricula) {
    for (const s of c.sources) {
      const e = (out[s.url] ??= { url: s.url, kind: s.kind, title: s.title, mapIds: [], sourceIds: [] });
      if (!e.mapIds.includes(c.id)) e.mapIds.push(c.id);
      if (!e.sourceIds.includes(s.id)) e.sourceIds.push(s.id);
    }
  }
  return out;
}

/**
 * gesetze-im-internet.de prints the version in a header table:
 * "Ausfertigungsdatum: 27.04.2004" and "Stand: Zuletzt geändert durch Art. 2 V v. 14.6.2023 I Nr. 151".
 * Works on raw HTML (tags are stripped first) and on plain text.
 */
export function extractGiiStand(htmlOrText: string): string | null {
  const text = htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  const parts: string[] = [];
  const ausf = text.match(/Ausfertigungsdatum:\s*(\d{2}\.\d{2}\.\d{4})/);
  if (ausf) parts.push(`Ausfertigungsdatum: ${ausf[1]}`);
  // Prefer the full BGBl citation ("… v. 14.6.2023 I Nr. 151", "… I S. 647", "… I 1234"),
  // fall back to the year so an unknown citation style still yields a marker.
  const stand =
    text.match(/Stand:\s*((?:Zuletzt|Neugefasst|Geändert)[^|]*?I\s*(?:Nr\.\s*\d+|S\.\s*\d+|\d+))/i) ??
    text.match(/Stand:\s*((?:Zuletzt|Neugefasst|Geändert)[^|]*?\d{4})/i);
  if (stand) parts.push(`Stand: ${stand[1].trim()}`);
  return parts.length ? parts.join("; ") : null;
}

/**
 * The KMK Downloadbereich lists "<Beruf> <dd.mm.yyyy>", sometimes with a line break
 * before the date and an optional "(gültig ab 01.08.2026)" marker.
 */
export function extractKmkDate(pageText: string, kmkName: string): string | null {
  const text = pageText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const idx = text.indexOf(kmkName);
  if (idx < 0) return null;
  const window = text.slice(idx + kmkName.length, idx + kmkName.length + 160);
  const m = window.match(/^\s*(\((gültig ab [^)]+)\))?\s*(\d{2}\.\d{2}\.\d{4})/);
  if (!m) return null;
  return m[2] ? `${m[3]} (${m[2]})` : m[3];
}

/** Compare a lock against fresh observations keyed by URL. */
export function diffLock(lock: SourceLock, observed: Record<string, Observation>): DiffResult {
  const res: DiffResult = { changed: [], weak: [], unreachable: [], unchanged: [], unknown: [] };
  for (const [url, obs] of Object.entries(observed)) {
    const prev = lock.entries[url];
    if (!prev) {
      res.unknown.push(url);
      continue;
    }
    if (obs.error || (obs.httpStatus != null && obs.httpStatus >= 400)) {
      res.unreachable.push({ url, httpStatus: obs.httpStatus ?? null, error: obs.error, mapIds: prev.mapIds });
      continue;
    }
    let flagged = false;
    if (prev.standLabel && obs.standLabel && prev.standLabel !== obs.standLabel) {
      res.changed.push({ url, field: "standLabel", before: prev.standLabel, after: obs.standLabel, mapIds: prev.mapIds });
      flagged = true;
    }
    if (prev.contentHash && obs.contentHash && prev.contentHash !== obs.contentHash) {
      res.changed.push({ url, field: "contentHash", before: prev.contentHash, after: obs.contentHash, mapIds: prev.mapIds });
      flagged = true;
    }
    if (!flagged) {
      if (prev.etag && obs.etag && prev.etag !== obs.etag) {
        res.weak.push({ url, field: "etag", before: prev.etag, after: obs.etag, mapIds: prev.mapIds });
      } else if (prev.lastModified && obs.lastModified && prev.lastModified !== obs.lastModified) {
        res.weak.push({ url, field: "lastModified", before: prev.lastModified, after: obs.lastModified, mapIds: prev.mapIds });
      } else {
        res.unchanged.push(url);
      }
    }
  }
  return res;
}

/** Modules and blocks of a map that cite a given source id; these need re-generation after a change. */
export function affectedModules(c: Curriculum, sourceId: string): Array<{ moduleId: string; blockIds: string[] }> {
  const out: Array<{ moduleId: string; blockIds: string[] }> = [];
  for (const m of c.modules) {
    const blockIds = m.blocks.filter((b) => b.sourceIds.includes(sourceId)).map((b) => b.id);
    const viaRlp = m.rlpLernfeld?.sourceId === sourceId;
    if (blockIds.length || viaRlp) out.push({ moduleId: m.id, blockIds: blockIds.length ? blockIds : m.blocks.map((b) => b.id) });
  }
  return out;
}

/** Feed or overview-page items whose title mentions one of the watched Beruf names. */
export function filterFeedItems<T extends { title: string }>(items: T[], keywords: string[]): Array<T & { keyword: string }> {
  const kws = keywords.map((k) => k.toLowerCase());
  const hits: Array<T & { keyword: string }> = [];
  for (const it of items) {
    const t = it.title.toLowerCase();
    const kw = kws.find((k) => t.includes(k));
    if (kw) hits.push({ ...it, keyword: kw });
  }
  return hits;
}

/** Split the Aktualitätendienst page (or any list page) into candidate titles. */
export function titlesFromHtml(html: string): string[] {
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|li|tr|h\d|div)>/gi, "\n").replace(/<[^>]+>/g, " ");
  return text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 20);
}

/** Merge observations into a lock, keeping unknown fields from the previous entry. */
export function applyObservations(lock: SourceLock, observed: Record<string, Observation>, checkedAt: string): SourceLock {
  const entries = { ...lock.entries };
  for (const [url, obs] of Object.entries(observed)) {
    const prev = entries[url];
    if (!prev) continue;
    entries[url] = {
      ...prev,
      standLabel: obs.standLabel ?? prev.standLabel,
      etag: obs.etag ?? prev.etag ?? null,
      lastModified: obs.lastModified ?? prev.lastModified ?? null,
      contentHash: obs.contentHash ?? prev.contentHash ?? null,
      httpStatus: obs.httpStatus ?? prev.httpStatus ?? null,
      checkedAt,
    };
  }
  return { ...lock, generatedAt: checkedAt, entries };
}
