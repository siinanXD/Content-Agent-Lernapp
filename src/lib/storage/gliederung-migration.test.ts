import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GEBIETE_TABELLEN } from "@/lib/content/pruefungsgebiete";

const sql = readFileSync("supabase/migrations/20261105010000_sin1549_gliederung_spalten.sql", "utf8");

test("SIN-1549: nur nullable Spalten ohne Standardwert, wiederholbar, nichts Zerstörerisches", () => {
  const spalten = [...sql.matchAll(/add column if not exists (\w+) (\w+(?:\[\])?)(,|;)/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(spalten, ["module_id text", "block_id text", "image jsonb", "exam_areas text[]", "level text", "image jsonb"]);
  assert.doesNotMatch(sql, /\bnot null\b|\bdefault\b/i);
  assert.doesNotMatch(sql, /\b(drop|delete|truncate|rename)\b/i);
  assert.doesNotMatch(sql, /policy|row level security/i);
  // Nachtrag setzt nur, wo die Spalte noch leer ist.
  for (const u of sql.match(/^update[^;]+;/gm) ?? []) assert.match(u, /\b(module_id|exam_areas) is null\b/);
});

test("SIN-1549: Nachtrag Prüfungsgebiet deckt jeden Block und jede Ausnahme der Tabellen ab", () => {
  for (const t of GEBIETE_TABELLEN) {
    for (const [block, row] of Object.entries(t.bloecke)) {
      assert.ok(
        sql.includes(`array['${row.gebiet}'] where course_id = '${t.courseId}' and unit_id like '${block}-u%' and exam_areas is null;`),
        `${t.kurs}: Block ${block}`,
      );
    }
    for (const [unit, a] of Object.entries(t.ausnahmen)) {
      assert.ok(sql.includes(`array['${a.gebiet}'] where course_id = '${t.courseId}' and unit_id = '${unit}' and exam_areas is null;`), unit);
    }
    // Ausnahmen stehen vor den Blöcken: Der Block schreibt nur in leere Spalten und ließe sonst die Ausnahme nie zum Zug kommen.
    const erste = Object.keys(t.ausnahmen)[0];
    if (erste) assert.ok(sql.indexOf(`unit_id = '${erste}'`) < sql.indexOf(`unit_id like '${Object.keys(t.bloecke)[0]}-u%'`));
  }
});
