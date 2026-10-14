#!/usr/bin/env node
/**
 * Testnutzer-Agent (SIN-640): Auswertung der Funde von Crawler (`crawler.mjs`, ohne KI, nachts) und Personas
 * (`personas.mjs`, Claude bewertet Bilder und Texte, wöchentlich). Dieses Skript macht den Rest:
 * bewerten (nur Personas), Funde zu Korrektur-Issues bündeln, Dubletten prüfen, Issues anlegen, Bericht als Linear-Kommentar.
 *
 *   node scripts/autonomy/testnutzer.mjs bewerten  --personas testnutzer-ergebnis/personas.json   (schreibt funde-personas.json)
 *   node scripts/autonomy/testnutzer.mjs melden    --quelle crawler|personas --funde <datei> [--lauf URL] [--dry-run]
 *
 * Braucht LINEAR_API_KEY (melden), ANTHROPIC_API_KEY (bewerten). Nur lesend gegen die App; Funde enthalten nie Nutzerdaten.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { isRecentOrOpen } from "./duplicates.mjs";
import { fetchJson } from "./http.mjs";
import { commentOnIssue, createLinearIssues, fetchProjectIssues, fetchRecentlyDone, linear } from "./linear.mjs";

export const GRENZE_LCP_MS = 2500;
/** Kosten je Persona-Lauf unter 0,50 EUR (Issue); in USD gerechnet mit Reserve. */
export const MAX_USD = 0.5;
/** Linear Free: höchstens so viele neue Issues je Lauf (AGENTS.md: Planer höchstens 5 je Woche). */
export const MAX_NEUE_ISSUES = 5;
export const BERICHT_ISSUE = "SIN-640";
/** Günstigstes Claude-Modell mit Bildeingabe (wie `sichtpruefung.mjs`). */
export const MODELL = "claude-haiku-5-5";
const PREIS_EIN = 0.1;
const PREIS_AUS = 0.5;

/** Reihenfolge = Gewicht, wichtigste zuerst. */
export const KATEGORIEN = ["tot", "http", "konsole", "a11y", "scroll", "lcp", "verstaendlich", "stil", "ladezeit"];
const CONTENT = new Set(["verstaendlich"]);

/** Label des Korrektur-Issues: Inhaltsfragen `content`, sonst `frontend`. */
export const typOf = (f) => (f.typ === "content" || CONTENT.has(f.kategorie) ? "content" : "frontend");

/** Ein Issue je Kategorie und Seite, Handy und Desktop zusammen. */
export const findingKey = (f) => `${f.kategorie}:${f.route}`;
export const marker = (key) => `<!-- testnutzer:${key} -->`;

/** Entfernt Zahlen aus Konsolentexten nicht, kürzt aber auf 200 Zeichen (Funde bleiben lesbar und klein). */
const kurz = (s, n = 200) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * Funde → Issue-Kandidaten, wichtigste Kategorie zuerst.
 * @param {{ kategorie: string, route: string, viewport?: string, text: string, bild?: string }[]} funde
 */
export function buendeln(funde) {
  const gruppen = new Map();
  for (const f of funde) {
    const key = findingKey(f);
    const g = gruppen.get(key) ?? { key, kategorie: f.kategorie, route: f.route, typ: typOf(f), texte: new Set(), viewports: new Set(), bilder: new Set() };
    g.texte.add(kurz(f.text));
    if (f.viewport) g.viewports.add(f.viewport);
    if (f.bild) g.bilder.add(f.bild);
    gruppen.set(key, g);
  }
  const rang = (k) => (KATEGORIEN.includes(k) ? KATEGORIEN.indexOf(k) : KATEGORIEN.length);
  return [...gruppen.values()].sort((a, b) => rang(a.kategorie) - rang(b.kategorie) || a.key.localeCompare(b.key));
}

const TITEL = {
  tot: "Toter Weg",
  http: "Fehlerantwort (4xx/5xx)",
  konsole: "Konsolenfehler",
  a11y: "Barrierefreiheit",
  scroll: "Seitwärts-Scrollen",
  lcp: `Ladezeit über ${GRENZE_LCP_MS} ms (LCP)`,
  verstaendlich: "Unverständlich oder wirkt nicht wie ein Produkt",
  stil: "Weicht vom Stil ab",
  ladezeit: "Lädt langsam",
};

