import { test } from "node:test";
import assert from "node:assert/strict";
import { demoOverview, isDemoSearch } from "./demo";
import { isInactive, summarize } from "./overview";

const now = new Date("2026-10-08T10:00:00");

test("Beispielansicht wird nur mit ?demo=1 aktiv", () => {
  assert.equal(isDemoSearch("?demo=1"), true);
  assert.equal(isDemoSearch(""), false);
  assert.equal(isDemoSearch("?demo=0"), false);
});

test("Beispieldaten: erfundene Namen, inaktive Mitglieder, Prüfung nach Kursbeginn", () => {
  const o = demoOverview(now);
  assert.ok(o.members.every((m) => m.name.startsWith("Beispiel ")));
  assert.ok(o.members.some((m) => isInactive(m, now)));
  assert.equal(summarize(o.members, now).count, 5);
  assert.ok(o.group.examDate! > o.group.startsOn!);
});
