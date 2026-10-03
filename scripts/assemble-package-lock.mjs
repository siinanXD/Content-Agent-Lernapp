#!/usr/bin/env node
/**
 * Reassemble package-lock.json from scripts/ap17-lock-chunks/ (AP-17).
 * Needed when the full lockfile cannot be pushed in one MCP payload.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chunkDir = join(root, "scripts", "ap17-lock-chunks");
const manifestPath = join(chunkDir, "MANIFEST");
const outPath = join(root, "package-lock.json");

if (!existsSync(manifestPath)) {
  console.error("missing", manifestPath);
  process.exit(1);
}

const names = readFileSync(manifestPath, "utf8")
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const body = names.map((n) => readFileSync(join(chunkDir, n), "utf8")).join("");
writeFileSync(outPath, body);
console.log(`assembled package-lock.json (${body.length} bytes) from ${names.length} chunks`);
