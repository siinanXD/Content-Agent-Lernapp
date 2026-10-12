/**
 * Video-Agent (SIN-483): Hilfen für `video.yml`. Aufnahme (Playwright) und Schnitt (Revideo) liegen in `video/`.
 * Befehle:
 *   node scripts/autonomy/video.mjs limit --runs <json>            höchstens 1 Lauf pro Tag (UTC), Exit 3 = heute schon gelaufen
 *   node scripts/autonomy/video.mjs pruefen --dauer <sek>          Video unter 90 Sekunden, sonst Exit 1
 *   node scripts/autonomy/video.mjs standbilder --klickweg <json> --mp4 <datei> --out <ordner>
 *       zieht aus dem fertigen MP4 je Schritt ein Standbild (ffmpeg), Artefakt `video-standbilder` (SIN-522)
 *   node scripts/autonomy/video.mjs registrieren --mp4 <datei> --klickweg <json> --dauer <sek> [--produkt <name>]
 *       lädt das MP4 in Supabase Storage (Bucket `werbemittel`) und legt eine Zeile `werbemittel` mit Status
 *       `wartet_auf_freigabe` an. Veröffentlicht wird nie von hier aus.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const MAX_DAUER_SEKUNDEN = 90;
export const BUCKET = "werbemittel";
export const STATUS_NEU = "wartet_auf_freigabe";

/** Länge in Sekunden als Zahl, sonst Fehler. */
export function pruefeDauer(sekunden, max = MAX_DAUER_SEKUNDEN) {
  const s = Number(sekunden);
  if (!Number.isFinite(s) || s <= 0) throw new Error(`Videolänge ungültig: ${sekunden}`);
  if (s >= max) throw new Error(`Video ist ${s.toFixed(1)} s lang, erlaubt sind unter ${max} s.`);
  return s;
}

export const INTRO_SEKUNDEN = 3; // gleich wie INTRO in video/schnitt/szene.tsx

/** Zeitpunkt je Schritt im fertigen Video: Titel (3 s) + Start im Klickweg + 1 s, damit die Einblendung steht. */
export function standbildZeiten(schritte, intro = INTRO_SEKUNDEN, versatz = 1) {
  return schritte.map((s, i) => ({
    datei: `schritt-${String(i + 1).padStart(2, "0")}-${String(s.id ?? "x").replace(/[^a-z0-9]+/gi, "-")}.png`,
    sekunde: Math.round((intro + Number(s.startMs) / 1000 + versatz) * 10) / 10,
  }));
}

/**
 * Höchstens 1 Lauf pro Tag: `runs` sind frühere Läufe von video.yml (`created_at`, `conclusion`, `id`).
 * Gescheiterte Läufe zählen nicht; der eigene Lauf (`ownId`) auch nicht.
 */
/** @param {{ id?: unknown, created_at?: string, conclusion?: string | null }[]} runs @param {Date} [now] @param {unknown} [ownId] */
export function heuteSchonGelaufen(runs, now = new Date(), ownId = null) {
  const tag = now.toISOString().slice(0, 10);
  return runs.some(
    (r) => String(r.id) !== String(ownId) && String(r.created_at ?? "").slice(0, 10) === tag && ["success", null, undefined, ""].includes(r.conclusion),
  );
}

/** Pfad im Bucket: `<produkt>/<datum>-<sha7>.mp4`. Nur Kleinbuchstaben, Ziffern, Bindestrich. */
export function storagePfad(produkt, sha, now = new Date()) {
  const slug = String(produkt).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "produkt";
  return `${slug}/${now.toISOString().slice(0, 10)}-${String(sha || "lokal").slice(0, 7)}.mp4`;
}

/** Zeile für die Tabelle `werbemittel`. Status ist immer `wartet_auf_freigabe`. */
/** @param {{ produkt: string, pfad: string, dauer: unknown, klickweg: any, sha?: string | null, runUrl?: string | null, quelleUrl?: string | null }} p */
export function werbemittelZeile({ produkt, pfad, dauer, klickweg, sha, runUrl, quelleUrl }) {
  return {
    produkt,
    art: "tutorial_video",
    status: STATUS_NEU,
    storage_pfad: pfad,
    dauer_sekunden: Math.round(pruefeDauer(dauer) * 10) / 10,
    klickweg: (klickweg?.schritte ?? klickweg ?? []).map((s) => ({ id: s.id, titel: s.titel, text: s.text, startMs: s.startMs ?? null })),
    mit_ki: true,
    mit_ton: false,
    quelle_url: quelleUrl ?? null,
    commit_sha: sha ?? null,
    run_url: runUrl ?? null,
  };
}

async function pruefeAntwort(res, was) {
  if (res.ok) return;
  const text = (await res.text()).replace(/\s+/g, " ").slice(0, 200);
  throw new Error(`${was}: HTTP ${res.status} ${text}`);
}

/** Lädt Datei und Zeile hoch. `fetchImpl` ist für Tests austauschbar. */
export async function registrieren({ env, mp4, zeile, fetchImpl = fetch }) {
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.");
  const auth = { Authorization: `Bearer ${key}`, apikey: key };
  const up = await fetchImpl(`${url}/storage/v1/object/${BUCKET}/${zeile.storage_pfad}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "video/mp4", "x-upsert": "true" },
    body: mp4,
  });
  await pruefeAntwort(up, "Storage-Upload");
  const ins = await fetchImpl(`${url}/rest/v1/werbemittel`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(zeile),
  });
  await pruefeAntwort(ins, "Tabelle werbemittel");
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv) {
  const [cmd] = argv;
  if (cmd === "limit") {
    const runs = JSON.parse(arg(argv, "runs") ?? "[]");
    if (heuteSchonGelaufen(runs, new Date(), process.env.GITHUB_RUN_ID)) {
      console.log("Heute lief schon ein Video-Lauf (höchstens 1 pro Tag).");
      process.exit(3);
    }
    console.log("Heute noch kein Video-Lauf.");
  } else if (cmd === "pruefen") {
    console.log(`Länge ok: ${pruefeDauer(arg(argv, "dauer")).toFixed(1)} s (unter ${MAX_DAUER_SEKUNDEN} s).`);
  } else if (cmd === "standbilder") {
    const klickweg = JSON.parse(readFileSync(arg(argv, "klickweg"), "utf8"));
    const out = arg(argv, "out");
    mkdirSync(out, { recursive: true });
    for (const { datei, sekunde } of standbildZeiten(klickweg.schritte)) {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(sekunde), "-i", arg(argv, "mp4"), "-frames:v", "1", `${out}/${datei}`]);
      console.log(`Standbild ${datei} bei ${sekunde} s`);
    }
  } else if (cmd === "registrieren") {
    const env = process.env;
    const produkt = arg(argv, "produkt") ?? "lern-app";
    const dauer = arg(argv, "dauer");
    const klickweg = JSON.parse(readFileSync(arg(argv, "klickweg"), "utf8"));
    const zeile = werbemittelZeile({
      produkt,
      pfad: storagePfad(produkt, env.GITHUB_SHA),
      dauer,
      klickweg,
      sha: env.GITHUB_SHA,
      runUrl: env.GITHUB_SERVER_URL && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null,
      quelleUrl: env.LIVE_URL,
    });
    await registrieren({ env, mp4: readFileSync(arg(argv, "mp4")), zeile });
    console.log(`Gespeichert: ${zeile.storage_pfad} (${zeile.dauer_sekunden} s), Status ${zeile.status}.`);
  } else {
    console.error("Befehl: limit | pruefen | standbilder | registrieren");
    process.exit(2);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
