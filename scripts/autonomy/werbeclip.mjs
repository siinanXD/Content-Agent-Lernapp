/**
 * Video-Agent (SIN-485): KI-Werbeclips über die Higgsfield-API, Deckel 5 € pro Produkt und Lauf.
 * Befehle:
 *   node scripts/autonomy/werbeclip.mjs plan    Trockenlauf: geplante Clips und Kostenschätzung, kein API-Aufruf
 *   node scripts/autonomy/werbeclip.mjs lauf    bezahlter Lauf (braucht HIGGSFIELD_API_KEY und belegte Konfig)
 * Konfig: docs/autonomy/higgsfield.json. Ergebnis wird mit Status `wartet_auf_freigabe` gespeichert, nie veröffentlicht.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { STATUS_NEU } from "./video.mjs";

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
    if (!process.env.HIGGSFIELD_API_KEY) throw new Error("HIGGSFIELD_API_KEY fehlt.");
    if (plan.luecken.length) throw new Error(`Konfig nicht belegt: ${plan.luecken.join(", ")}`);
    throw new Error("API-Aufruf noch nicht angebunden: Endpunkt-Schema erst aus docs.higgsfield.ai belegen.");
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
