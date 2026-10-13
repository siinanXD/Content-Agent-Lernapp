/**
 * Video-Agent (SIN-485): KI-Werbeclips über die Higgsfield-API, Deckel 5 € pro Produkt und Lauf.
 * Befehle:
 *   node scripts/autonomy/werbeclip.mjs plan    Trockenlauf: geplante Clips und Kostenschätzung, kein API-Aufruf
 *   node scripts/autonomy/werbeclip.mjs lauf    bezahlter Lauf (braucht HIGGSFIELD_KEY_ID, HIGGSFIELD_KEY_SECRET, Supabase-Zugang, ffmpeg und belegte Konfig; Workflow werbeclip.yml)
 * Konfig: docs/autonomy/higgsfield.json. Ergebnis wird mit Status `wartet_auf_freigabe` gespeichert, nie veröffentlicht.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { STATUS_NEU, registrieren, storagePfad } from "./video.mjs";

export const EUR_PER_USD = 20 / 21.5; // wie src/lib/quality/cost-guard.ts
export const DECKEL_EUR = 5;
export const KENNZEICHNUNG = "Mit KI erstellt";

/** Produktdaten der Lern-App (Name, Nutzen, Zielgruppe). */
export const PRODUKT = {
  name: "Lern-App",
  nutzen: "Prüfungsvorbereitung mit Lerneinheiten und Übungsfragen zu amtlichen Quellen",
  zielgruppe: "Bildungsträger",
};

export class ProduktDeckelError extends Error {
  constructor(geplantEur, deckelEur) {
    super(`Produkt-Deckel: €${geplantEur.toFixed(2)} würde €${deckelEur.toFixed(2)} überschreiten`);
    this.name = "ProduktDeckelError";
  }
}

/** Wirft, wenn der nächste bezahlte Aufruf den Deckel überschreiten würde (vor jedem Aufruf). */
export function assertWithinProductCap(ausgegebenEur, naechsterAufrufEur, deckelEur = DECKEL_EUR) {
  if (ausgegebenEur + naechsterAufrufEur > deckelEur + 1e-9) throw new ProduktDeckelError(ausgegebenEur + naechsterAufrufEur, deckelEur);
}

/** Prompt aus Produktdaten: keine Personen, keine fremden Marken, kein Text im Bild. */
export function promptAus(p = PRODUKT) {
  return `Ruhiger Werbeclip für "${p.name}": ${p.nutzen}. Zielgruppe: ${p.zielgruppe}. Zeige abstrakte Lernmotive (Papierstapel, Notizen, Lichtwechsel auf einem Schreibtisch), orange und weiße Farbstimmung. Keine Personen, keine Gesichter, keine Logos oder Marken, kein Text im Bild.`;
}

export function kostenEur(stufe, sekunden) {
  if (!Number.isFinite(stufe?.preisProSekundeUsd)) return null;
  return Math.round(stufe.preisProSekundeUsd * sekunden * EUR_PER_USD * 10000) / 10000;
}

/** Geplante Clips: n Entwürfe, dann ein finaler Clip. `luecken` nennt fehlende Belege der Konfig. */
export function plane(cfg, p = PRODUKT) {
  const prompt = promptAus(p);
  const clips = [];
  for (let i = 1; i <= cfg.entwuerfe; i++) {
    clips.push({ stufe: "entwurf", nr: i, modell: cfg.stufen.entwurf.modell, sekunden: cfg.sekundenEntwurf, prompt, eur: kostenEur(cfg.stufen.entwurf, cfg.sekundenEntwurf) });
  }
  clips.push({ stufe: "final", nr: 1, modell: cfg.stufen.final.modell, sekunden: cfg.sekundenFinal, prompt, eur: kostenEur(cfg.stufen.final, cfg.sekundenFinal) });
  const luecken = [];
  for (const k of ["basisUrl", "pfadErzeugen", "pfadStatus"]) if (!cfg[k]) luecken.push(k);
  for (const s of ["entwurf", "final"]) {
    for (const k of ["modell", "preisProSekundeUsd", "nutzungsrechteWerbung"]) if (cfg.stufen[s][k] == null) luecken.push(`stufen.${s}.${k}`);
  }
  const deckelEur = cfg.deckelEur ?? DECKEL_EUR;
  const summeEur = clips.every((c) => c.eur != null) ? Math.round(clips.reduce((a, c) => a + c.eur, 0) * 100) / 100 : null;
  return { clips, summeEur, deckelEur, ueberDeckel: summeEur != null && summeEur > deckelEur, luecken };
}

