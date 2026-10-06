#!/usr/bin/env node
/**
 * Notbremse (SIN-294): berechnet den Wert der Repo-Variable AGENT_PAUSED_UNTIL für `loop-pause.yml`.
 *
 *   node scripts/autonomy/pause.mjs pausieren [Stunden]   → schreibt `until=<ISO-Zeit>` nach GITHUB_OUTPUT
 *   node scripts/autonomy/pause.mjs fortsetzen            → schreibt `until=` (leer: Pause aufgehoben)
 *
 * Dispatcher und Planer lesen die Variable über `budget.mjs` (isPaused); hier entsteht nur der Wert.
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DEFAULT_PAUSE_HOURS = 24;
/** Höchstens 30 Tage: ein Tippfehler legt den Loop nicht für immer lahm. */
export const MAX_PAUSE_HOURS = 24 * 30;

/**
 * @param {string} aktion "pausieren" | "fortsetzen"
 * @param {string|number|undefined} stunden nur bei "pausieren"; leer = 24
 * @returns {{ until: string }} until = ISO-Zeit oder "" (Pause aufheben)
 */
export function planPause(aktion, stunden, now = new Date()) {
  if (aktion === "fortsetzen") return { until: "" };
  if (aktion !== "pausieren") throw new Error(`Unbekannte Aktion „${aktion}“ (erlaubt: pausieren, fortsetzen)`);
  const raw = String(stunden ?? "").trim();
  const hours = raw === "" ? DEFAULT_PAUSE_HOURS : Number(raw.replace(",", "."));
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_PAUSE_HOURS) {
    throw new Error(`Dauer „${raw}“ ungültig: Stunden zwischen 0 und ${MAX_PAUSE_HOURS} angeben`);
  }
  return { until: new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString() };
}

function main(argv) {
  const [aktion, stunden] = argv;
  let result;
  try {
    result = planPause(aktion, stunden);
  } catch (e) {
    console.error(`::error::${e.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(result.until ? `Pause bis ${result.until}` : "Pause aufgehoben");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `until=${result.until}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
