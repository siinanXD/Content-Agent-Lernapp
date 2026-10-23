#!/usr/bin/env node
/**
 * PR-Crawler (SIN-1008): das Planungsbild (Soll) des verknüpften Linear-Issues, damit der PR-Kommentar es neben dem Vorschaubild (Ist) zeigt.
 * Der Leitstand-Planer hängt bei Frontend-Issues ein Figma-PNG an und nennt die Frame-ID (SIN-943).
 *
 *   node scripts/pr-crawler/soll.mjs --titel "feat(x): … (SIN-123)" [--body "Part of SIN-123"] → JSON {bild, frame} oder {} auf stdout
 *
 * Braucht LINEAR_API_KEY. Ohne Schlüssel, Issue oder Bild bleibt die Ausgabe `{}` (kein Platzhalter im Kommentar).
 */
import { pathToFileURL } from "node:url";
import { linear } from "../autonomy/linear.mjs";

const BILD = /\.(png|jpe?g|webp)(\?|$)/i;
const LINEAR_UPLOAD = /^https:\/\/uploads\.linear\.app\//;

/** Issue-Kennung aus Titel, sonst Body („Part of SIN-123“). */
export const issueKennung = (titel = "", body = "") => /\bSIN-\d+\b/.exec(titel)?.[0] ?? /\bPart of (SIN-\d+)\b/i.exec(body)?.[1] ?? null;

/**
 * Bild und Frame-ID aus dem Issue: erst Anhang (Bild-Adresse), sonst Markdown-Bild in der Beschreibung.
 * @param {{ description?: string, attachments?: { nodes?: { url?: string, title?: string }[] } }} issue
 */
export function sollAusIssue(issue) {
  const text = issue?.description ?? "";
  const anhang = (issue?.attachments?.nodes ?? []).find((a) => a.url && (BILD.test(a.url) || LINEAR_UPLOAD.test(a.url)));
  const md = [...text.matchAll(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]).find((u) => BILD.test(u) || LINEAR_UPLOAD.test(u));
  const bild = anhang?.url ?? md ?? "";
  if (!bild) return {};
  const frame = /Frame(?:-ID)?\D{0,12}(\d+[:-]\d+)/i.exec(`${anhang?.title ?? ""}\n${text}`)?.[1];
  return { bild, ...(frame ? { frame: frame.replace("-", ":") } : {}) };
}

export async function holeSoll(titel, body, call = linear) {
  const id = issueKennung(titel, body);
  if (!id) return {};
  const data = await call(`query($id: String!) { issue(id: $id) { description attachments { nodes { url title } } } }`, { id });
  return sollAusIssue(data.issue);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const arg = (n) => (a.includes(n) ? a[a.indexOf(n) + 1] : "");
  holeSoll(arg("--titel"), arg("--body")).then(
    (s) => console.log(JSON.stringify(s)),
    (e) => (console.error(`::warning::PR-Crawler: Planungsbild nicht gelesen (${e.message})`), console.log("{}")),
  );
}