export function planText(plan) {
  const z = plan.clips.map((c) => `- ${c.stufe} ${c.nr}: ${c.modell ?? "Modell nicht belegt"}, ${c.sekunden} s, ${c.eur == null ? "Preis nicht belegt" : `${c.eur.toFixed(2)} €`}`);
  z.push(plan.summeEur == null ? "Schätzung: nicht möglich, Preise fehlen" : `Schätzung: ${plan.summeEur.toFixed(2)} € (Deckel ${plan.deckelEur} €${plan.ueberDeckel ? ", ÜBER DECKEL" : ""})`);
  if (plan.luecken.length) z.push(`Nicht belegt: ${plan.luecken.join(", ")}`);
  return z.join("\n");
}

/**
 * Bezahlter Lauf. `erzeugen(clip)` ruft die API und liefert `{ url, bewertung }` (Injektion für Tests).
 * Deckel wird vor jedem Aufruf geprüft; die Endstufe bleibt dabei immer bezahlbar.
 * Der beste Entwurf (höchste Bewertung) geht einmal in die Endstufe.
 */
export async function lauf({ cfg, erzeugen, p = PRODUKT }) {
  const plan = plane(cfg, p);
  if (plan.luecken.length) throw new Error(`Konfig nicht belegt (${plan.luecken.join(", ")}), kein bezahlter Aufruf.`);
  const final = plan.clips.find((c) => c.stufe === "final");
  let ausgegeben = 0;
  const ergebnisse = [];
  for (const clip of plan.clips.filter((c) => c.stufe === "entwurf")) {
    assertWithinProductCap(ausgegeben, clip.eur + final.eur, plan.deckelEur);
    const r = await erzeugen(clip);
    ausgegeben += clip.eur;
    ergebnisse.push({ clip, ...r });
  }
  const bester = ergebnisse.reduce((a, b) => ((b.bewertung ?? 0) > (a.bewertung ?? 0) ? b : a));
  assertWithinProductCap(ausgegeben, final.eur, plan.deckelEur);
  const fin = await erzeugen({ ...final, referenz: bester.url });
  ausgegeben += final.eur;
  return { ausgegebenEur: Math.round(ausgegeben * 100) / 100, final: { clip: final, ...fin } };
}

/** Wartezeiten der Statusabfrage in Sekunden (Annahme: wachsender Abstand; die Seite „polling“ war im Worker nicht abrufbar). */
export const BACKOFF_SEKUNDEN = [2, 3, 5, 8, 10, 15, 20, 30];
export const MAX_WARTEN_SEKUNDEN = 15 * 60;

export class ClipFehler extends Error {
  constructor(status, requestId) {
    super(`Higgsfield-Clip ${requestId ?? ""} endete mit Status ${status} (laut FAQ nicht berechnet).`);
    this.name = "ClipFehler";
    this.status = status;
  }
}

/** Header laut Docs: `Authorization: Key <KEY_ID>:<KEY_SECRET>`. */
export function authHeader(env) {
  const id = env.HIGGSFIELD_KEY_ID?.trim();
  const secret = env.HIGGSFIELD_KEY_SECRET?.trim();
  if (!id || !secret) throw new Error("HIGGSFIELD_KEY_ID oder HIGGSFIELD_KEY_SECRET fehlt.");
  return `Key ${id}:${secret}`;
}

async function json(res, was) {
  if (!res.ok) throw new Error(`${was}: HTTP ${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 200)}`);
  return res.json();
}

/**
 * Ein Clip: POST, Status bis `completed`, dann `video.url`. `failed`/`nsfw` -> ClipFehler.
 * `idempotenzKey` ist je Clip stabil, damit ein Wiederholen nicht doppelt berechnet wird.
 */
