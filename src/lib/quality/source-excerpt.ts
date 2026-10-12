/**
 * SIN-456: Quellenauszug für den Richter. Der Richter sah bisher nur die URL der Quelle und konnte falsche Zahlen
 * („Teil 1 zählt 40 %“ statt 25 %) nicht erkennen. Vor dem Bewerten wird der Text der zitierten HTML-Quelle geholt,
 * die passenden Absätze ausgewählt und als `sourceExcerpt` mitgegeben.
 * Nur im Lauf, nichts wird gespeichert oder ins Repo geschrieben. PDF-Quellen (Rahmenlehrpläne) bleiben vorerst ohne Auszug.
 * Abschalten: Umgebungsvariable `JUDGE_QUELLENAUSZUG=0`.
 */

export const EXCERPT_MAX_CHARS = 2500;
const FETCH_TIMEOUT_MS = 10_000;

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", sect: "§", auml: "ä", ouml: "ö", uuml: "ü",
  Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", bdquo: "„", ldquo: "“", rdquo: "”", lsquo: "‚", rsquo: "’",
  ndash: "–", mdash: "—", euro: "€", shy: "", middot: "·", deg: "°", hellip: "…", laquo: "«", raquo: "»",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m);
}

/** HTML → lesbarer Text mit Absätzen (Leerzeile zwischen Blöcken). */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style|noscript|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d|dd|dt|table|section|article)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text)
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Zeichensatz aus Header oder `<meta charset>`; ohne Angabe UTF-8. */
export function detectCharset(contentType: string | null, head: string): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType ?? "")?.[1];
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  return (fromHeader || fromMeta || "utf-8").toLowerCase();
}

export function decodeBody(buf: ArrayBuffer, contentType: string | null): string {
  const head = new TextDecoder("latin1").decode(buf.slice(0, 2048));
  const charset = detectCharset(contentType, head);
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

const STOP = new Set(["eine", "einer", "einem", "einen", "oder", "und", "der", "die", "das", "dem", "den", "des", "mit", "von", "für", "auf", "aus", "bei", "wie", "was", "wann", "welche", "welcher", "welches", "nach", "sind", "wird", "werden", "kann", "soll", "dass", "nicht", "auch", "über", "unter", "zum", "zur", "ist", "hat", "the"]);

/** Suchwörter aus Frage, Antwort und Erklärung: Wörter ab 4 Zeichen und alle Zahlen (Prozente, Paragrafen, Fristen). */
export function queryTerms(query: string): string[] {
  const words = query.toLowerCase().match(/[a-zäöüß]{4,}|\d+(?:[.,]\d+)?/g) ?? [];
  return [...new Set(words.filter((w) => !STOP.has(w)))];
}

/** Absätze wählen, die am besten zur Frage passen, in Originalreihenfolge, bis `max` Zeichen. Kurze Texte ganz. */
export function excerptFor(text: string, query: string, max = EXCERPT_MAX_CHARS): string {
  if (text.length <= max) return text;
  const paras = text
    .split(/\n{2,}/)
    .flatMap((p) => (p.length > 900 ? p.split("\n") : [p]))
    .map((p) => p.trim())
    .filter((p) => p.length > 20);
  const terms = queryTerms(query);
  const scored = paras.map((p, i) => {
    const low = p.toLowerCase();
    const score = terms.reduce((s, t) => s + (low.includes(t) ? (/\d/.test(t) ? 2 : 1) : 0), 0);
    return { i, p, score };
  });
  const picked = new Set<number>();
  let used = 0;
  for (const s of [...scored].filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i)) {
    if (used + s.p.length > max) continue;
    picked.add(s.i);
    used += s.p.length + 2;
  }
  return scored.filter((s) => picked.has(s.i)).map((s) => s.p).join("\n\n");
}

export type SourceTextLoader = (url: string) => Promise<string | null>;

/** Lädt den Text einer Quelle einmal je Lauf (Cache je URL). PDF oder Fehler → null, der Richter bewertet dann wie bisher. */
export function createSourceTextLoader(fetchImpl: typeof fetch = fetch): SourceTextLoader {
  const cache = new Map<string, Promise<string | null>>();
  return (url: string) => {
    if (!cache.has(url)) {
      cache.set(
        url,
        (async () => {
          if (!/^https:\/\//i.test(url) || /\.pdf($|[?#])/i.test(url)) return null;
          try {
            const res = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
            if (!res.ok) return null;
            const type = res.headers.get("content-type");
            if (type && !/html|text\/plain/i.test(type)) return null;
            const body = decodeBody(await res.arrayBuffer(), type);
            return /<[a-z!]/i.test(body) ? htmlToText(body) : body.trim();
          } catch {
            return null;
          }
        })(),
      );
    }
    return cache.get(url)!;
  };
}

let defaultLoader: SourceTextLoader | null = null;

type WithSource = { sourceUrl: string; prompt: string; correct: string | string[]; explanation: string; sourceExcerpt?: string };

/** Hängt jedem Element den passenden Auszug an. Ohne Text bleibt das Element unverändert. */
export async function withSourceExcerpts<T extends WithSource>(
  items: T[],
  load?: SourceTextLoader,
  env: Record<string, string | undefined> = process.env,
): Promise<T[]> {
  if (env.JUDGE_QUELLENAUSZUG === "0") return items;
  const loader = load ?? (defaultLoader ??= createSourceTextLoader());
  return Promise.all(
    items.map(async (item) => {
      if (item.sourceExcerpt) return item;
      const text = await loader(item.sourceUrl);
      if (!text) return item;
      const query = [item.prompt, Array.isArray(item.correct) ? item.correct.join(" ") : item.correct, item.explanation].join(" ");
      const sourceExcerpt = excerptFor(text, query);
      return sourceExcerpt ? { ...item, sourceExcerpt } : item;
    }),
  );
}
