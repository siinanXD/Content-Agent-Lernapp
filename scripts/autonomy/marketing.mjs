/**
 * Marketing-Agent (SIN-484): Werbetexte für einen fertigen Kurs. Daten nur aus der Datenbank, 3 Varianten
 * (LinkedIn, Website, E-Mail an Bildungsträger), Prüfung nach dem Schreiben, Ablage in `werbemittel` mit Status
 * `wartet_auf_freigabe`. Veröffentlicht wird hier nie.
 * Befehl: node scripts/autonomy/marketing.mjs lauf --keyword <Kurs> [--trocken]
 */
import { pathToFileURL } from "node:url";

export const MODELL_STANDARD = "claude-haiku-5-5";
export const MODELL_STARK = "claude-sonnet-5-5";
/** USD je 1 Mio. Token (Standardpreise, nicht Batch). */
export const PREISE = { "claude-haiku-5-5": { in: 0.1, out: 0.5 }, "claude-sonnet-5-5": { in: 2, out: 10 } };
export const DECKEL_EUR = 1;
export const USD_EUR = 0.92;
export const STATUS_NEU = "wartet_auf_freigabe";
export const KANAELE = {
  linkedin: { art: "text_linkedin", name: "LinkedIn-Beitrag" },
  website: { art: "text_website", name: "Kurztext für die Website" },
  email: { art: "text_email", name: "E-Mail an Bildungsträger" },
};
export const KENNZEICHNUNG = "mit KI erstellt";

/** Verbotene Formulierungen. */
export const VERBOTEN = [
  { id: "garantie", re: /garantier|sicher\s+bestanden|bestehen\s+(ist\s+)?sicher|100\s?%\s*(bestehen|erfolg)|durchfall\w*\s+(ausgeschlossen|unmöglich)|nie\s+wieder\s+durchfallen/i },
  { id: "bestanden-versprechen", re: /prüfung\w*\s+(wird\s+)?bestanden|bestehen\s+(sie|du|ihr)\s+die\s+prüfung/i },
  { id: "ihk-aufgaben", re: /ihk[-\s]?(prüfungs)?aufgaben|originale?\s+(prüfungs)?aufgaben|prüfungsaufgaben\s+der\s+ihk|echte\s+ihk/i },
  { id: "ihk-logo", re: /ihk[-\s]?(logo|siegel|zertifi|gütesiegel|geprüft|zugelassen|empfohlen)|von\s+der\s+ihk\s+(anerkannt|zugelassen|geprüft)/i },
  { id: "zulassung", re: /zfu[-\s]?zugelassen|staatlich\s+(anerkannt|zugelassen|geprüft)/i },
  { id: "lernende-direkt", re: /\b(lerne|lern|melde\s+dich|starte\s+deine|deine|dein|für\s+azubis|für\s+auszubildende|kaufe|buche\s+jetzt|jetzt\s+kaufen)\b/i },
];

