// Revideo-Schnitt (SIN-483): liest klickweg.json und die Design-Tokens, rendert tutorial.mp4 ohne Grafikkarte.
// Aufruf (aus dem Repo-Stamm, nach `npm install` in video/schnitt und ffmpeg-Umwandlung der Aufnahme):
//   node video/schnitt/render.mjs video-ergebnis/klickweg.json video-ergebnis/tutorial.mp4
// Danach liegt `aufnahme.mp4` in video/schnitt/public (macht video.yml), das Logo kopiert dieses Skript.
import { copyFileSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderVideo } from "@revideo/renderer";

const hier = dirname(fileURLToPath(import.meta.url));
const stamm = resolve(hier, "../..");
const args = process.argv.slice(2);
// Werbeclip (SIN-520): render.mjs --werbeclip <clip.mp4> <ausgabe.mp4> blendet „Mit KI erstellt“ über den KI-Clip.
const werbeclip = args[0] === "--werbeclip";
const [klickwegDatei, ausgabe] = werbeclip ? args.slice(1) : args;
if (!klickwegDatei || !ausgabe) throw new Error("Aufruf: render.mjs <klickweg.json> <tutorial.mp4> | --werbeclip <clip.mp4> <ausgabe.mp4>");

const klickweg = werbeclip ? { schritte: [], aufnahmeMs: 0 } : JSON.parse(readFileSync(klickwegDatei, "utf8"));
if (werbeclip) copyFileSync(klickwegDatei, resolve(hier, "public/aufnahme.mp4"));
const tokens = JSON.parse(readFileSync(resolve(stamm, "docs/design/tokens.json"), "utf8")).color;
const farbe = (name) => tokens[name].value;
copyFileSync(resolve(stamm, "public/icon-512.svg"), resolve(hier, "public/logo.svg"));

await renderVideo({
  projectFile: resolve(hier, "project.ts"),
  variables: {
    schritte: klickweg.schritte,
    aufnahmeSek: klickweg.aufnahmeMs / 1000,
    farben: { hero: farbe("bg-hero"), textAufDunkel: farbe("text-on-brand"), akzent: farbe("brand-accent") },
    hinweis: "Lerninhalte mit KI erstellt",
    werbeclip: werbeclip ? { sekunden: Number(process.env.WERBECLIP_SEKUNDEN ?? 8), text: "Mit KI erstellt" } : null,
  },
  settings: {
    outFile: basename(ausgabe),
    outDir: resolve(stamm, dirname(ausgabe)),
    logProgress: true,
    workers: 1,
    puppeteer: { args: ["--no-sandbox"] },
  },
});
console.log(`Geschnitten: ${ausgabe}`);
