// Revideo-Schnitt (SIN-483): liest klickweg.json und die Design-Tokens, rendert tutorial.mp4 ohne Grafikkarte.
// Aufruf (aus dem Repo-Stamm, nach `npm install` in video/schnitt und ffmpeg-Umwandlung der Aufnahme):
//   node video/schnitt/render.mjs video-ergebnis/klickweg.json video-ergebnis/tutorial.mp4
// Danach liegt `aufnahme.mp4` in video/schnitt/public (macht video.yml), das Logo kopiert dieses Skript.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderVideo } from "@revideo/renderer";

const hier = dirname(fileURLToPath(import.meta.url));
const stamm = resolve(hier, "../..");
const [klickwegDatei, ausgabe] = process.argv.slice(2);
if (!klickwegDatei || !ausgabe) throw new Error("Aufruf: render.mjs <klickweg.json> <tutorial.mp4>");

const klickweg = JSON.parse(readFileSync(klickwegDatei, "utf8"));
const tokens = JSON.parse(readFileSync(resolve(stamm, "docs/design/tokens.json"), "utf8")).color;
const farbe = (name) => tokens[name].value;
copyFileSync(resolve(stamm, "public/icon-512.svg"), resolve(hier, "public/logo.svg"));

process.chdir(hier); // Vite löst @revideo/* aus video/schnitt/node_modules auf, nicht aus dem Repo-Stamm
await renderVideo({
  projectFile: resolve(hier, "project.ts"),
  variables: {
    schritte: klickweg.schritte,
    aufnahmeSek: klickweg.aufnahmeMs / 1000,
    farben: { hero: farbe("bg-hero"), textAufDunkel: farbe("text-on-brand"), akzent: farbe("brand-accent") },
    hinweis: "Lerninhalte mit KI erstellt",
  },
  settings: {
    outFile: basename(ausgabe),
    // Revideo sucht Medien aus public/ relativ zu outDir/.. : Ausgabe daher nach video/schnitt/output, danach kopieren.
    outDir: resolve(hier, "output"),
    logProgress: true,
    workers: 1,
    // Frames per ffmpeg auf dem Server kodieren statt per WebCodecs im Browser (headless ohne H.264-Encoder).
    projectSettings: { exporter: { name: "@revideo/core/ffmpeg", options: { format: "mp4" } } },
    puppeteer: { args: ["--no-sandbox"], executablePath: process.env.CHROME_PATH },
  },
});
mkdirSync(dirname(resolve(stamm, ausgabe)), { recursive: true });
copyFileSync(resolve(hier, "output", basename(ausgabe)), resolve(stamm, ausgabe));
console.log(`Geschnitten: ${ausgabe}`);
