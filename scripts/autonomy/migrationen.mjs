#!/usr/bin/env node
/**
 * Migrations-Wächter (SIN-374): Dateien in supabase/migrations/ gegen die Datenbank vergleichen.
 *
 *   node scripts/autonomy/migrationen.mjs [--check]
 *
 * Eine Migration gilt als angewendet, wenn alle ihre Tabellen existieren oder (ohne `create table`) ihre Version in
 * `supabase_migrations.schema_migrations` steht (gleiche Regel wie `migrate` in run-task.mjs). `--check` endet mit 1,
 * wenn additive Migrationen fehlen (Production-Deploy wartet dann auf migrate.yml). Reine Funktionen + ein Netzaufruf.
 */
import { readdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fetchJson } from "./http.mjs";
import { MIGRATIONS_DIR, pendingMigrations } from "./run-task.mjs";

/** Altlast: zwei Dateien mit Version 20261006010000 (bereits in Production, Dateien dürfen nicht umbenannt werden). Neue Doppelte sind verboten. */
export const KNOWN_DUPLICATE_VERSIONS = ["20261006010000"];

export const versionOf = (name) => String(name).split("_")[0];

/** Versionen, die in mehr als einer Datei vorkommen (ohne bekannte Altlast). */
export function duplicateVersions(names, known = KNOWN_DUPLICATE_VERSIONS) {
  const seen = new Map();
  for (const n of names) seen.set(versionOf(n), (seen.get(versionOf(n)) ?? 0) + 1);
  return [...seen].filter(([v, c]) => c > 1 && !known.includes(v)).map(([v]) => v);
}

/** @param {{ name: string, sql: string }[]} files */
export function migrationStatus(files, { tables, versions }) {
  const pending = pendingMigrations(files, { tables, versions });
  const total = files.length;
  const applied = total - pending.length;
  return {
    total,
    applied,
    missing: pending.map((p) => p.name),
    additiveMissing: pending.filter((p) => p.additiv).map((p) => p.name),
    blockedMissing: pending.filter((p) => !p.additiv).map((p) => p.name),
    ok: pending.length === 0,
    line: pending.length
      ? `Migrationen: ${applied}/${total} angewendet, fehlen: ${pending.map((p) => p.name.replace(/\.sql$/, "")).join(", ")}`
      : `Migrationen: ${applied}/${total} angewendet`,
  };
}

export function readMigrationFiles(dir = MIGRATIONS_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(`${dir}/${name}`, "utf8") }));
}

/** Liest den Stand aus Supabase (Management-API). Fehlt ein Token oder schlägt es fehl: null (Status zeigt „nicht lesbar“). */
export async function collectMigrations(/** @type {Record<string, string | undefined>} */ env = process.env, { fetchImpl = fetch, files = readMigrationFiles() } = {}) {
  if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_PROJECT_REF) return null;
  const q = (query) =>
    fetchJson(
      "Supabase",
      `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
      { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) },
      { fetchImpl },
    );
  try {
    const tables = new Set((await q("select table_name from information_schema.tables where table_schema = 'public'")).map((r) => r.table_name));
    const versions = new Set(
      await q("select version from supabase_migrations.schema_migrations")
        .then((r) => r.map((x) => x.version))
        .catch(() => []),
    );
    return migrationStatus(files, { tables, versions });
  } catch (e) {
    console.log(`::warning::Migrationen nicht lesbar: ${e.message}`);
    return null;
  }
}

/** Sinan-Aufgabe für nicht additive Migrationen (SIN-451): sie werden nie automatisch angewandt. Ohne solche Dateien null. */
export function sinanTaskForMigrations(m) {
  if (!m?.blockedMissing?.length) return null;
  const names = m.blockedMissing.map((n) => n.replace(/\.sql$/, ""));
  return {
    titel: `Nicht additive Migration prüfen und anwenden: ${names.join(", ")}`,
    wo: "Supabase-Dashboard (SQL-Editor) und GitHub Actions",
    link: "https://supabase.com/dashboard",
    minuten: 15,
    schritte: [
      `Datei(en) unter supabase/migrations/ lesen: ${names.map((n) => `\`${n}.sql\``).join(", ")}. Sie enthalten drop, delete, truncate oder rename und werden nie automatisch angewandt.`,
      "Ist der Inhalt unkritisch: Sicherung prüfen (Actions → backup), dann das SQL im SQL-Editor in einer Transaktion ausführen.",
      "Danach in GitHub Actions den Workflow migrate per „Run workflow“ starten: er trägt die Version ein und wendet davon abhängige additive Migrationen an.",
    ],
    pruefung: `Der Wächter meldet „Migrationen: ${m.total}/${m.total} angewendet“. Du schließt das Issue danach selbst.`,
  };
}

/** Meldung für die Status-Seite: Vorfall und Bug-Issue, wenn Migrationen fehlen. Fehlen nur nicht additive Dateien: Sinan-Aufgabe statt Bug. */
export function migrationIncident(m) {
  if (!m || m.ok) return { incident: null, bug: null };
  const names = m.missing.join(", ");
  const nurSinan = !m.additiveMissing.length;
  return {
    incident: {
      key: `migrationen:${m.missing.join("|")}`,
      text: `Migrationen: ${m.applied}/${m.total} angewendet, es fehlen ${names}. ${nurSinan ? "Nicht additiv: Aufgabe für Sinan angelegt." : "Bug-Issue angelegt, Workflow migrate.yml prüfen."}`,
    },
    bug: nurSinan ? null : {
      lane: "backend",
      priority: 1,
      labels: ["claude", "Bug"],
      title: `Bug: Migrationen fehlen in Supabase (${m.applied}/${m.total})`,
      description: `Der Wächter findet ${m.missing.length} Migration(en) im Repo, die in Supabase fehlen: ${names}.\n\nPrüfen: Lauf von \`migrate.yml\` (Actions), ob die Secrets SUPABASE_ACCESS_TOKEN und SUPABASE_PROJECT_REF gesetzt sind, ob die Sicherung frisch war und ob eine Migration nicht additiv ist (dann entscheidet Sinan). Siehe SIN-374.`,
    },
  };
}

async function main() {
  const files = readMigrationFiles();
  const dup = duplicateVersions(files.map((f) => f.name));
  if (dup.length) {
    console.log(`::error::Doppelte Migrations-Version: ${dup.join(", ")}`);
    process.exit(1);
  }
  const m = await collectMigrations(process.env, { files });
  if (!m) {
    console.log("Migrationen: nicht lesbar (Token oder Projekt fehlt)");
    return;
  }
  console.log(m.line);
  if (process.argv.includes("--check") && m.additiveMissing.length) {
    console.log(`::error::Additive Migrationen fehlen noch: ${m.additiveMissing.join(", ")} (migrate.yml läuft nach dem Merge)`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