/** Alle Zahlen im Text (auch mit Tausenderpunkt oder Dezimalkomma). */
export function zahlenIn(text) {
  return [...String(text).matchAll(/\d+(?:[.,]\d+)*/g)]
    .map((m) => Number(m[0].replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")))
    .filter(Number.isFinite);
}

/** Zahlen, die der Text nennen darf: nur Werte aus der Datenbank. */
export function erlaubteZahlen(f) {
  const a = [f.einheiten, f.quellen, f.minuten, f.fragen, f.lernfelder?.length];
  if (f.minuten) a.push(Math.round((f.minuten / 60) * 10) / 10, Math.round(f.minuten / 60));
  for (const lf of f.lernfelder ?? []) a.push(...zahlenIn(lf));
  return new Set(a.filter((x) => typeof x === "number" && Number.isFinite(x)));
}

/**
 * Prüft einen Text. Rückgabe: Liste der Verstöße (leer = ok).
 * Regeln: Kennzeichnung „mit KI erstellt“, Zielgruppe Bildungsträger/Ausbilder, nichts Verbotenes, nur Zahlen aus `fakten`.
 */
export function pruefeText(text, fakten) {
  const t = String(text ?? "");
  const fehler = [];
  if (t.trim().length < 80) fehler.push("zu kurz");
  if (!t.toLowerCase().includes(KENNZEICHNUNG.toLowerCase())) fehler.push(`Kennzeichnung „${KENNZEICHNUNG}“ fehlt`);
  if (!/bildungsträger|ausbilder/i.test(t)) fehler.push("Zielgruppe Bildungsträger/Ausbilder nicht genannt");
  for (const v of VERBOTEN) if (v.re.test(t)) fehler.push(`verboten: ${v.id}`);
  const ok = erlaubteZahlen(fakten);
  for (const z of zahlenIn(t)) if (!ok.has(z)) fehler.push(`Zahl ${z} nicht aus der Datenbank`);
  return fehler;
}

/** Fakten aus Zeilen der Tabellen courses, units, sources, questions. */
export function faktenAus({ kurs, units, sources, fragen }) {
  const lf = kurs.lernfeld;
  return {
    kursId: kurs.id,
    kurs: kurs.keyword,
    status: kurs.status,
    lernfelder: lf ? [[lf.id, lf.title].filter(Boolean).join(" ")] : [],
    einheiten: units.length,
    minuten: units.reduce((s, u) => s + (u.minutes ?? 0), 0),
    quellen: sources.length,
    fragen: fragen ?? null,
  };
}

export function promptBauen(f) {
  return [
    "Du schreibst Werbetexte für eine KI-gestützte Lern-App. Zielgruppe sind Bildungsträger und Ausbilder, NICHT Lernende (Fernunterricht, FernUSG).",
    `Kurs: ${f.kurs}. Lernfelder: ${f.lernfelder.join("; ") || "keine Angabe"}.`,
    `Zahlen aus der Datenbank (nur diese darfst du nennen): ${f.einheiten} Lerneinheiten, ${f.minuten} Minuten Lernzeit, ${f.quellen} amtliche Quellen${f.fragen ? `, ${f.fragen} Fragen` : ""}.`,
    "Regeln:",
    `- Jeder Text enthält den Hinweis „${KENNZEICHNUNG}“ und nennt Bildungsträger oder Ausbilder.`,
    "- Keine Versprechen wie „Prüfung garantiert bestanden“. Keine IHK-Aufgaben, keine IHK-Logos oder Zulassungsbehauptungen.",
    "- Keine anderen Zahlen als die oben genannten. Sprich Lernende nicht direkt an (kein „du“, „dein“, „lerne“).",
    "- Deutsch, kurz, konkret, keine Emojis.",
    'Antworte nur mit JSON: {"linkedin": "…", "website": "…", "email": "…"}. LinkedIn bis 900 Zeichen, Website bis 400 Zeichen, E-Mail mit Betreff in der ersten Zeile.',
  ].join("\n");
}

export function kostenEur(modell, tokensIn, tokensOut) {
  const p = PREISE[modell];
  if (!p) throw new Error(`Preis für ${modell} unbekannt`);
  return ((tokensIn * p.in + tokensOut * p.out) / 1e6) * USD_EUR;
}

/** Zeile für `werbemittel`. Status immer `wartet_auf_freigabe`. */
/** @param {{ kanal: string, text: string, fakten: any, modell: string, kosten: number, runUrl?: string | null }} p */
export function werbemittelZeile({ kanal, text, fakten, modell, kosten, runUrl }) {
  const k = KANAELE[kanal];
  if (!k) throw new Error(`Kanal unbekannt: ${kanal}`);
  return {
    produkt: fakten.kurs,
    art: k.art,
    status: STATUS_NEU,
    text_inhalt: text,
    modell,
    kosten_eur: Math.round(kosten * 10000) / 10000,
    fakten,
    mit_ki: true,
    mit_ton: false,
    run_url: runUrl ?? null,
  };
}

/**
 * `schreibe(modell, prompt)` liefert { text, tokensIn, tokensOut }. Standardmodell zuerst; besteht ein Kanal die
 * Prüfung nicht, einmal mit dem stärkeren Modell, solange der Deckel hält. Verworfene Texte kommen nie zurück.
 */
export async function erzeuge({ fakten, schreibe, deckel = DECKEL_EUR }) {
  let kosten = 0;
  let verworfen = [];
  for (const modell of [MODELL_STANDARD, MODELL_STARK]) {
    const r = await schreibe(modell, promptBauen(fakten));
    kosten += kostenEur(modell, r.tokensIn, r.tokensOut);
    let json;
    try {
      json = JSON.parse(String(r.text).replace(/^```(?:json)?|```$/gm, "").trim());
    } catch {
      verworfen = [{ kanal: "alle", fehler: ["keine gültige JSON-Antwort"] }];
      if (kosten >= deckel) break;
      continue;
    }
    verworfen = [];
    const texte = {};
    for (const kanal of Object.keys(KANAELE)) {
      const fehler = pruefeText(json[kanal], fakten);
      if (fehler.length) verworfen.push({ kanal, fehler });
      else texte[kanal] = json[kanal];
    }
    if (!verworfen.length) return { texte, modell, kosten, verworfen };
    if (kosten >= deckel) break;
  }
  return { texte: {}, modell: null, kosten, verworfen };
}

function rest(env) {
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.");
  const auth = { Authorization: `Bearer ${key}`, apikey: key };
  return async (pfad, opt = {}) => {
    const res = await fetch(`${url}/rest/v1/${pfad}`, { ...opt, headers: { ...auth, "Content-Type": "application/json", ...opt.headers } });
    if (!res.ok) throw new Error(`${pfad.split("?")[0]}: HTTP ${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 200)}`);
    return opt.method === "POST" ? null : res.json();
  };
}

/** Liest den veröffentlichten Kurs mit Einheiten, Quellen, Fragen. Nur Status `published`. */
export async function ladeFakten(env, keyword) {
  const q = rest(env);
  const kw = encodeURIComponent(keyword);
  const sel = "select=id,keyword,status,lernfeld";
  let kurse = await q(`courses?status=eq.published&keyword=eq.${kw}&order=updated_at.desc&limit=1&${sel}`);
  if (!kurse.length) {
    kurse = await q(`courses?status=eq.published&keyword=ilike.*${kw}*&order=updated_at.desc&limit=2&${sel}`);
    if (kurse.length > 1) throw new Error(`Stichwort „${keyword}“ ist mehrdeutig, bitte den genauen Kursnamen angeben.`);
  }
  if (!kurse.length) throw new Error(`Kein veröffentlichter Kurs zu „${keyword}“.`);
  const id = kurse[0].id;
  const [units, sources, fragen] = await Promise.all([
    q(`units?course_id=eq.${id}&select=id,minutes`),
    q(`sources?course_id=eq.${id}&select=id`),
    q(`questions?course_id=eq.${id}&select=id`),
  ]);
  return faktenAus({ kurs: kurse[0], units, sources, fragen: fragen.length });
}

export async function speichere(env, zeilen) {
  await rest(env)("werbemittel", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(zeilen) });
}

export async function claudeSchreiben(modell, prompt, env = process.env) {
  const key = env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY fehlt.");
  const headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  if (env.ANTHROPIC_WORKSPACE_ID?.trim()) headers["anthropic-workspace-id"] = env.ANTHROPIC_WORKSPACE_ID.trim();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({ model: modell, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic: HTTP ${res.status}`);
  const j = await res.json();
  return { text: j.content?.map((c) => c.text ?? "").join("") ?? "", tokensIn: j.usage?.input_tokens ?? 0, tokensOut: j.usage?.output_tokens ?? 0 };
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv) {
  if (argv[0] !== "lauf") {
    console.error("Befehl: lauf --keyword <Kurs> [--trocken]");
    process.exit(2);
  }
  const env = process.env;
  const fakten = await ladeFakten(env, arg(argv, "keyword") ?? "MAF");
  console.log(`Fakten: ${JSON.stringify(fakten)}`);
  const r = await erzeuge({ fakten, schreibe: (m, p) => claudeSchreiben(m, p, env) });
  console.log(`Modell ${r.modell ?? "-"}, Kosten ${r.kosten.toFixed(4)} €, verworfen: ${JSON.stringify(r.verworfen)}`);
  const kanaele = Object.keys(r.texte);
  if (kanaele.length < 3) {
    console.error("Nicht alle 3 Varianten haben die Prüfung bestanden; nichts gespeichert.");
    process.exit(1);
  }
  const runUrl = env.GITHUB_SERVER_URL && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null;
  const zeilen = kanaele.map((k) => werbemittelZeile({ kanal: k, text: r.texte[k], fakten, modell: r.modell, kosten: r.kosten / 3, runUrl }));
  if (argv.includes("--trocken")) console.log(JSON.stringify(zeilen, null, 2));
  else await speichere(env, zeilen);
  console.log(`${zeilen.length} Varianten, Status ${STATUS_NEU}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
