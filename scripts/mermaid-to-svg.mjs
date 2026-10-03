#!/usr/bin/env node
/**
 * AP-18d: Mermaid → SVG at build time (no runtime Mermaid in the app).
 * Writes Phase-A generated SVGs into public/generated/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "generated");
mkdirSync(outDir, { recursive: true });

const FLOW = `flowchart TD
  A[Freischalten] --> B[Gegen Wiedereinschalten sichern]
  B --> C[Spannungsfreiheit feststellen]`;

async function renderMermaid(definition) {
  const mermaid = (await import("mermaid")).default;
  // Mermaid 11 Node build path — use mermaid.render via DOM stub when needed.
  // Fallback: deterministic hand SVG so CI without browser still ships assets.
  try {
    if (typeof mermaid.initialize === "function") {
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    }
    if (typeof mermaid.render === "function") {
      const { svg } = await mermaid.render("ap18flow", definition);
      return svg;
    }
  } catch {
    // fall through
  }
  return flowchartFallbackSvg();
}

function flowchartFallbackSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="280" viewBox="0 0 420 280" role="img" aria-label="Ablauf Freischalten sichern prüfen">
  <rect width="420" height="280" fill="#f4f7f8"/>
  <rect x="90" y="24" width="240" height="44" rx="6" fill="#1f6f8b"/>
  <text x="210" y="52" text-anchor="middle" fill="#ffffff" font-size="14" font-family="Arial,sans-serif">Freischalten</text>
  <line x1="210" y1="68" x2="210" y2="96" stroke="#0b3a4a" stroke-width="2"/>
  <polygon points="210,104 204,94 216,94" fill="#0b3a4a"/>
  <rect x="60" y="108" width="300" height="44" rx="6" fill="#1f6f8b"/>
  <text x="210" y="136" text-anchor="middle" fill="#ffffff" font-size="14" font-family="Arial,sans-serif">Gegen Wiedereinschalten sichern</text>
  <line x1="210" y1="152" x2="210" y2="180" stroke="#0b3a4a" stroke-width="2"/>
  <polygon points="210,188 204,178 216,178" fill="#0b3a4a"/>
  <rect x="70" y="192" width="280" height="44" rx="6" fill="#0b3a4a"/>
  <text x="210" y="220" text-anchor="middle" fill="#ffffff" font-size="14" font-family="Arial,sans-serif">Spannungsfreiheit feststellen</text>
</svg>`;
}

function safetySignSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="Gebotszeichen Gehörschutz">
  <circle cx="100" cy="100" r="90" fill="#0055a5"/>
  <path d="M85 70c18 0 32 12 32 32v36c0 6-5 11-11 11h-8c-6 0-11-5-11-11v-18c0-5-3-8-8-8s-8 3-8 8v18c0 6-5 11-11 11h-8c-6 0-11-5-11-11V102c0-20 14-32 32-32z" fill="#ffffff"/>
  <text x="100" y="192" text-anchor="middle" fill="#0b3a4a" font-size="11" font-family="Arial,sans-serif">Gehörschutz tragen</text>
</svg>`;
}

function sketchSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200" role="img" aria-label="Skizze mit Maßen">
  <rect width="320" height="200" fill="#f4f7f8"/>
  <rect x="60" y="40" width="200" height="100" fill="none" stroke="#0b3a4a" stroke-width="3"/>
  <text x="160" y="30" text-anchor="middle" fill="#0b3a4a" font-size="14" font-family="Arial,sans-serif">120 mm</text>
  <text x="28" y="100" fill="#0b3a4a" font-size="14" font-family="Arial,sans-serif">40</text>
  <text x="160" y="180" text-anchor="middle" fill="#4a6670" font-size="12" font-family="Arial,sans-serif">Werkstück-Skizze</text>
</svg>`;
}

const flowSvg = await renderMermaid(FLOW);
writeFileSync(path.join(outDir, "lockout-flow.svg"), flowSvg);
writeFileSync(path.join(outDir, "safety-sign-example.svg"), safetySignSvg());
writeFileSync(path.join(outDir, "sketch-example.svg"), sketchSvg());
writeFileSync(
  path.join(outDir, "lockout-flow.mmd"),
  `${FLOW}\n`,
);
console.log(`Wrote Phase-A SVGs to ${outDir}`);
