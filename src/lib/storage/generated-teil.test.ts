import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { schreibeTeil } from "./generated-teil";
import { repairAusgang } from "@/lib/generate/content-grow";

type Call = { table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> };

/** Zählt jeden Aufruf; `questions.select` liefert die vorhandenen Fragen des Kurses (gefiltert nach unit_id). */
function fakeDb(existing: Array<{ id: string; unit_id: string }>) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: "", filters: [] };
    const chain: Record<string, unknown> = {
      upsert: (rows: unknown) => ((call.op = "upsert"), (call.arg = rows), chain),
      select: () => ((call.op = "select"), chain),
      delete: () => ((call.op = "delete"), chain),
      update: (v: unknown) => ((call.op = "update"), (call.arg = v), chain),
      eq: (k: string, v: unknown) => (call.filters.push([k, v]), chain),
      in: (k: string, v: unknown) => (call.filters.push([k, v]), chain),
      then: (res: (v: unknown) => void) => {
        calls.push(call);
        const ids = call.filters.find(([k]) => k === "unit_id")?.[1] as string[] | undefined;
        const data = call.op === "select" ? existing.filter((q) => ids?.includes(q.unit_id)) : null;
        res({ data, error: null });
      },
    };
    return chain;
  };
  return { sb: { from } as unknown as SupabaseClient, calls };
}

describe("schreibeTeil (SIN-861)", () => {
  it("schreibt und löscht bei 1 geänderter Einheit unter 900 nur diese Einheit", async () => {
    const units = Array.from({ length: 900 }, (_, i) => ({ id: `u${i}` }));
    const questions = units.flatMap((u) => [{ id: "q1", unit_id: u.id }, { id: "q2", unit_id: u.id }]);
    // In der DB hat u7 zusätzlich die verwaiste Frage q3, alle anderen Einheiten haben q1/q2.
    const existing = [...questions, { id: "q3", unit_id: "u7" }];
    const { sb, calls } = fakeDb(existing);

    await schreibeTeil(sb, "kurs", units, questions, { units }, { changedUnitIds: ["u7"], lernfeld: false });

    const upserts = calls.filter((c) => c.op === "upsert");
    assert.deepEqual(upserts.map((c) => (c.arg as unknown[]).length), [1, 2]);
    const deletes = calls.filter((c) => c.op === "delete");
    assert.equal(deletes.length, 1);
    assert.deepEqual(deletes[0]!.filters, [["course_id", "kurs"], ["unit_id", "u7"], ["id", ["q3"]]]);
    const selects = calls.filter((c) => c.op === "select");
    assert.deepEqual(selects.map((c) => c.filters.find(([k]) => k === "unit_id")?.[1]), [["u7"]]);
    const upd = calls.find((c) => c.op === "update")!;
    assert.equal("lernfeld" in (upd.arg as object), false);
    assert.equal(calls.length, 5);
  });

  it("schreibt die jsonb nur mit lernfeld: true", async () => {
    const { sb, calls } = fakeDb([]);
    await schreibeTeil(sb, "kurs", [{ id: "u1" }], [], { id: "lf", title: "T", units: [{ id: "u1" }] }, { changedUnitIds: ["u1"], lernfeld: true });
    assert.equal("lernfeld" in (calls.find((c) => c.op === "update")!.arg as object), true);
  });

  it("schreibt mit lernfeld: true nur Kopfdaten, keine units in die jsonb", async () => {
    const { sb, calls } = fakeDb([]);
    await schreibeTeil(sb, "kurs", [{ id: "u1" }], [], { id: "lf", title: "T", units: [{ id: "u1" }] }, { changedUnitIds: ["u1"], lernfeld: true });
    const lf = (calls.find((c) => c.op === "update")!.arg as { lernfeld: Record<string, unknown> }).lernfeld;
    assert.deepEqual(lf, { id: "lf", title: "T", units: [] });
  });
});

describe("repairAusgang (SIN-861)", () => {
  it("Exit 1 ist eine Warnung, kein Abbruch; 0, 3 und 4 bleiben ok", () => {
    assert.equal(repairAusgang(1), "warnung");
    assert.equal(repairAusgang(null), "warnung");
    for (const s of [0, 3, 4]) assert.equal(repairAusgang(s), "ok");
  });
});