/** Issue-Text eines Bündels; Kennung als Marker für die Dubletten-Prüfung. */
export function issueVon(g, { lauf = "", quelle = "crawler" } = {}) {
  const wo = [...g.viewports].join(", ");
  return {
    title: `Testnutzer: ${TITEL[g.kategorie] ?? g.kategorie} auf ${g.route}`,
    description: [
      marker(g.key),
      `Gefunden vom Testnutzer-Agent (${quelle === "personas" ? "Persona-Lauf, KI-erzeugte Bewertung (Claude), nur ein Hinweis" : "nächtlicher Crawler, ohne KI"}) auf der Live-App.`,
      "",
      `Seite: \`${g.route}\`${wo ? ` (${wo})` : ""}`,
      "",
      ...[...g.texte].slice(0, 6).map((t) => `- ${t}`),
      "",
      lauf ? `Screenshots und Rohdaten: [Artefakt \`testnutzer\`](${lauf})` : "",
      "",
      "Part of SIN-640. Behoben ist es, wenn der nächste Lauf den Fund nicht mehr meldet.",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n"),
    priority: g.kategorie === "tot" || g.kategorie === "http" ? 2 : 3,
    labels: [g.typ],
  };
}

/** Bündel, zu denen es schon ein offenes oder in den letzten 14 Tagen erledigtes Issue gibt, fallen heraus. */
export function ohneDubletten(gruppen, issues, now = new Date()) {
  const pool = issues.filter((i) => isRecentOrOpen(i, now));
  const neu = [];
  const doppelt = [];
  for (const g of gruppen) {
    const treffer = pool.find((i) => String(i.description ?? "").includes(marker(g.key)));
    (treffer ? doppelt : neu).push(treffer ? { ...g, issue: treffer.identifier } : g);
  }
  return { neu, doppelt };
}

/** Linear-Kommentar: Zusammenfassung des Laufs. */
export function berichtText({ quelle, funde, neu, doppelt, ueberzaehlig = 0, angelegt = [], lauf = "", usd = null, notiz = "" }) {
  const titel = quelle === "personas" ? "Testnutzer-Agent: Persona-Lauf (wöchentlich, KI-erzeugt)" : "Testnutzer-Agent: Crawler (nächtlich)";
  return [
    `**${titel}**`,
    "",
    funde === 0 ? "Keine Funde." : `${funde} Fund(e) in ${neu + doppelt} Gruppe(n): ${angelegt.length} neue Issues, ${doppelt} schon bekannt${ueberzaehlig ? `, ${ueberzaehlig} wegen Deckel (${MAX_NEUE_ISSUES}) liegen gelassen` : ""}.`,
    angelegt.length ? `Neu: ${angelegt.join(", ")}` : "",
    notiz,
    lauf ? `[Lauf und Screenshots](${lauf})` : "",
    usd != null ? `Kosten: ${usd.toFixed(4)} USD (Deckel ${MAX_USD} USD)` : "",
  ].filter(Boolean).join("\n");
}

// ---- Personas bewerten (Claude) ----

export const CHECKLISTE = [
  ["verstaendlich", "Ist der Schritt für die Persona verständlich (Text, Knöpfe, was kommt als Nächstes)?"],
  ["tot", "Gibt es ein totes Ende (nichts zum Weitermachen, Weg bricht ab, Schritt fehlgeschlagen)?"],
  ["a11y", "Barrierefreiheit: lesbarer Kontrast, große Ziele (mind. 44 px), erkennbare Beschriftung?"],
  ["ladezeit", "Wirkt der Schritt langsam (Zeit in ms steht dabei)?"],
  ["stil", "Wirkt es wie ein echtes Produkt oder wie KI-Standard? Sollstil: eigene Farbwelt Orange/Weiß/Schwarz, Lernpfad als Zickzack, Variante 2026, kein Template-Look."],
];

export const PERSONAS = [
  { id: "azubi-metall", name: "Azubi Maschinen- und Anlagenführer Metall, 1. Lehrjahr", beschreibung: "Handy, wenig Zeit, will in 10 Minuten eine Einheit schaffen.", viewport: "handy" },
  { id: "azubi-pruefung", name: "Azubi kurz vor der Zwischenprüfung", beschreibung: "Handy, will gezielt üben und wissen, wo er steht.", viewport: "handy" },
  { id: "ausbilder", name: "Ausbilder", beschreibung: "Desktop, legt eine Gruppe an und schaut den Fortschritt an.", viewport: "desktop" },
];

export function frage(persona) {
  return (
    `Du bist ${persona.name} (${persona.beschreibung}) und spielst eine Lern-App (Deutsch) durch. Gegeben: je Schritt Beschriftung, Adresse, ` +
    `sichtbarer Text, Ladezeit und ein Bild. Bewerte nach dieser festen Liste und nenne nur, was du in Bild oder Text wirklich siehst:\n` +
    CHECKLISTE.map(([k, t]) => `- ${k}: ${t}`).join("\n") +
    `\nSchritte mit Status "fehler" sind ein toter Weg (kategorie "tot"). Nichts erfinden, keine Vermutungen über Code, höchstens 5 Funde, wichtigste zuerst. ` +
    `Antworte ausschließlich als JSON {"zusammenfassung":"ein Satz","funde":[{"kategorie":"${CHECKLISTE.map(([k]) => k).join("|")}","schritt":"Beschriftung","text":"kurz, deutsch, konkret"}]}. Keine Funde: leere Liste.`
  );
}

export function nachrichtFuer(persona, schritte, bilder) {
  const inhalt = [];
  schritte.forEach((s, i) => {
    inhalt.push({ type: "text", text: `Schritt ${i + 1}: ${s.label} (${s.route}) – Status ${s.status}, ${s.ms} ms${s.fehler ? `, Fehler: ${kurz(s.fehler, 160)}` : ""}\nSichtbarer Text: ${kurz(s.text, 600)}` });
    if (bilder[i]) inhalt.push({ type: "image", source: { type: "base64", media_type: "image/png", data: bilder[i] } });
  });
  inhalt.push({ type: "text", text: frage(persona) });
  return [{ role: "user", content: inhalt }];
}

/** Antwort → geprüfte Funde (nur bekannte Kategorien, höchstens 5). Wirft bei ungültigem JSON. */
export function parseFunde(text) {
  const data = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const erlaubt = CHECKLISTE.map(([k]) => k);
  const funde = (Array.isArray(data.funde) ? data.funde : [])
    .filter((f) => f && typeof f.text === "string" && f.text.trim() && erlaubt.includes(f.kategorie))
    .slice(0, 5)
    .map((f) => ({ kategorie: f.kategorie, schritt: kurz(f.schritt, 80), text: kurz(f.text) }));
  return { zusammenfassung: kurz(data.zusammenfassung), funde };
}

export const kosten = (u = {}) => Math.round(((u.input_tokens ?? 0) / 1e6 * PREIS_EIN + (u.output_tokens ?? 0) / 1e6 * PREIS_AUS) * 1e6) / 1e6;

async function frageClaude(nachrichten, env) {
  const kopf = { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" };
  if (env.ANTHROPIC_WORKSPACE_ID) kopf["anthropic-workspace-id"] = env.ANTHROPIC_WORKSPACE_ID;
  const data = await fetchJson("Anthropic", "https://api.anthropic.com/v1/messages", { method: "POST", headers: kopf, body: JSON.stringify({ model: MODELL, max_tokens: 900, messages: nachrichten }) });
  return { text: data.content?.find((c) => c.type === "text")?.text ?? "{}", usage: data.usage ?? {} };
}

/**
 * Bewertet die Durchläufe aus `personas.json` (je Persona ein Aufruf). Bricht vor dem nächsten Aufruf ab, wenn der Kostendeckel erreicht ist.
 * @returns {Promise<{ funde: object[], usd: number, notiz: string }>}
 */
export async function bewerten(durchlaeufe, env = process.env, ask = frageClaude) {
  const funde = [];
  let usd = 0;
  let notiz = "";
  for (const d of durchlaeufe) {
    const persona = PERSONAS.find((p) => p.id === d.persona);
    if (!persona) continue;
    if (usd >= MAX_USD) {
      notiz += `Kostendeckel erreicht: ${persona.id} nicht bewertet. `;
      continue;
    }
    const bilder = d.schritte.map((s) => (s.bild ? readBild(d.ordner, s.bild) : null));
    try {
      const { text, usage } = await ask(nachrichtFuer(persona, d.schritte, bilder), env);
      usd += kosten(usage);
      const erg = parseFunde(text);
      for (const f of erg.funde) funde.push({ kategorie: f.kategorie, route: d.schritte.find((s) => s.label === f.schritt)?.route ?? d.schritte[0]?.route ?? "/", viewport: persona.viewport, text: `${persona.name}: ${f.text}`, bild: d.schritte.find((s) => s.label === f.schritt)?.bild });
    } catch (e) {
      notiz += `${persona.id}: Bewertung fehlgeschlagen (${kurz(e.message, 80)}). `;
    }
  }
  // Abgebrochene Schritte sind tote Wege, auch ohne Modell.
  for (const d of durchlaeufe) for (const s of d.schritte) if (s.status === "fehler") funde.push({ kategorie: "tot", route: s.route, viewport: PERSONAS.find((p) => p.id === d.persona)?.viewport, text: `Weg „${d.persona}“ bricht bei „${s.label}“ ab: ${kurz(s.fehler, 120)}`, bild: s.bild });
  return { funde, usd, notiz: notiz.trim() };
}

const readBild = (ordner, datei) => readFileSync(`${ordner}/${datei}`).toString("base64");

// ---- Melden (Linear) ----

/** Legt neue Issues an (höchstens MAX_NEUE_ISSUES), schreibt den Bericht als Kommentar. */
export async function melden({ quelle, funde, lauf = "", usd = null, notiz = "", dry = false, call = linear }) {
  const gruppen = buendeln(funde);
  const issues = [...(await fetchProjectIssues(call)), ...(await fetchRecentlyDone(call))];
  const { neu, doppelt } = ohneDubletten(gruppen, issues);
  const anlegen = neu.slice(0, MAX_NEUE_ISSUES);
  const items = anlegen.map((g) => issueVon(g, { lauf, quelle }));
  const angelegt = dry ? items.map((i) => `(Trockenlauf) ${i.title}`) : await createLinearIssues(items, call);
  const text = berichtText({ quelle, funde: funde.length, neu: neu.length, doppelt: doppelt.length, ueberzaehlig: neu.length - anlegen.length, angelegt, lauf, usd, notiz });
  console.log(text);
  if (dry) return { text, angelegt };
  const data = await call(`query($id: String!) { issue(id: $id) { id } }`, { id: BERICHT_ISSUE });
  if (data.issue?.id) await commentOnIssue(data.issue.id, text, call);
  return { text, angelegt };
}

export function leseFunde(datei) {
  const data = JSON.parse(readFileSync(datei, "utf8"));
  return Array.isArray(data) ? data : data.funde ?? [];
}

async function main(argv) {
  const arg = (n, d = "") => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const [befehl] = argv;
  if (befehl === "bewerten") {
    if (!process.env.ANTHROPIC_API_KEY) return console.log("::warning::Kein ANTHROPIC_API_KEY: Persona-Bewertung übersprungen.");
    const datei = arg("--personas", "testnutzer-ergebnis/personas.json");
    const durch = JSON.parse(readFileSync(datei, "utf8"));
    const erg = await bewerten(durch);
    writeFileSync(arg("--out", "testnutzer-ergebnis/funde-personas.json"), JSON.stringify(erg, null, 2));
    console.log(`Personas: ${erg.funde.length} Fund(e), ${erg.usd.toFixed(4)} USD`);
  } else if (befehl === "melden") {
    const quelle = arg("--quelle", "crawler");
    const datei = arg("--funde", `testnutzer-ergebnis/funde-${quelle}.json`);
    const raw = JSON.parse(readFileSync(datei, "utf8"));
    await melden({ quelle, funde: Array.isArray(raw) ? raw : raw.funde ?? [], usd: raw.usd ?? null, notiz: raw.notiz ?? "", lauf: arg("--lauf"), dry: argv.includes("--dry-run") });
  } else {
    console.error("Aufruf: bewerten --personas DATEI | melden --quelle crawler|personas --funde DATEI [--lauf URL] [--dry-run]");
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
