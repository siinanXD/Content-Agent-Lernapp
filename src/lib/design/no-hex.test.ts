import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// SIN-286: Farben im UI-Code nur als var(--color-*). Hex steht nur dort, wo ein Token
// definiert wird oder CSS-Variablen technisch nicht gelesen werden können.
const ALLOWED = new Set([
  "src/app/globals.css", // Token-Definitionen (Figma)
  "src/app/layout.tsx", // <meta name="theme-color"> kann kein CSS-Token lesen
  "src/lib/content/images.ts", // generierte SVG-Bilder: eigenständige Dateien ohne Seiten-CSS
]);
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(tsx?|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

test("keine Hex-Farben in src/app, src/components und src/lib/learner", () => {
  const hits: string[] = [];
  for (const root of ["src/app", "src/components", "src/lib/learner"]) {
    for (const file of files(root)) {
      if (ALLOWED.has(file)) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (HEX.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
  }
  assert.deepEqual(hits, []);
});
