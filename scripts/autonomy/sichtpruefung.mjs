#!/usr/bin/env node
/**
 * KI-Sichtprüfung (SIN-523, Teil 2): Hinweis, kein Gate. Bei PRs, die `src/app/**` oder `src/components/**` ändern,
 * bekommt Claude die Bilder der betroffenen Seiten (Handy + Desktop) und das passende Figma-Frame und nennt
 * Abweichungen bei Anordnung, Abständen, Überlappung und abgeschnittenem Text (höchstens 5 Punkte).
 * Ergebnis: ein Kommentar im PR (wird bei neuem Commit ersetzt), Kosten stehen im Kommentar und im Log.
 *
 *   node scripts/autonomy/sichtpruefung.mjs routen --dateien "a.tsx,b.tsx"       Betroffene Seiten (eine je Zeile)
 *   node scripts/autonomy/sichtpruefung.mjs lauf --pr 123 --bilder screenshots   Prüfung und Kommentar
 *
 * Bilder kommen aus `screenshots.mjs` (Datei `<seite>-handy.png`, `<seite>-desktop.png`). Braucht ANTHROPIC_API_KEY,
 * GH_TOKEN, GITHUB_REPOSITORY; optional FIGMA_ACCESS_TOKEN (ohne: nur Bild gegen sich selbst, Hinweis im Kommentar).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { frameBild } from "./figma.mjs";
import { fetchJson } from "./http.mjs";

/** Günstigstes Claude-Modell mit Bildeingabe, schon im Repo geführt (src/lib/anthropic/client.ts). */
export const MODELL = "claude-haiku-5-5";
/** USD je 1M Token, Standard-Preis = 2 × Batch-Preis aus src/lib/quality/cost-guard.ts (0,05 / 0,25). */
export const PREIS_EIN = 0.1;
export const PREIS_AUS = 0.5;
export const MAX_ROUTEN = 4;
export const MAX_PUNKTE = 5;
export const MARKER = "<!-- sichtpruefung -->";

/** Dateiname einer Route wie in screenshots.mjs (dort nicht importiert, das zieht Playwright mit). */
export const slug = (route) => route.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-") || "start";

export const kosten = (usage = {}) =>
  Math.round(((usage.input_tokens ?? 0) / 1e6 * PREIS_EIN + (usage.output_tokens ?? 0) / 1e6 * PREIS_AUS) * 1e6) / 1e6;

/** Geändert genug für eine Sichtprüfung? Nur Seiten und Komponenten, keine Tests. */
export const istFrontend = (datei) => /^src\/(app|components)\/.+\.tsx?$/.test(datei) && !/\.test\.tsx?$/.test(datei) && !datei.startsWith("src/app/api/");

/** `src/app/einheit/[unitId]/page.tsx` → `einheit/[unitId]`; Startseite → "". */
export const seitenVerzeichnis = (datei) => path.posix.dirname(datei).replace(/^src\/app\/?/, "");

/** Route aus der Liste (e2e/routes.ts) für ein Seitenverzeichnis, dynamische Teile `[x]` passen auf jedes Segment. */
export function routeFuer(verz, routen) {
  const re = new RegExp(`^/${verz.split("/").filter(Boolean).map((s) => (/^\[.+\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/")}$`);
  return routen.find((r) => re.test(r)) ?? null;
}

/**
 * Betroffene Seiten: geänderte Dateien unter `src/app` zählen für ihr Verzeichnis (hat es eine `page.tsx`), geänderte
 * Komponenten für jede Seite, deren Verzeichnis sie importiert (`@/components/...`, nur direkt, nicht über andere Komponenten).
 * @param {string[]} geaendert
 * @param {{ verz: string, quelle: string }[]} seiten  je Seite: Verzeichnis und Text aller .tsx-Dateien darin
 * @param {string[]} routen
 */