export async function erzeugeClip({ cfg, clip, auth, idempotenzKey, fetchImpl = fetch, warte = (s) => new Promise((r) => setTimeout(r, s * 1000)) }) {
  const body = { ...cfg.stufen[clip.stufe].parameter, prompt: clip.prompt };
  const start = await json(
    await fetchImpl(`${cfg.basisUrl}/${clip.modell}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", "Idempotency-Key": idempotenzKey },
      body: JSON.stringify(body),
    }),
    "Higgsfield erzeugen",
  );
  const statusUrl = start.status_url ?? `${cfg.basisUrl}${cfg.pfadStatus.replace("{request_id}", start.request_id)}`;
  let gewartet = 0;
  for (let i = 0; ; i++) {
    const r = await json(await fetchImpl(statusUrl, { headers: { Authorization: auth } }), "Higgsfield Status");
    if (r.status === "completed") {
      if (!r.video?.url) throw new Error("Higgsfield: completed ohne video.url.");
      return { url: r.video.url, requestId: start.request_id };
    }
    if (r.status === "failed" || r.status === "nsfw") throw new ClipFehler(r.status, start.request_id);
    const s = BACKOFF_SEKUNDEN[Math.min(i, BACKOFF_SEKUNDEN.length - 1)];
    if (gewartet + s > MAX_WARTEN_SEKUNDEN) throw new Error(`Higgsfield: nach ${gewartet} s noch nicht fertig (Status ${r.status}).`);
    await warte(s);
    gewartet += s;
  }
}

/** Lädt das Ergebnis herunter (Higgsfield hält Ausgaben nur mindestens 7 Tage). */
export async function ladeHerunter(url, fetchImpl = fetch) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Download: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Zeile für `werbemittel`: Status wartet_auf_freigabe, KI-Kennzeichnung, Kosten. */
/** @param {{ produkt: string, pfad: string, sekunden: number, modell: string, kosten: number, runUrl?: string | null }} p */
export function werbeclipZeile({ produkt, pfad, sekunden, modell, kosten, runUrl }) {
  return {
    produkt,
    art: "werbeclip",
    status: STATUS_NEU,
    storage_pfad: pfad,
    dauer_sekunden: sekunden,
    klickweg: [],
    mit_ki: true,
    mit_ton: false,
    kosten_eur: Math.round(kosten * 100) / 100,
    modell,
    ki_kennzeichnung: KENNZEICHNUNG,
    run_url: runUrl ?? null,
  };
}

async function main(argv) {
  const cfg = JSON.parse(readFileSync(new URL("../../docs/autonomy/higgsfield.json", import.meta.url), "utf8"));
  const plan = plane(cfg);
  if (argv[0] === "plan") {
    console.log(planText(plan));
  } else if (argv[0] === "lauf") {
    const env = process.env;
    if (plan.luecken.length) throw new Error(`Konfig nicht belegt: ${plan.luecken.join(", ")}`);
    const auth = authHeader(env);
    const lauf_id = env.GITHUB_RUN_ID ?? String(Date.now());
    mkdirSync("video-ergebnis", { recursive: true });
    const ergebnis = await lauf({
      cfg,
      erzeugen: async (clip) => {
        const r = await erzeugeClip({ cfg, clip, auth, idempotenzKey: `werbeclip-${lauf_id}-${clip.stufe}-${clip.nr}` });
        const datei = `video-ergebnis/${clip.stufe}-${clip.nr}.mp4`;
        writeFileSync(datei, await ladeHerunter(r.url));
        return { url: r.url, datei };
      },
    });
    const mitHinweis = "video-ergebnis/werbeclip.mp4";
    execFileSync("node", ["video/schnitt/render.mjs", "--werbeclip", ergebnis.final.datei, mitHinweis], { stdio: "inherit", env: { ...env, WERBECLIP_SEKUNDEN: String(cfg.sekundenFinal) } });
    const produkt = "lern-app";
    const zeile = werbeclipZeile({
      produkt,
      pfad: storagePfad(`${produkt}-werbeclip`, env.GITHUB_SHA),
      sekunden: cfg.sekundenFinal,
      modell: ergebnis.final.clip.modell,
      kosten: ergebnis.ausgegebenEur,
      runUrl: env.GITHUB_SERVER_URL && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null,
    });
    await registrieren({ env, mp4: readFileSync(mitHinweis), zeile });
    console.log(`Gespeichert: ${zeile.storage_pfad}, ${zeile.kosten_eur} € (mit open.higgsfield.ai/analytics abgleichen), Status ${zeile.status}.`);
  } else {
    console.error("Befehl: plan | lauf");
    process.exit(2);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
