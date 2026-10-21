import assert from "node:assert/strict";
import test from "node:test";
import type { Curriculum, CurriculumModule } from "@/lib/content/curriculum";
import { entscheideAnstoss } from "../../../scripts/autonomy/fabrik-anstoss.mjs";
import { kostenZeile } from "../../../scripts/autonomy/fabrik.mjs";
import { buildQueue, chooseRunMap, erzeugteIds, FERTIG_STOP, leerlaufGrund, slotIds } from "./content-grow";
import { MAX_REPAIR_RUNDEN, repairRunden, repairZiele } from "./repair-questions";

const mod = (id: string, units: number): CurriculumModule =>
  ({ id, order: 0, blocks: [{ id: `${id}-1`, units }] }) as unknown as CurriculumModule;
const kurs = { id: "indkfl", family: "indkfl", modules: [mod("A", 3)] } as unknown as Curriculum;
const queue = buildQueue([kurs], [], ["indkfl"]);

/** Spiegelt den Anfang von scripts/content-grow.ts: erst entscheiden, dann bezahlen. Der Mock zählt API-Aufrufe. */
function lauf(erzeugt: Set<string>, api: { calls: number }): string | null {
  const chosen = chooseRunMap(queue, new Map([["indkfl", erzeugt]]), new Map(), null, null, ["indkfl"]);
  const grund = leerlaufGrund(chosen, false);
  if (grund) return grund;
  api.calls++;
  return null;
}

test("SIN-901: Map ohne offene Einheiten → Lauf übersprungen, 0 API-Aufrufe", () => {
  const api = { calls: 0 };
  // Alle drei Einheiten erzeugt (auch als Entwurf, nicht veröffentlicht): nichts zu erzeugen.
  const alle = erzeugteIds(slotIds(queue[0]!.module).map((id) => ({ id })));
  assert.equal(lauf(alle, api), FERTIG_STOP);
  assert.equal(FERTIG_STOP, "fertig: alle Einheiten erzeugt");
  assert.equal(api.calls, 0);
});

test("SIN-901: offene Einheit → Lauf geht weiter; Quellenänderung hält ihn ebenfalls offen", () => {
  const api = { calls: 0 };
  assert.equal(lauf(new Set(["A-1-u1"]), api), null);
  assert.equal(api.calls, 1);
  assert.equal(leerlaufGrund(null, true), null);
  assert.equal(leerlaufGrund(null, false), FERTIG_STOP);
});

const ev = (unitId: string, runId: string) => ({ unitId, runId });

test("SIN-901: Frage nach 2 Reparaturen wird nicht erneut repariert", () => {
  const evals = [
    ev("U1", "x-repair1"), ev("U1", "x-repair1"), ev("U1", "x-repair2"), // U1: 2 Runden (mehrere Fragen je Runde zählen einmal)
    ev("U2", "x-repair1"), ev("U2", "x-bootstrap"), // U2: 1 Runde
  ];
  assert.equal(MAX_REPAIR_RUNDEN, 2);
  assert.equal(repairRunden(evals, "U1"), 2);
  assert.equal(repairRunden(evals, "U2"), 1);
  assert.deepEqual(repairZiele(evals, ["U1", "U2", "U3"]), ["U2", "U3"]);
});

test("SIN-901: Anstoß ruht, solange der letzte Lauf „fertig“ meldete", () => {
  const md = "- [ ] Industriekaufmann veröffentlicht";
  const now = Date.parse("2026-10-21T12:00:00Z");
  assert.equal(entscheideAnstoss({ fertigMd: md, runs: [], pausiert: false, now }).anstossen, true);
  const r = entscheideAnstoss({ fertigMd: md, runs: [], pausiert: false, fertig: true, now });
  assert.equal(r.anstossen, false);
  assert.match(r.grund, /^fertig:/);
});

test("SIN-901: Leitstand-Zeile mit Kosten heute, 7 Tage und Einheiten je €", () => {
  const now = Date.parse("2026-10-21T12:00:00Z");
  const rows = [
    { created_at: "2026-10-21T03:00:00Z", cost_eur: 0.88, units_generated: 0 },
    { created_at: "2026-10-20T03:00:00Z", cost_eur: 28.34, units_generated: 434 },
  ];
  assert.equal(
    kostenZeile(rows, now),
    "heute 0.88 €, 7 Tage 29.22 € (434 Einheiten, 14.9 Einheiten je €); bezahlte Läufe ohne Einheiten: 1",
  );
});
