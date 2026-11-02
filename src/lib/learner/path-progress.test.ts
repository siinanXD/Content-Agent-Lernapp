import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { mapGeneratedToPathUnits } from "./phase-a-path";
import { completedUnitIds, withProgress } from "./path-progress";
import type { LearningEvent } from "./streak";

const unit = (n: number) =>
  ({
    id: `M0-1-u${n}`,
    title: `Einheit ${n}`,
    questions: [
      {
        id: `M0-1-u${n}-q1`,
        type: "single",
        prompt: "Frage?",
        choices: ["a", "b"],
        correct: "a",
        explanation: "Weil.",
        sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/",
      },
    ],
  }) as unknown as GeneratedUnit;

const path = () => mapGeneratedToPathUnits([1, 2, 3, 4, 5, 6, 7, 8].map(unit));
const done = (unitId?: string, kind: LearningEvent["kind"] = "unit"): LearningEvent => ({
  at: "2026-11-02T10:00:00.000Z",
  day: "2026-11-02",
  kind,
  unitId,
});

test("neues Konto ohne Ereignisse: 0 erledigte Einheiten (SIN-1446)", () => {
  const units = withProgress(path(), completedUnitIds([]));
  assert.equal(units.filter((u) => u.status === "done").length, 0);
  assert.equal(units.filter((u) => u.status === "today").length, 1);
  assert.equal(units[0]!.status, "today");
  assert.equal(units[0]!.statusLabel, "Jetzt");
});

test("ohne Ereignis legt die Zuordnung der Einheiten nichts als erledigt fest", () => {
  assert.ok(path().every((u) => u.status === "open"));
});

test("nach einer abgeschlossenen Einheit ist genau diese erledigt und die nächste dran", () => {
  const units = withProgress(path(), completedUnitIds([done("M0-1-u1")]));
  assert.deepEqual(
    units.map((u) => u.status),
    ["done", "today", "open", "open", "open", "open", "open", "open"],
  );
  assert.equal(units[0]!.statusLabel, "Abgeschlossen");
});

test("eine mittlere Einheit erledigt: erste offene bleibt dran", () => {
  const units = withProgress(path(), completedUnitIds([done("M0-1-u3")]));
  assert.equal(units.find((u) => u.status === "today")!.id, "M0-1-u1");
  assert.equal(units.filter((u) => u.status === "done").length, 1);
});

test("Ereignisse ohne Einheit (Wiederholung, Prüfung, ältere Einträge) erledigen nichts", () => {
  const ids = completedUnitIds([done(undefined), done(undefined, "review"), done("M0-1-u2", "exam")]);
  assert.equal(ids.size, 0);
});

test("alles erledigt: keine Einheit ist dran", () => {
  const all = path().map((u) => done(u.id));
  assert.ok(withProgress(path(), completedUnitIds(all)).every((u) => u.status === "done"));
});
