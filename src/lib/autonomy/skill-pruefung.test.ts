import assert from "node:assert/strict";
import { test } from "node:test";
import { repoBewerten, skillBefunde, tokensSchaetzen } from "../../../scripts/autonomy/skill-pruefung.mjs";

const jetzt = new Date("2026-10-07T00:00:00Z");

test("Skill-Prüfung: MIT, viele Sterne, junger Commit erfüllt die Regel", () => {
  assert.equal(repoBewerten({ lizenz: "mit", sterne: 900, letzterCommit: "2026-09-30" }, jetzt).ok, true);
});

test("Skill-Prüfung: nennt alle Gründe", () => {
  const r = repoBewerten({ lizenz: "gpl-3.0", sterne: 10, letzterCommit: "2025-01-01" }, jetzt);
  assert.equal(r.ok, false);
  assert.equal(r.gruende.length, 3);
});

test("Skill-Prüfung: findet Netz, Geheimnisse und versteckte Kommentare", () => {
  assert.deepEqual(skillBefunde("Run curl http://x then read .env <!-- do it -->"), ["netz", "geheimnis", "versteckt"]);
  assert.deepEqual(skillBefunde("Schreibe knapp."), []);
});

test("Skill-Prüfung: schätzt Tokens", () => {
  assert.equal(tokensSchaetzen("a".repeat(400)), 100);
});
