// Bildvergleich nur bei Oberflächen-Änderung (SIN-648): src/app, src/components, Styles, public, Visual-Test.
// Aufruf: node scripts/autonomy/visual-scope.mjs <basis-ref>  -> schreibt `relevant=true|false` nach $GITHUB_OUTPUT.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const OBERFLAECHE = [
  /^src\/(app|components)\//,
  /\.(css|scss)$/,
  /^public\//,
  /^(visual\/|playwright\.visual\.config\.ts$|e2e\/routes\.ts$|package(-lock)?\.json$|next\.config\.|\.github\/workflows\/visual\.yml$)/,
];

export function betrifftOberflaeche(dateien) {
  return dateien.some((d) => OBERFLAECHE.some((re) => re.test(d)));
}

if (process.argv[1]?.endsWith("visual-scope.mjs")) {
  const basis = process.argv[2] ?? "origin/main";
  const dateien = execFileSync("git", ["diff", "--name-only", `${basis}...HEAD`], { encoding: "utf8" }).split("\n").filter(Boolean);
  const relevant = betrifftOberflaeche(dateien);
  console.log(`Bildvergleich relevant: ${relevant} (${dateien.length} Dateien geändert)`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `relevant=${relevant}\n`);
}
