/**
 * Figma-Lesezugriff für Agenten (SIN-239). Nur lesen, Token `FIGMA_ACCESS_TOKEN`.
 *   node scripts/autonomy/figma.mjs --node 12:34 [--file KEY]   Werte (Farben, Abstände, Texte) eines Knotens
 *   node scripts/autonomy/figma.mjs --tokens                     Abgleich docs/design/tokens.json ↔ Figma-Farben
 * Ohne Token: „nicht verfügbar“, Exit-Code 0 (wie bisher im Bericht).
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DEFAULT_FILE_KEY = "0SWGDO2ioBD3MyXiAnrbRz";
export const NOT_AVAILABLE = "nicht verfügbar (FIGMA_ACCESS_TOKEN fehlt)";

const hex = (c, opacity = 1) => {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  const a = (c.a ?? 1) * opacity;
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${a < 1 ? h(a) : ""}`.toUpperCase();
};

/**
 * Wesentliche Werte eines Knotens (rekursiv): Name, Typ, Größe, Abstände, Füllfarben, Text.
 * @returns {Record<string, any>}
 */
export function extractValues(node) {
  /** @type {Record<string, any>} */
  const out = { name: node.name, type: node.type };
  if (node.absoluteBoundingBox) out.size = `${node.absoluteBoundingBox.width}x${node.absoluteBoundingBox.height}`;
  for (const k of ["itemSpacing", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "cornerRadius"]) {
    if (typeof node[k] === "number") out[k] = node[k];
  }
  const fills = (node.fills ?? []).filter((f) => f.type === "SOLID" && f.visible !== false).map((f) => hex(f.color, f.opacity ?? 1));
  if (fills.length) out.fills = fills;
  if (node.type === "TEXT") {
    out.text = node.characters;
    if (node.style) out.font = `${node.style.fontFamily} ${node.style.fontWeight} ${node.style.fontSize}/${node.style.lineHeightPx}`;
  }
  if (node.children?.length) out.children = node.children.map(extractValues);
  return out;
}

/** Alle Volltonfarben unterhalb eines Knotens (Füllungen und Linien), großgeschrieben, ohne Alpha. */
export function collectColors(node, set = new Set()) {
  for (const p of [...(node.fills ?? []), ...(node.strokes ?? [])]) {
    if (p.type === "SOLID" && p.visible !== false) set.add(hex(p.color).slice(0, 7));
  }
  for (const c of node.children ?? []) collectColors(c, set);
  return set;
}

/** @param {Record<string, string | undefined>} env */
async function get(path, env, fetchImpl) {
  if (!env.FIGMA_ACCESS_TOKEN) return null;
  const res = await fetchImpl(`https://api.figma.com/v1/${path}`, { headers: { "X-Figma-Token": env.FIGMA_ACCESS_TOKEN } });
  if (!res.ok) throw new Error(`Figma HTTP ${res.status}`);
  return res.json();
}

/**
 * Werte eines Knotens (`12:34`); `null` ohne Token.
 * @param {string} fileKey
 * @param {string} nodeId
 * @param {Record<string, string | undefined>} [env]
 */
export async function readNodeValues(fileKey, nodeId, env = process.env, fetchImpl = fetch) {
  const json = await get(`files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`, env, fetchImpl);
  if (!json) return null;
  const node = json.nodes?.[nodeId]?.document;
  if (!node) throw new Error(`Knoten ${nodeId} nicht gefunden`);
  return extractValues(node);
}

/**
 * Token-Farben aus tokens.json, die in der Figma-Datei nicht vorkommen. `null` ohne Token.
 * @param {{ color?: Record<string, { value: string }> }} tokens
 * @param {string} fileKey
 * @param {Record<string, string | undefined>} [env]
 */
export async function diffColorTokens(tokens, fileKey, env = process.env, fetchImpl = fetch) {
  const json = await get(`files/${fileKey}`, env, fetchImpl);
  if (!json) return null;
  const used = collectColors(json.document);
  return Object.entries(tokens.color ?? {})
    .filter(([, t]) => !used.has(String(t.value).toUpperCase().slice(0, 7)))
    .map(([name, t]) => `${name} (${t.value})`);
}

export async function main(argv, env = process.env, fetchImpl = fetch) {
  const arg = (n) => argv[argv.indexOf(n) + 1];
  const fileKey = argv.includes("--file") ? arg("--file") : DEFAULT_FILE_KEY;
  if (argv.includes("--node")) {
    const v = await readNodeValues(fileKey, arg("--node"), env, fetchImpl);
    return console.log(v ? JSON.stringify(v, null, 2) : NOT_AVAILABLE);
  }
  if (argv.includes("--tokens")) {
    const d = await diffColorTokens(JSON.parse(readFileSync("docs/design/tokens.json", "utf8")), fileKey, env, fetchImpl);
    return console.log(d === null ? NOT_AVAILABLE : d.length ? `Token-Farben ohne Figma-Entsprechung: ${d.join(", ")}` : "Token-Farben stimmen mit Figma überein");
  }
  throw new Error("Aufruf: --node ID [--file KEY] oder --tokens");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
