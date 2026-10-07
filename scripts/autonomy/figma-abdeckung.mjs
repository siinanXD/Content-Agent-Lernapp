/**
 * Figma-Abdeckung (SIN-349): Frame → Route/Komponente → Stand.
 *   node scripts/autonomy/figma-abdeckung.mjs            prüfen (Exit 1 bei Abweichung)
 *   node scripts/autonomy/figma-abdeckung.mjs --write    Bericht docs/quality/figma-abdeckung.md erzeugen
 * Offline-Prüfung: jeder Frame aus docs/design/FIGMA.md ist zugeordnet, `stand` passt zu den Dateien.
 * Mit FIGMA_ACCESS_TOKEN zusätzlich: jeder Frame der Figma-Datei ist zugeordnet. Ohne Token: „nicht verfügbar“.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { DEFAULT_FILE_KEY, NOT_AVAILABLE } from "./figma.mjs";
import { expectedFrames, fetchFigmaFrames } from "./readiness.mjs";

export const MAP_PATH = "docs/quality/figma-abdeckung.json";
export const REPORT_PATH = "docs/quality/figma-abdeckung.md";

/** Stand aus den Dateien ableiten: alle da → umgesetzt, sonst fehlt. Ohne Code gilt der eingetragene Stand „kein Screen“ mit Notiz. */
export function deriveStand(code, exists = existsSync, entry = {}) {
  if (!code?.length) return entry.stand === "kein Screen" && entry.notiz ? "kein Screen" : "fehlt";
  return code.every((p) => exists(p)) ? "umgesetzt" : "fehlt";
}

/**
 * @param {{ frames: { frame: string, code: string[], stand: string }[] }} map
 * @param {string} figmaMd
 * @param {string[] | null} liveFrames Frame-Namen aus Figma, `null` ohne Token
 */
export function checkCoverage(map, figmaMd, liveFrames, exists = existsSync) {
  const problems = [];
  const mapped = new Set(map.frames.map((f) => f.frame.trim()));
  for (const name of expectedFrames(figmaMd)) {
    if (!mapped.has(name.trim())) problems.push(`Frame „${name}“ aus FIGMA.md ist nicht zugeordnet`);
  }
  for (const f of map.frames) {
    const real = deriveStand(f.code, exists, f);
    if (real !== f.stand) problems.push(`Frame „${f.frame}“: Stand ist „${f.stand}“, Dateien ergeben „${real}“`);
  }
  for (const name of liveFrames ?? []) {
    if (!mapped.has(name.trim())) problems.push(`Figma-Frame „${name}“ ist nicht zugeordnet (fehlt im Code)`);
  }
  return problems;
}

export function renderReport(map, liveState) {
  const code = (list) => list.map((c) => `\`${c}\``).join(", ");
  const missing = map.frames.filter((f) => f.stand === "fehlt");
  return [
    "# Figma-Abdeckung (SIN-349)",
    "",
    `Datei \`${DEFAULT_FILE_KEY}\`. Zuordnung: \`${MAP_PATH}\`, Prüfung: \`node scripts/autonomy/figma-abdeckung.mjs\` (läuft in \`npm test\`). Erzeugt mit \`--write\`, nicht von Hand ändern.`,
    "",
    "„umgesetzt“ heißt: Route oder Komponente existiert im Code. Der Abgleich der Werte (Farben, Abstände, Texte) ist `figma.mjs --node` und nicht Teil dieser Prüfung.",
    "",
    `Abgleich mit der Figma-Datei (Bericht ohne Token erzeugt, Live-Abgleich nur in der Konsole): ${liveState}`,
    "",
    `Umgesetzt: ${map.frames.filter((f) => f.stand === "umgesetzt").length} von ${map.frames.length} Frames, fehlend: ${missing.length}, kein App-Screen: ${map.frames.filter((f) => f.stand === "kein Screen").length}.`,
    "",
    "| Frame | Route/Komponente | Code | Stand |",
    "| --- | --- | --- | --- |",
    ...map.frames.map((f) => `| \`${f.frame}\` | ${f.route} | ${f.code.length ? code(f.code) : (f.notiz ?? "–")} | ${f.stand} |`),
    "",
    "## Fehlende Screens",
    "",
    ...(missing.length ? missing.map((f) => `- \`${f.frame}\` (${f.route}): Folge-Issue durch den Planer`) : ["Keine."]),
    "",
    "## Routen ohne eigenen Frame",
    "",
    "| Route | Code | Notiz |",
    "| --- | --- | --- |",
    ...(map.routenOhneFrame ?? []).map((r) => `| ${r.route} | ${code(r.code)} | ${r.notiz} |`),
    "",
  ].join("\n");
}

export async function main(argv, env = process.env, fetchImpl = fetch) {
  const map = JSON.parse(readFileSync(MAP_PATH, "utf8"));
  const figmaMd = readFileSync("docs/design/FIGMA.md", "utf8");
  const live = await fetchFigmaFrames(DEFAULT_FILE_KEY, env, fetchImpl);
  const liveFrames = live && "frames" in live ? live.frames : null;
  const liveState = liveFrames ? `${liveFrames.length} Frames gelesen` : live ? `Figma-Fehler: ${live.error}` : NOT_AVAILABLE;
  if (argv.includes("--liste")) return console.log((liveFrames ?? [liveState]).join("\n")) ?? 0;
  const problems = checkCoverage(map, figmaMd, liveFrames);
  // Der eingecheckte Bericht bleibt tokenunabhängig (der Test prüft ihn ohne Token); der Live-Stand steht nur in der Konsole.
  if (argv.includes("--write")) writeFileSync(REPORT_PATH, renderReport(map, NOT_AVAILABLE));
  console.log(`Figma-Abgleich: ${liveState}`);
  if (problems.length) {
    console.error(problems.join("\n"));
    return 1;
  }
  console.log(`Zuordnung vollständig: ${map.frames.length} Frames`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (c) => process.exit(c),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
