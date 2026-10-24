#!/usr/bin/env node
/**
 * Vercel `ignoreCommand` (SIN-1043, Vorlage Leitstand SIN-1042): Vorschau-Builds nur bei UI-Änderungen.
 * Exit 0 = Build überspringen, Exit 1 = bauen. `main` baut immer; ist der Diff nicht lesbar, wird gebaut.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const UI_PFADE = [
  /^src\/(app|components)\//,
  /^public\//,
  /^content\//,
  /^package(-lock)?\.json$/,
  /^next\.config\./,
  /^vercel\.json$/,
  /\.css$/,
];

/** true = Build überspringen. `dateien` ist null, wenn der Diff nicht lesbar war. */
export function ueberspringen(branch, dateien) {
  if (branch === "main" || !Array.isArray(dateien)) return false;
  return !dateien.some((d) => UI_PFADE.some((re) => re.test(d)));
}

function geaenderteDateien(env) {
  try {
    const von = env.VERCEL_GIT_PREVIOUS_SHA || "HEAD^";
    const out = execFileSync("git", ["diff", "--name-only", von, "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\n").filter(Boolean);
  } catch {
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skip = ueberspringen(process.env.VERCEL_GIT_COMMIT_REF, geaenderteDateien(process.env));
  console.log(skip ? "Nur Nicht-UI-Dateien geändert: Build übersprungen." : "Build läuft.");
  process.exit(skip ? 0 : 1);
}
