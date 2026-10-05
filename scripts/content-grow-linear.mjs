#!/usr/bin/env node
/**
 * AP-23 / SIN-220: Lauf-Zusammenfassung als Kommentar ins Linear-Projekt.
 * Usage: node scripts/content-grow-linear.mjs content-run-summary.md
 * Env: LINEAR_API_KEY, optional CONTENT_RUN_ISSUE (Standard SIN-220).
 * Fehlt der Key, wird nur gewarnt: der Bericht im PR ist die Quelle, Linear ist Komfort.
 */
import { readFileSync } from "node:fs";
import { comment, linear } from "./autonomy/linear.mjs";

const file = process.argv[2] ?? "content-run-summary.md";
if (!process.env.LINEAR_API_KEY) {
  console.warn("::warning::LINEAR_API_KEY fehlt — kein Linear-Kommentar");
  process.exit(0);
}
const identifier = process.env.CONTENT_RUN_ISSUE ?? "SIN-220";
const data = await linear(`query($id: String!) { issue(id: $id) { id } }`, { id: identifier });
await comment(data.issue.id, readFileSync(file, "utf8"));
console.log(`Kommentar an ${identifier} gepostet`);
