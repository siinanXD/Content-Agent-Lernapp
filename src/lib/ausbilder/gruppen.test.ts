import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aktionFehler,
  aktive,
  archivZeitraum,
  archivierenFolgen,
  archivierte,
  belegtProzent,
  freiText,
  parseGruppen,
  vergebenText,
} from "./gruppen";

const ID = "6f1c1e0e-3a4b-4c5d-8e9f-0a1b2c3d4e5f";
const raw = (over: Record<string, unknown> = {}) => ({
  id: ID,
  name: "MAF Herbst 2026",
  schwerpunkt: "Maschinen- und Anlagenführer",
  startsOn: "2026-11-04",
  examDate: null,
  archivedAt: null,
  memberCount: 12,
  avgPercent: 64,
  ...over,
});

test("parseGruppen: liest Gruppen und Zugänge, verwirft kaputte Zeilen", () => {
  const r = parseGruppen({
    groups: [raw(), raw({ id: "kaputt" }), raw({ memberCount: "12" })],
    zugaenge: { organisation: "Träger", trainerQuota: 3, memberQuota: 40, used: 28 },
  });
  assert.equal(r?.groups.length, 1);
  assert.equal(vergebenText(r!.zugaenge!), "28 von 40");
  assert.equal(freiText(r!.zugaenge!), "12 frei. Mehr Zugänge bekommen Sie auf Anfrage.");
  assert.equal(belegtProzent(r!.zugaenge!), 70);
});

test("parseGruppen: ohne Organisation keine Zugänge, ohne Liste null", () => {
  assert.equal(parseGruppen({ groups: [], zugaenge: null })?.zugaenge, null);
  assert.equal(parseGruppen({}), null);
  assert.equal(parseGruppen(null), null);
});

test("aktive und archivierte werden getrennt", () => {
  const r = parseGruppen({ groups: [raw(), raw({ archivedAt: "2026-06-30T10:00:00Z" })] })!;
  assert.equal(aktive(r.groups).length, 1);
  assert.equal(archivierte(r.groups).length, 1);
  assert.equal(archivZeitraum(archivierte(r.groups)[0]), "04.11.2026 – 30.06.2026");
});

test("Archivieren nennt die Zugänge nur mit Kontingent", () => {
  assert.ok(archivierenFolgen(12, true).includes("Die 12 Zugänge werden wieder frei."));
  assert.ok(archivierenFolgen(1, true).includes("Der 1 Zugang wird wieder frei."));
  assert.ok(!archivierenFolgen(12, false).some((t) => t.includes("Zugänge werden")));
  assert.equal(archivierenFolgen(0, true).length, 3);
});

test("Fehlercodes werden zu Text und Status", () => {
  assert.equal(aktionFehler("54001").status, 409);
  assert.equal(aktionFehler("42501").status, 403);
  assert.equal(aktionFehler("P0002").status, 404);
  assert.equal(aktionFehler(undefined).status, 503);
});
