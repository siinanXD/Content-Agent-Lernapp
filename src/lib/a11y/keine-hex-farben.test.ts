import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// SIN-271: Farben nur als Token (var(--color-*)), nie als Hex in Seiten und Komponenten.
// globals.css ist die einzige Stelle, an der Token-Werte stehen; layout.tsx hält den
// Meta-Tag theme-color (kann kein CSS-Token lesen).
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const ERLAUBT = new Set([join("src", "app", "layout.tsx")]);

function dateien(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return dateien(p);
    return /\.(tsx|css)$/.test(e.name) && e.name !== "globals.css" ? [p] : [];
  });
}

test("keine Hex-Farben in src/app und src/components", () => {
  const funde = [...dateien(join("src", "app")), ...dateien(join("src", "components"))]
    .filter((p) => !ERLAUBT.has(p))
    .flatMap((p) =>
      readFileSync(p, "utf8")
        .split("\n")
        .flatMap((zeile, i) => (HEX.test(zeile) ? [`${p}:${i + 1}: ${zeile.trim()}`] : [])),
    );
  assert.deepEqual(funde, []);
});
