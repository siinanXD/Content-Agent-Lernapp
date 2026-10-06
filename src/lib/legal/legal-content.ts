import { readFileSync } from "node:fs";
import path from "node:path";

/** Rechtstexte aus `content/legal/<seite>.md` (SIN-301). Format: content/legal/README.md. */
export const LEGAL_SLUGS = ["impressum", "datenschutz", "ki-hinweis"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export type Inline =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "placeholder"; text: string };

export type Block =
  | { type: "heading"; id: string; text: string }
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "cards"; items: { name: string; purpose: string; region: Inline[] }[] };

export type LegalDocument = {
  title: string;
  /** Hinweistext für „Entwurf“; nur sichtbar, solange `draft`. */
  draftNote: string;
  toc: boolean;
  blocks: Block[];
  /** Platzhalter `[ ]` im Text. */
  placeholders: string[];
  draft: boolean;
};

const INLINE_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\[([^\]]+)\]/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    out.push(
      m[2] !== undefined
        ? { type: "link", text: m[1], href: m[2] }
        : { type: "placeholder", text: `[${m[3]}]` },
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseLegal(source: string): LegalDocument {
  const text = source.replace(/\r\n/g, "\n");
  const head = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta: Record<string, string> = {};
  for (const line of (head?.[1] ?? "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!meta.titel) throw new Error("Rechtstext ohne `titel` im Kopf");

  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    const items = para.filter((l) => l.startsWith("- "));
    if (items.length === para.length) {
      blocks.push({
        type: "cards",
        items: items.map((l) => {
          const [name = "", purpose = "", region = ""] = l.slice(2).split("|").map((s) => s.trim());
          return { name, purpose, region: parseInline(region) };
        }),
      });
    } else {
      blocks.push({ type: "paragraph", lines: para.map(parseInline) });
    }
    para = [];
  };
  for (const raw of text.slice(head?.[0].length ?? 0).split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flush();
      const title = line.slice(3).trim();
      blocks.push({ type: "heading", id: slugify(title), text: title });
    } else if (line === "") flush();
    else para.push(line);
  }
  flush();

  const body = text.slice(head?.[0].length ?? 0);
  const placeholders = [...body.matchAll(INLINE_RE)].filter((m) => m[2] === undefined).map((m) => `[${m[3]}]`);
  return {
    title: meta.titel,
    draftNote: meta.entwurf ?? "",
    toc: meta.inhalt === "ja",
    blocks,
    placeholders,
    draft: placeholders.length > 0,
  };
}

export function loadLegalDocument(slug: LegalSlug): LegalDocument {
  return parseLegal(readFileSync(path.join(process.cwd(), "content", "legal", `${slug}.md`), "utf8"));
}
