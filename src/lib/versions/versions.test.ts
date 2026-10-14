import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fuehreAus, ladeVersionen, planRueckgang, type ContentVersion, type Row, type VersionDb } from "./versions";

type Q = {
  eq(c: string, v: unknown): Q;
  gte(c: string, v: unknown): Q;
  order(): Q;
  then(res: (v: unknown) => unknown): unknown;
};

/**
 * In-Memory-Ersatz für units/questions inklusive Trigger (Migration 20261023010000): jede echte Änderung
 * schreibt eine Version; identische Updates nicht (WHEN old is distinct from new).
 */
function fakeDb(run: { id: string | null } = { id: null }) {
  const data: Record<string, Row[]> = { units: [], questions: [], content_versions: [] };
  let next = 1;
  const keys: Record<string, string[]> = { units: ["course_id", "id"], questions: ["course_id", "unit_id", "id"] };
  const same = (t: string, a: Row, b: Row) => keys[t].every((k) => a[k] === b[k]);
  const version = (t: string, aktion: ContentVersion["aktion"], alt: Row | null, neu: Row | null) => {
    const z = (neu ?? alt) as Row;
    data.content_versions.push({
      id: next++, tabelle: t, aktion, course_id: z.course_id, unit_id: t === "units" ? z.id : z.unit_id,
      question_id: t === "questions" ? z.id : null, alt, neu, grund: "test", issue: null, run_id: run.id, created_at: "2026-10-23T00:00:00Z",
    });
  };
  const filter = (rows: Row[], conds: [string, unknown][], op: "eq" | "gte") => (r: Row) =>
    conds.every(([c, v]) => (op === "eq" ? r[c] === v : (r[c] as number) >= (v as number)));
  const db = {
    data,
    from(t: string) {
      return {
        select() {
          const eq: [string, unknown][] = [];
          const gte: [string, unknown][] = [];
          const q: Q = {
            eq: (c, v) => {
              eq.push([c, v]);
              return q;
            },
            gte: (c, v) => {
              gte.push([c, v]);
              return q;
            },
            order: () => q,
            then: (res: (v: unknown) => unknown) =>
              res({ data: data[t].filter(filter(data[t], eq, "eq")).filter(filter(data[t], gte, "gte")), error: null }),
          };
          return q;
        },
        async upsert(rows: Row[] | Row) {
          for (const r of Array.isArray(rows) ? rows : [rows]) {
            const i = data[t].findIndex((x) => same(t, x, r));
            if (i < 0) {
              data[t].push(r);
              version(t, "insert", null, r);
            } else if (JSON.stringify(data[t][i]) !== JSON.stringify(r)) {
              version(t, "update", data[t][i], r);
              data[t][i] = r;
            }
          }
          return { error: null };
        },
        delete() {
          const conds: [string, unknown][] = [];
          const q: Q = {
            eq: (c, v) => {
              conds.push([c, v]);
              return q;
            },
            gte: () => q,
            order: () => q,
            then: (res: (v: unknown) => unknown) => {
              for (const r of data[t].filter(filter(data[t], conds, "eq"))) version(t, "delete", r, null);
              data[t] = data[t].filter((r) => !filter(data[t], conds, "eq")(r));
              return res({ error: null });
            },
          };
          return q;
        },
      };
    },
  };
  return db;
}

const C = "c1";
const unit = (title: string): Row => ({ course_id: C, id: "M0-01", title });
const frage = (id: string, prompt: string): Row => ({ course_id: C, unit_id: "M0-01", id, prompt });

test("Lauf zurücksetzen: Änderung, neue Zeile und gelöschte Zeile kehren zurück, Unverändertes erzeugt keine Version", async () => {
  const run = { id: null as string | null };
  const db = fakeDb(run);
  await db.from("units").upsert(unit("alt"));
  await db.from("questions").upsert([frage("q1", "Frage 1"), frage("q2", "Frage 2")]);
  assert.equal(db.data.content_versions.length, 3);
  await db.from("questions").upsert([frage("q1", "Frage 1")]);
  assert.equal(db.data.content_versions.length, 3, "identisches Upsert schreibt keine Version");

  run.id = "lauf-7";
  await db.from("units").upsert(unit("neu"));
  await db.from("questions").upsert(frage("q1", "Frage 1 geändert"));
  await db.from("questions").upsert(frage("q3", "Frage 3"));
  await db.from("questions").delete().eq("course_id", C).eq("unit_id", "M0-01").eq("id", "q2");

  const versionen = await ladeVersionen(db as unknown as VersionDb, { runId: "lauf-7" });
  assert.equal(versionen.length, 4);
  run.id = "zurueck";
  await fuehreAus(db as unknown as VersionDb, planRueckgang(versionen));

  assert.deepEqual(db.data.units, [unit("alt")]);
  assert.deepEqual(
    [...db.data.questions].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    [frage("q1", "Frage 1"), frage("q2", "Frage 2")],
  );
  assert.equal(db.data.content_versions.filter((v) => v.run_id === "zurueck").length, 4, "Rücksetzen ist selbst versioniert");
});

test("Einheit ab Version zurücksetzen: nur spätere Versionen dieser Einheit", async () => {
  const db = fakeDb();
  await db.from("units").upsert(unit("v1"));
  await db.from("units").upsert(unit("v2"));
  await db.from("units").upsert(unit("v3"));
  await db.from("units").upsert({ course_id: C, id: "M0-02", title: "andere" });
  const vs = await ladeVersionen(db as unknown as VersionDb, { courseId: C, unitId: "M0-01", abVersion: 2 });
  await fuehreAus(db as unknown as VersionDb, planRueckgang(vs));
  assert.deepEqual(db.data.units.find((u) => u.id === "M0-01"), unit("v1"));
  assert.equal(db.data.units.length, 2);
});

test("Plan: neueste Version zuerst, Löschen nur für Inserts, Update/Delete ohne alten Stand bricht ab", () => {
  const v = (id: number, aktion: ContentVersion["aktion"], alt: Row | null): ContentVersion => ({
    id, tabelle: "units", aktion, course_id: C, unit_id: "u", question_id: null, alt, neu: null, grund: "", issue: null, run_id: null, created_at: "",
  });
  const plan = planRueckgang([v(1, "insert", null), v(2, "update", { id: "u" })]);
  assert.deepEqual(plan.map((s) => [s.version, s.op]), [[2, "schreiben"], [1, "loeschen"]]);
  assert.throws(() => planRueckgang([v(3, "delete", null)]), /keinen alten Stand/);
});

test("Migration: Trigger auf units und questions, nur additiv, RLS an", () => {
  const sql = readFileSync("supabase/migrations/20261023010000_sin632_content_versions.sql", "utf8");
  for (const t of ["units", "questions"]) {
    assert.match(sql, new RegExp(`after insert or delete on public\\.${t}`));
    assert.match(sql, new RegExp(`after update on public\\.${t}[\\s\\S]*?when \\(old\\.\\* is distinct from new\\.\\*\\)`));
  }
  assert.match(sql, /alter table public\.content_versions enable row level security/);
  assert.doesNotMatch(sql, /\bdrop\s+(table|column|policy|function|trigger)\b/i);
  assert.doesNotMatch(sql, /^\s*delete\s+from\b/im);
});
