/**
 * Phase-A image helpers (AP-18d): generated SVG only; license fields required.
 */

import { altTextOk, type UnitImage } from "@/lib/content/didaktik";

export const PHASE_A_LICENSE = "Generated-SVG";

export function assertPhaseAImage(image: UnitImage): string[] {
  const errors: string[] = [];
  if (!image.src.endsWith(".svg") && !image.src.startsWith("data:image/svg")) {
    errors.push("Phase A allows generated SVG only");
  }
  if (!altTextOk(image.alt)) {
    errors.push("alt must be 1–125 characters");
  }
  if (image.kind === "schema" && !image.longDescription?.trim()) {
    errors.push("schema images need longDescription");
  }
  if (!image.source?.license?.trim()) {
    errors.push("license required");
  }
  if (image.source.license !== PHASE_A_LICENSE && image.source.license !== "CC0") {
    // Phase A policy: Generated-SVG; CC0 reserved for later Commons phase.
    if (image.source.license !== PHASE_A_LICENSE) {
      errors.push(`Phase A license must be ${PHASE_A_LICENSE}`);
    }
  }
  return errors;
}

/** Minimal SVG sketch template (dimensions labelled). */
export function sketchSvg(opts: {
  widthLabel: string;
  heightLabel: string;
  title: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200" role="img" aria-label="${escapeXml(opts.title)}">
  <rect width="320" height="200" fill="#f4f7f8"/>
  <rect x="60" y="40" width="200" height="100" fill="none" stroke="#0b3a4a" stroke-width="3"/>
  <text x="160" y="30" text-anchor="middle" fill="#0b3a4a" font-size="14" font-family="Arial,sans-serif">${escapeXml(opts.widthLabel)}</text>
  <text x="40" y="95" text-anchor="middle" fill="#0b3a4a" font-size="14" font-family="Arial,sans-serif" transform="rotate(-90 40 95)">${escapeXml(opts.heightLabel)}</text>
  <text x="160" y="180" text-anchor="middle" fill="#4a6670" font-size="12" font-family="Arial,sans-serif">${escapeXml(opts.title)}</text>
</svg>`;
}

/** Minimal chart template (two bars). */
export function chartSvg(opts: {
  title: string;
  aLabel: string;
  aValue: number;
  bLabel: string;
  bValue: number;
}): string {
  const max = Math.max(opts.aValue, opts.bValue, 1);
  const hA = Math.round((opts.aValue / max) * 100);
  const hB = Math.round((opts.bValue / max) * 100);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220" role="img" aria-label="${escapeXml(opts.title)}">
  <rect width="320" height="220" fill="#f4f7f8"/>
  <text x="160" y="24" text-anchor="middle" fill="#0b3a4a" font-size="14" font-family="Arial,sans-serif">${escapeXml(opts.title)}</text>
  <rect x="70" y="${160 - hA}" width="60" height="${hA}" fill="#1f6f8b"/>
  <rect x="190" y="${160 - hB}" width="60" height="${hB}" fill="#0b3a4a"/>
  <text x="100" y="180" text-anchor="middle" fill="#0b3a4a" font-size="12" font-family="Arial,sans-serif">${escapeXml(opts.aLabel)}</text>
  <text x="220" y="180" text-anchor="middle" fill="#0b3a4a" font-size="12" font-family="Arial,sans-serif">${escapeXml(opts.bLabel)}</text>
  <text x="100" y="${150 - hA}" text-anchor="middle" fill="#0b3a4a" font-size="12" font-family="Arial,sans-serif">${opts.aValue}</text>
  <text x="220" y="${150 - hB}" text-anchor="middle" fill="#0b3a4a" font-size="12" font-family="Arial,sans-serif">${opts.bValue}</text>
</svg>`;
}

export function safetySignSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="Gebotszeichen Gehörschutz">
  <circle cx="100" cy="100" r="90" fill="#0055a5"/>
  <path d="M70 90c0-20 10-35 30-35s30 15 30 35v40c0 8-6 14-14 14h-6c-8 0-14-6-14-14v-20c0-6-4-10-10-10s-10 4-10 10v20c0 8-6 14-14 14h-6c-8 0-14-6-14-14V90z" fill="#ffffff" transform="translate(20,10) scale(0.85)"/>
  <text x="100" y="190" text-anchor="middle" fill="#0b3a4a" font-size="11" font-family="Arial,sans-serif">Gehörschutz tragen</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