export function betroffeneRouten(geaendert, seiten, routen) {
  const dateien = geaendert.filter(istFrontend);
  const verz = new Set();
  for (const d of dateien) {
    if (d.startsWith("src/app/")) {
      const v = seitenVerzeichnis(d);
      if (seiten.some((s) => s.verz === v)) verz.add(v);
    } else {
      const imp = d.replace(/^src\//, "@/").replace(/\.tsx?$/, "");
      for (const s of seiten) if (s.quelle.includes(`"${imp}"`) || s.quelle.includes(`'${imp}'`)) verz.add(s.verz);
    }
  }
  return [...verz].map((v) => routeFuer(v, routen)).filter(Boolean).slice(0, MAX_ROUTEN);
}

/** Routenliste aus e2e/routes.ts (Einträge in Anführungszeichen). */
export function leseRouten(quelle) {
  return [...quelle.matchAll(/^\s*"(\/[^"]*)",?\s*$/gm)].map((m) => m[1]);
}

function sammleSeiten(root = "src/app") {
  const out = [];
  const walk = (dir) => {
    const eintraege = readdirSync(dir, { withFileTypes: true });
    if (eintraege.some((e) => e.name === "page.tsx")) {
      const quelle = eintraege.filter((e) => e.isFile() && e.name.endsWith(".tsx")).map((e) => readFileSync(path.join(dir, e.name), "utf8")).join("\n");
      out.push({ verz: path.relative(root, dir).split(path.sep).join("/"), quelle });
    }
    for (const e of eintraege) if (e.isDirectory() && e.name !== "api") walk(path.join(dir, e.name));
  };
  walk(root);
  return out;
}

export const FRAGE =
  "Du prüfst eine Seite einer Lernapp (Deutsch) auf Layout-Fehler. Gegeben: Bilder der gebauten Seite (Handy 390 px, Desktop 1280 px) " +
  "und, wenn vorhanden, das Figma-Frame als Soll. Nenne nur Abweichungen bei Anordnung, Abständen, Überlappung und abgeschnittenem Text, " +
  "die du auf den Bildern siehst. Keine Farb- oder Stilkritik, nichts erfinden, keine Vermutungen über Code. " +
  `Höchstens ${MAX_PUNKTE} Punkte insgesamt, wichtigste zuerst. Antworte ausschließlich als JSON ` +
  '{"zusammenfassung":"ein Satz","punkte":[{"seite":"/route","viewport":"handy|desktop","text":"kurz, deutsch, konkret"}]}. Keine Abweichung: leere Liste.';

/** Nachricht an die Messages-API: je Seite Beschriftung, Handy, Desktop und Figma (falls vorhanden). */
export function baueNachricht(seiten) {
  const inhalt = [];
  for (const s of seiten) {
    inhalt.push({ type: "text", text: `Seite ${s.route}${s.figmaName ? ` (Figma-Frame „${s.figmaName}“)` : " (kein Figma-Frame zugeordnet)"}` });
    for (const [label, b64] of [["Handy 390 px", s.handy], ["Desktop 1280 px", s.desktop], ["Figma (Soll)", s.figma]]) {
      if (!b64) continue;
      inhalt.push({ type: "text", text: label });
      inhalt.push({ type: "image", source: { type: "base64", media_type: "image/png", data: b64 } });
    }
  }
  inhalt.push({ type: "text", text: FRAGE });
  return [{ role: "user", content: inhalt }];
}

/** Antwort → höchstens 5 Punkte. Wirft bei ungültigem JSON. */
export function parseSicht(text) {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const data = JSON.parse(json);
  const punkte = (Array.isArray(data.punkte) ? data.punkte : [])
    .filter((p) => p && typeof p.text === "string" && p.text.trim())
    .slice(0, MAX_PUNKTE)
    .map((p) => ({ seite: String(p.seite ?? ""), viewport: String(p.viewport ?? ""), text: p.text.trim() }));
  return { zusammenfassung: typeof data.zusammenfassung === "string" ? data.zusammenfassung.trim() : "", punkte };
}

export function formatKommentar({ ergebnis, usd, lauf, notiz = "", sha = "" }) {
  const punkte = ergebnis?.punkte ?? [];
  return [
    MARKER,
    "## Sichtprüfung (KI, nur Hinweis)",
    "",
    ergebnis?.zusammenfassung || notiz || "Keine Zusammenfassung.",
    "",
    punkte.length ? punkte.map((p) => `- \`${p.seite}\`${p.viewport ? ` (${p.viewport})` : ""}: ${p.text}`).join("\n") : "Keine Abweichungen gefunden.",
    "",
    notiz && ergebnis?.zusammenfassung ? `${notiz}\n` : "",
    lauf ? `Bilder (Handy, Desktop, Figma): [Artefakt \`sichtpruefung\`](${lauf})` : "",
    `<sub>Modell ${MODELL}, Kosten ${usd.toFixed(4)} USD${sha ? `, Stand ${sha.slice(0, 7)}` : ""}. Blockiert nichts; der Layout-Test in \`build\` ist das Gate.</sub>`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

async function gh(pfad, { method = "GET", body } = {}, env = process.env) {
  return fetchJson("GitHub", `https://api.github.com${pfad}`, {
    method,
    headers: { Authorization: `Bearer ${env.GH_TOKEN ?? env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function frageClaude(nachrichten, env) {
  const kopf = { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" };
  if (env.ANTHROPIC_WORKSPACE_ID) kopf["anthropic-workspace-id"] = env.ANTHROPIC_WORKSPACE_ID;
  const data = await fetchJson("Anthropic", "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: kopf,
    body: JSON.stringify({ model: MODELL, max_tokens: 900, messages: nachrichten }),
  });
  return { text: data.content?.find((c) => c.type === "text")?.text ?? "{}", usage: data.usage ?? {} };
}

const b64 = (datei) => (existsSync(datei) ? readFileSync(datei).toString("base64") : null);

export async function lauf(argv, env = process.env) {
  const arg = (n) => argv[argv.indexOf(n) + 1];
  const pr = arg("--pr");
  const repo = env.GITHUB_REPOSITORY;
  const bilder = arg("--bilder") ?? "screenshots";
  if (!pr || !repo) throw new Error("--pr und GITHUB_REPOSITORY nötig");
  if (!env.ANTHROPIC_API_KEY) return console.log("Kein ANTHROPIC_API_KEY: Sichtprüfung übersprungen.");

  const routen = readdirSync(bilder).filter((f) => f.endsWith("-handy.png")).map((f) => f.replace(/-handy\.png$/, ""));
  const alleRouten = leseRouten(readFileSync("e2e/routes.ts", "utf8"));
  const abdeckung = JSON.parse(readFileSync("docs/quality/figma-abdeckung.json", "utf8")).frames ?? [];
  const seiten = [];
  let notiz = "";
  for (const key of routen) {
    const route = alleRouten.find((r) => slug(r) === key) ?? `/${key}`;
    const frame = abdeckung.find((f) => f.route === route || (f.route.includes("[") && routeFuer(f.route.replace(/^\//, ""), [route])));
    let figma = null;
    try {
      figma = frame ? await frameBild(frame.frame, env) : null;
    } catch (e) {
      notiz = `Figma-Bild nicht lesbar (${e.message}).`;
    }
    if (frame && !figma && !notiz) notiz = "Figma nicht verfügbar (FIGMA_ACCESS_TOKEN fehlt oder Frame nicht gefunden): ohne Soll-Bild geprüft.";
    seiten.push({ route, figmaName: figma ? frame.frame : null, handy: b64(path.join(bilder, `${key}-handy.png`)), desktop: b64(path.join(bilder, `${key}-desktop.png`)), figma: figma?.base64 ?? null });
  }
  if (!seiten.length) return console.log("Keine Bilder: nichts zu prüfen.");

  const { text, usage } = await frageClaude(baueNachricht(seiten), env);
  const usd = kosten(usage);
  console.log(`Sichtprüfung: ${seiten.length} Seite(n), ${usage.input_tokens ?? 0} Token ein, ${usage.output_tokens ?? 0} aus, ${usd.toFixed(4)} USD (${MODELL})`);
  let ergebnis = null;
  try {
    ergebnis = parseSicht(text);
  } catch {
    notiz = "Antwort des Modells war nicht lesbar.";
  }
  const lauf = env.GITHUB_RUN_ID ? `https://github.com/${repo}/actions/runs/${env.GITHUB_RUN_ID}` : "";
  const body = formatKommentar({ ergebnis, usd, lauf, notiz, sha: env.PR_SHA ?? "" });
  const kommentare = await gh(`/repos/${repo}/issues/${pr}/comments?per_page=100`, {}, env);
  const meiner = kommentare.find((c) => c.body?.includes(MARKER));
  if (meiner) await gh(`/repos/${repo}/issues/comments/${meiner.id}`, { method: "PATCH", body: { body } }, env);
  else await gh(`/repos/${repo}/issues/${pr}/comments`, { method: "POST", body: { body } }, env);
  if (env.GITHUB_STEP_SUMMARY) (await import("node:fs")).appendFileSync(env.GITHUB_STEP_SUMMARY, `${body}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [befehl, ...rest] = process.argv.slice(2);
  const arg = (n) => rest[rest.indexOf(n) + 1];
  if (befehl === "routen") {
    const dateien = (arg("--dateien") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    console.log(betroffeneRouten(dateien, sammleSeiten(), leseRouten(readFileSync("e2e/routes.ts", "utf8"))).join("\n"));
  } else if (befehl === "lauf") {
    // Ein Ausfall der Sichtprüfung darf den PR nicht blockieren: Warnung, kein Abbruch.
    lauf(rest).catch((e) => console.log(`::warning::Sichtprüfung: ${e.message}`));
  } else {
    console.error("Aufruf: routen --dateien a,b | lauf --pr N [--bilder DIR]");
    process.exit(1);
  }
}
