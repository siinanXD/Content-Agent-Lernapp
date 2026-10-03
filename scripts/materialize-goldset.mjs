#!/usr/bin/env node
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const b64Path = path.join(root, "docs/quality/_restore/maf-goldset-phase-a.json.zlib.b64");
const dest = path.join(root, "docs/quality/maf-goldset-phase-a.json");
const b64 = fs.readFileSync(b64Path, "utf8").trim();
const out = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
fs.writeFileSync(dest, out);
const g = JSON.parse(out);
if (g.itemCount !== 90 || g.items.length !== 90) {
  console.error("unexpected goldset size", g.itemCount, g.items.length);
  process.exit(1);
}
console.log("materialized", dest, "itemCount", g.itemCount);
