/**
 * Sicherung und Wiederherstellung der Inhalte (SIN-293).
 *
 *   node --import tsx scripts/backup.ts export [--out datei.json.gz]   # Supabase → privater Bucket `backups` (oder Datei)
 *   node --import tsx scripts/backup.ts verify  <datei.json.gz | --latest>   # nur prüfen, nichts schreiben
 *   node --import tsx scripts/backup.ts restore <datei.json.gz | --latest> [--dry-run]
 *
 * export liest nur (Service-Key bleibt im Workflow), lädt hoch, lädt zur Probe wieder herunter und räumt auf
 * (14 Tage täglich, ältere wöchentlich). restore schreibt nie in die Produktion: Ziel ist
 * RESTORE_SUPABASE_URL / RESTORE_SUPABASE_SERVICE_ROLE_KEY (Supabase-Branch oder lokale DB); gleiche URL wie
 * SUPABASE_URL wird nur mit --allow-production akzeptiert. Es wird nie gelöscht, nur per upsert geschrieben.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { BACKUP_TABLES, backupName, exportBackup, parseBackup, restoreBackup, selectPrune, serialize, type DbClient } from "../src/lib/backup/backup";

const BUCKET = "backups";
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n: string) => args.includes(n);
const val = (n: string) => args[args.indexOf(n) + 1];

const client = (url?: string, key?: string) => {
  if (!url?.trim() || !key?.trim()) throw new Error("URL und Service-Key fehlen");
  return createClient(url.trim(), key.trim(), { auth: { persistSession: false, autoRefreshToken: false } });
};
const asDb = (c: ReturnType<typeof client>) => c as unknown as DbClient;

async function latestName(c: ReturnType<typeof client>): Promise<string> {
  const { data, error } = await c.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw new Error(`Bucket nicht lesbar: ${error.message}`);
  const name = (data ?? []).map((o) => o.name).filter((n) => /^\d{4}-\d{2}-\d{2}\.json\.gz$/.test(n)).sort().at(-1);
  if (!name) throw new Error("Keine Sicherung im Bucket");
  return name;
}

async function loadFile(): Promise<Buffer> {
  if (flag("--latest")) {
    const c = client(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await c.storage.from(BUCKET).download(await latestName(c));
    if (error || !data) throw new Error(`Download fehlgeschlagen: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  const file = args[1];
  if (!file || file.startsWith("--")) throw new Error("Datei oder --latest angeben");
  return readFileSync(file);
}

const summary = (counts: Record<string, number>) => BACKUP_TABLES.map((t) => `${t.name}=${counts[t.name]}`).join(", ");

async function main() {
  if (cmd === "export") {
    const c = client(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const backup = await exportBackup(asDb(c), now);
    const buf = serialize(backup);
    if (backup.counts.questions === 0 || backup.counts.units === 0) throw new Error("Export ist leer, wird nicht abgelegt");
    if (flag("--out")) {
      writeFileSync(val("--out"), buf);
    } else {
      const name = backupName(now.toISOString().slice(0, 10));
      const store = c.storage.from(BUCKET);
      const made = await c.storage.createBucket(BUCKET, { public: false });
      if (made.error && !/already exists|duplicate/i.test(made.error.message)) throw new Error(`Bucket anlegen: ${made.error.message}`);
      const up = await store.upload(name, buf, { upsert: true, contentType: "application/gzip" });
      if (up.error) throw new Error(`Upload fehlgeschlagen: ${up.error.message}`);
      // Probe: zurücklesen und prüfen, bevor etwas aufgeräumt wird.
      const back = await store.download(name);
      if (back.error || !back.data) throw new Error(`Probe-Download fehlgeschlagen: ${back.error?.message}`);
      const check = parseBackup(Buffer.from(await back.data.arrayBuffer()));
      if (check.counts.questions !== backup.counts.questions) throw new Error("Probe: Fragenzahl weicht ab");
      const { data: list } = await store.list("", { limit: 1000 });
      const old = selectPrune((list ?? []).map((o) => o.name), now);
      if (old.length) await store.remove(old);
      console.log(`Aufgeräumt: ${old.length} alte Sicherungen entfernt`);
    }
    console.log(summary(backup.counts), `(${buf.length} Bytes)`);
    // Die Status-Seite liest diese Zeile aus den Job-Annotationen (scripts/autonomy/backup.mjs).
    console.log(`::notice title=Sicherung::Sicherung ${backup.createdAt}: ${backup.counts.questions} Fragen, ${backup.counts.units} Einheiten`);
    return;
  }
  if (cmd === "verify" || cmd === "restore") {
    const backup = parseBackup(await loadFile());
    console.log(`Sicherung von ${backup.createdAt} gültig: ${summary(backup.counts)}`);
    if (cmd === "verify" || flag("--dry-run")) return;
    const url = process.env.RESTORE_SUPABASE_URL;
    if (!url) throw new Error("RESTORE_SUPABASE_URL fehlt (Ziel: Supabase-Branch oder lokale DB)");
    if (url.trim().replace(/\/$/, "") === process.env.SUPABASE_URL?.trim().replace(/\/$/, "") && !flag("--allow-production")) {
      throw new Error("Ziel ist die Produktion; nur mit --allow-production");
    }
    const target = client(url, process.env.RESTORE_SUPABASE_SERVICE_ROLE_KEY);
    const written = await restoreBackup(asDb(target), backup);
    console.log(`Wiederhergestellt: ${summary(written)}`);
    // Gegenprobe: Zeilenzahlen im Ziel.
    for (const t of BACKUP_TABLES) {
      const { count, error } = await target.from(t.name).select("*", { count: "exact", head: true });
      if (error) throw new Error(`Gegenprobe ${t.name}: ${error.message}`);
      if ((count ?? 0) < backup.counts[t.name]) throw new Error(`Gegenprobe ${t.name}: ${count} < ${backup.counts[t.name]}`);
    }
    console.log("Gegenprobe ok");
    return;
  }
  throw new Error("Befehl: export | verify | restore");
}

main().catch((e) => {
  console.error(`::error title=Sicherung::${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
