#!/usr/bin/env node
/**
 * Reassemble package-lock.json from gzip+base64 chunks (AP-17).
 * Run: npm run lock:assemble
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
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

const b64 = names.map((n) => readFileSync(join(chunkDir, n), "utf8")).join("");
const gz = Buffer.from(b64, "base64");
const body = gunzipSync(gz);
writeFileSync(outPath, body);
console.log(
  `assembled package-lock.json (${body.length} bytes) from ${names.length} gzip chunks`,
);
