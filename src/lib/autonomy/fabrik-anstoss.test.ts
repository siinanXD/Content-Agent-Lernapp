import assert from "node:assert/strict";
import { test } from "node:test";
import { contentPunkteOffen, entscheideAnstoss } from "../../../scripts/autonomy/fabrik-anstoss.mjs";
import { STEPS } from "../../../scripts/autonomy/leitstand.mjs";
import { agentOf } from "../../../scripts/autonomy/agents.mjs";

const OFFEN = "- [ ] Industriekaufmann veröffentlichen\n- [x] MAF Metall";
const ZU = "- [x] Industriekaufmann veröffentlichen\n- [ ] Impressum live";
const now = Date.parse("2026-10-17T10:00:00Z");
const vor = (min: number, status = "completed") => ({ status, created_at: new Date(now - min * 60000).toISOString() });

test("Anstoß: offene Content-Punkte, kein Lauf aktiv, letzter Lauf > 2 h, keine Pause", () => {
  assert.equal(entscheideAnstoss({ fertigMd: OFFEN, runs: [vor(121)], pausiert: false, now }).anstossen, true);
  assert.equal(entscheideAnstoss({ fertigMd: OFFEN, runs: [], pausiert: false, now }).anstossen, true);
});

test("Anstoß: nein ohne offene Content-Punkte", () => {
  assert.equal(contentPunkteOffen(ZU), false);
  assert.equal(entscheideAnstoss({ fertigMd: ZU, runs: [vor(300)], pausiert: false, now }).anstossen, false);
});

test("Anstoß: nein, wenn ein Lauf läuft oder wartet", () => {
  for (const status of ["in_progress", "queued"]) {
    assert.equal(entscheideAnstoss({ fertigMd: OFFEN, runs: [vor(10, status), vor(400)], pausiert: false, now }).anstossen, false);
  }
});

test("Anstoß: nein, wenn der letzte Lauf höchstens 2 h her ist", () => {
  const r = entscheideAnstoss({ fertigMd: OFFEN, runs: [vor(119), vor(400)], pausiert: false, now });
  assert.equal(r.anstossen, false);
  assert.match(r.grund, /119 Min/);
});

test("Anstoß: nein bei Pause wegen leerem Guthaben", () => {
  assert.equal(entscheideAnstoss({ fertigMd: OFFEN, runs: [vor(500)], pausiert: true, now }).anstossen, false);
});

test("Ereignis fabrik-anstoss ist ein Leitstand-Schritt mit Agent", () => {
  assert.ok(STEPS.includes("fabrik-anstoss"));
  assert.equal(agentOf("fabrik-anstoss"), "content");
});
