import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { analyzeBackup } from "../../../scripts/autonomy/backup.mjs";
import { BACKUP_TABLES, exportBackup, parseBackup, restoreBackup, selectPrune, serialize, type DbClient, type Row } from "./backup";

/** Minimaler Supabase-Ersatz: Tabellen im Speicher, select/order/range und upsert nach Konfliktschlüssel. */
function fakeDb(data: Record<string, Row[]>, log: string[] = []): DbClient & { data: Record<string, Row[]> } {
  return {
    data,
    from(table: string) {
      const rows = (data[table] ??= []);
      return {
        select() {
          const q = {
            order: () => q,
            range: async (a: number, b: number) => ({ data: rows.slice(a, b + 1), error: null }),
          };
          return q;
        },
        async upsert(batch: Row[], { onConflict }: { onConflict: string }) {
          log.push(table);
          const cols = onConflict.split(",");
          for (const r of batch) {
            const i = rows.findIndex((x) => cols.every((c) => x[c] === r[c]));
            if (i >= 0) rows[i] = r;
            else rows.push(r);
          }
          return { error: null };
        },
      };
    },
  };
}

const seed = (): Record<string, Row[]> => ({
  courses: [
    { id: "c1", keyword: "Metall", status: "published", mock: false },
    { id: "cm", keyword: "Mock", status: "created", mock: true },
  ],
  shared_modules: [{ key: "maf:M0", source_course_id: "c1" }],
  course_shared_modules: [{ course_id: "c1", module_key: "maf:M0" }],
  sources: [{ id: "s1", course_id: "c1", url: "https://www.gesetze-im-internet.de/x" }],
  plans: [{ id: "p1", course_id: "c1" }],
  units: [{ id: "M0-01", course_id: "c1" }, { id: "x", course_id: "cm" }],
  questions: Array.from({ length: 2500 }, (_, i) => ({ id: `q${i}`, course_id: "c1", unit_id: "M0-01" })),
  evaluations: [{ id: "e1", course_id: "c1" }],
  question_evaluations: [{ id: "qe1", course_id: "c1", question_id: "q1" }],
  learning_progress: [{ id: "l1", anonymous_id: "a" }],
});

test("Export: paginiert, ohne Mock-Kurse, ohne Lern-Fortschritt", async () => {
  const b = await exportBackup(fakeDb(seed()), new Date("2026-10-06T02:00:00Z"));
  assert.equal(b.counts.questions, 2500);
  assert.equal(b.counts.courses, 1);
  assert.equal(b.counts.units, 1);
  assert.ok(!("learning_progress" in b.tables));
  assert.deepEqual(Object.keys(b.tables), BACKUP_TABLES.map((t) => t.name));
});

test("Rundlauf: Export → gzip → prüfen → in leere DB wiederherstellen, FK-Reihenfolge, idempotent", async () => {
  const b = await exportBackup(fakeDb(seed()));
  const log: string[] = [];
  const target = fakeDb({}, log);
  const parsed = parseBackup(serialize(b));
  await restoreBackup(target, parsed, { chunk: 1000 });
  for (const t of BACKUP_TABLES) assert.equal(target.data[t.name].length, b.counts[t.name], t.name);
  const first = (n: string) => log.indexOf(n);
  assert.ok(first("courses") < first("units") && first("units") < first("questions") && first("shared_modules") < first("units"));
  await restoreBackup(target, parsed);
  assert.equal(target.data.questions.length, 2500);
  assert.deepEqual(target.data.courses, b.tables.courses);
});

test("parseBackup lehnt kaputte Sicherungen ab", async () => {
  const b = await exportBackup(fakeDb(seed()));
  assert.throws(() => parseBackup(Buffer.from("kein gzip")));
  assert.throws(() => parseBackup(gzipSync(JSON.stringify({ ...b, version: 99 }))), /version/i);
  assert.throws(() => parseBackup(gzipSync(JSON.stringify({ ...b, counts: { ...b.counts, questions: 1 } }))), /Zähler/);
  const orphan = { ...b, tables: { ...b.tables, questions: [...b.tables.questions, { id: "z", course_id: "c1", unit_id: "fehlt" }] } };
  orphan.counts = { ...b.counts, questions: orphan.tables.questions.length };
  assert.throws(() => parseBackup(gzipSync(JSON.stringify(orphan))), /ohne Einheit/);
});

test("Aufbewahrung: 14 Tage täglich, ältere nur montags, jüngste und Fremdes bleiben", () => {
  const now = new Date("2026-10-06T03:00:00Z"); // Dienstag
  const names = ["2026-10-05", "2026-09-23", "2026-09-22", "2026-09-21", "2026-09-28", "2026-08-01"].map((d) => `${d}.json.gz`);
  // Montage (09-21, 09-28) bleiben; 09-22 (Di, 14 Tage alt) und 08-01 (Sa) fliegen raus; 09-23 ist erst 13 Tage alt.
  assert.deepEqual(selectPrune([...names, "notiz.txt"], now).sort(), ["2026-08-01.json.gz", "2026-09-22.json.gz"]);
  assert.deepEqual(selectPrune(["2026-01-01.json.gz"], now), [], "einzige Sicherung bleibt");
});

test("Status: Zeit und Fragenzahl, Fehler und Überfälligkeit sind Meldungen", () => {
  const now = new Date("2026-10-06T10:00:00Z");
  const run = (conclusion: string, updated_at: string) => ({ status: "completed", conclusion, updated_at, html_url: `u/${conclusion}` });
  const note = "Sicherung 2026-10-06T02:24:00.000Z: 1745 Fragen, 248 Einheiten";
  const ok = analyzeBackup({ runs: [run("success", "2026-10-06T02:25:00Z")], note, now });
  assert.equal(ok.line, "Letzte Sicherung 02:25 UTC, 1745 Fragen");
  assert.equal(ok.incident, null);
  const bad = analyzeBackup({ runs: [run("failure", "2026-10-06T02:25:00Z"), run("success", "2026-10-05T02:25:00Z")], note, now });
  assert.match(bad.line, /fehlgeschlagen/);
  assert.match(bad.incident!.text, /fehlgeschlagen/);
  const stale = analyzeBackup({ runs: [run("success", "2026-10-04T02:25:00Z")], note, now });
  assert.equal(stale.incident!.key, "backup-stale");
  assert.equal(analyzeBackup({ runs: [], now }).incident, null);
});
