import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INVITE_BATCH_MAX,
  checkGroupInput,
  checkNames,
  formatCode,
  invitationsText,
  parseInvitations,
  parseNames,
} from "./gruppe";

test("Gruppe: gültige Eingabe wird bereinigt", () => {
  const r = checkGroupInput({ name: "  Gruppe A ", schwerpunkt: "Metall", startsOn: "2026-10-01", examDate: "" });
  assert.deepEqual(r, {
    ok: true,
    value: { name: "Gruppe A", schwerpunkt: "Metall", startsOn: "2026-10-01", examDate: null },
  });
});

test("Gruppe: Name und Schwerpunkt sind Pflicht, Daten müssen echt sein", () => {
  assert.equal(checkGroupInput({ name: "", schwerpunkt: "x" }).ok, false);
  assert.equal(checkGroupInput({ name: "x", schwerpunkt: " " }).ok, false);
  assert.equal(checkGroupInput({ name: "x", schwerpunkt: "y", examDate: "2027-02-30" }).ok, false);
  assert.equal(checkGroupInput(null).ok, false);
});

test("Gruppe: Prüfung nicht vor Kursbeginn", () => {
  const r = checkGroupInput({ name: "x", schwerpunkt: "y", startsOn: "2026-10-01", examDate: "2026-10-01" });
  assert.equal(r.ok, false);
});

test("Namen: eine Zeile je Person, ohne Leerzeilen und Doppelte", () => {
  assert.deepEqual(parseNames("Aylin K.\n\n  jonas  m. \r\nAylin K.\n"), ["Aylin K.", "jonas m."]);
});

test("Namen: E-Mail-Adressen werden abgelehnt (keine Personendaten)", () => {
  const r = checkNames(["aylin@example.org"]);
  assert.equal(r.ok, false);
  assert.match((r as { error: string }).error, /keine E-Mail/);
});

test("Namen: leer, zu lang und zu viele", () => {
  assert.equal(checkNames([]).ok, false);
  assert.equal(checkNames(["a".repeat(61)]).ok, false);
  assert.equal(checkNames(Array.from({ length: INVITE_BATCH_MAX + 1 }, (_, i) => `P${i}`)).ok, false);
  assert.equal(checkNames(Array.from({ length: INVITE_BATCH_MAX }, (_, i) => `P${i}`)).ok, true);
  assert.equal(checkNames("Aylin").ok, false);
});

test("Code und Text zum Weitergeben", () => {
  assert.equal(formatCode("AB12C34DEF"), "AB12C-34DEF");
  assert.equal(
    invitationsText([{ memberId: "1", name: "Aylin K.", code: "AB12C34DEF" }]),
    "Aylin K.: AB12C-34DEF",
  );
});

test("Einladungen lesen: unbrauchbare Zeilen entfallen", () => {
  assert.deepEqual(
    parseInvitations({ invitations: [{ memberId: "1", name: "A", code: "X" }, { name: "B" }] }),
    [{ memberId: "1", name: "A", code: "X" }],
  );
  assert.equal(parseInvitations({}), null);
});
