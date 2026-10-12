#!/usr/bin/env node
/**
 * Übergabe-Verträge (SIN-491): JSON-Schemas der Agenten-Ausgaben in `docs/autonomy/schemas/`, geprüft ohne neues Paket
 * (kleine Teilmenge von JSON Schema, wie `validateQuestion`). Unterstützt: type, enum, const, required, properties,
 * additionalProperties, items, minItems, maxItems, minLength, minimum, pattern, anyOf.
 *
 *   node scripts/autonomy/vertraege.mjs            prüft alle Berichte im Repo (CI-Schritt)
 *   node scripts/autonomy/vertraege.mjs <datei>…   prüft nur diese Dateien
 *
 * Ein Bericht trägt das Feld `schema` (Pfad zur Schema-Datei; nur der Dateiname zählt). Geprüft werden alle `*.json`
 * in `docs/research/` und `docs/berichte/` mit diesem Feld sowie die Beispiele in `docs/autonomy/schemas/beispiele/`.
 * In `docs/berichte/` und bei den Beispielen ist das Feld Pflicht.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

export const SCHEMA_DIR = "docs/autonomy/schemas";
const BERICHT_DIRS = [
  { dir: "docs/research", pflicht: false },
  { dir: "docs/berichte", pflicht: true },
  { dir: `${SCHEMA_DIR}/beispiele`, pflicht: true },
];

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const isType = (v, t) => typeOf(v) === t || (t === "number" && typeOf(v) === "integer");

/** Prüft `value` gegen `schema`. Liefert die Liste der Fehler (leer = gültig). */
export function validate(schema, value, path = "$") {
  const errors = [];
  if (schema.anyOf) {
    const all = schema.anyOf.map((s) => validate(s, value, path));
    if (!all.some((e) => e.length === 0)) errors.push(`${path}: passt zu keiner Variante`);
    return errors;
  }
  if ("const" in schema && value !== schema.const) errors.push(`${path}: erwartet ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} nicht erlaubt (${schema.enum.join(", ")})`);
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => isType(value, t))) {
      errors.push(`${path}: Typ ${typeOf(value)}, erwartet ${types.join(" | ")}`);
      return errors;
    }
  }
  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${path}: leer oder zu kurz`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: Format falsch (${schema.pattern})`);
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: ${value} < ${schema.minimum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${path}: weniger als ${schema.minItems} Einträge`);
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(`${path}: mehr als ${schema.maxItems} Einträge`);
    if (schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, `${path}[${i}]`)));
  }
  if (typeOf(value) === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${path}.${k}: fehlt`);
    const props = schema.properties ?? {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) errors.push(...validate(props[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) errors.push(`${path}.${k}: unbekanntes Feld`);
    }
  }
  return errors;
}

export function loadSchema(name, dir = SCHEMA_DIR) {
  const file = join(dir, name.endsWith(".schema.json") ? name : `${name}.schema.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Prüft einen Bericht (geparstes JSON) gegen das Schema aus seinem Feld `schema`. */
export function validateReport(report, dir = SCHEMA_DIR) {
  if (typeof report?.schema !== "string") return ["$.schema: fehlt (Pfad zur *.schema.json)"];
  const schema = loadSchema(basename(report.schema), dir);
  if (!schema) return [`$.schema: Schema „${basename(report.schema)}“ existiert nicht in ${dir}`];
  return validate(schema, report);
}

/** Alle Berichtsdateien, die zu prüfen sind. */
export function findReports(dirs = BERICHT_DIRS) {
  const out = [];
  for (const { dir, pflicht } of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) out.push({ file: join(dir, f), pflicht });
  }
  return out;
}

export function checkFiles(files) {
  const problems = [];
  for (const { file, pflicht } of files) {
    let json;
    try {
      json = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      problems.push(`${file}: kein gültiges JSON (${e.message})`);
      continue;
    }
    if (!pflicht && typeof json?.schema !== "string") continue;
    for (const e of validateReport(json)) problems.push(`${file}: ${e}`);
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const files = args.length ? args.map((file) => ({ file, pflicht: true })) : findReports();
  const problems = checkFiles(files);
  for (const p of problems) console.log(`::error::${p}`);
  if (problems.length) {
    console.log(`${problems.length} Verstoß/Verstöße gegen die Übergabe-Verträge (${SCHEMA_DIR}).`);
    process.exit(1);
  }
  console.log(`Übergabe-Verträge: ${files.length} Datei(en) geprüft, alle gültig.`);
}
