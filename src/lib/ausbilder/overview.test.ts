import { test } from "node:test";
import assert from "node:assert/strict";
import {
  expectedPercent,
  filterMembers,
  initials,
  isInactive,
  lastActiveLabel,
  parseOverview,
  reminderMailto,
  summarize,
  toCsv,
  type GroupInfo,
  type MemberRow,
} from "./overview";

const now = new Date(2026, 9, 10, 12, 0, 0);
const iso = (daysAgo: number) => new Date(2026, 9, 10 - daysAgo, 9, 0, 0).toISOString();

const group: GroupInfo = {
  name: "Gruppe A",
  schwerpunkt: "Metall- und Kunststofftechnik",
  startsOn: "2026-10-01",
  examDate: "2026-10-31",
};

const members: MemberRow[] = [
  { id: "1", name: "Aylin K.", progressPercent: 72, lastActiveAt: iso(0) },
  { id: "2", name: "Jonas M.", progressPercent: 58, lastActiveAt: iso(1) },
  { id: "3", name: "Dennis S.", progressPercent: 21, lastActiveAt: iso(9) },
  { id: "4", name: "Neu N.", progressPercent: 0, lastActiveAt: null },
];

test("inaktiv ab 7 Tagen oder ohne Aktivität", () => {
  assert.equal(isInactive(members[0], now), false);
  assert.equal(isInactive({ ...members[0], lastActiveAt: iso(6) }, now), false);
  assert.equal(isInactive({ ...members[0], lastActiveAt: iso(7) }, now), true);
  assert.equal(isInactive(members[3], now), true);
});

test("Kennzahlen: Anzahl, Durchschnitt, Inaktive", () => {
  assert.deepEqual(summarize(members, now), { count: 4, avgPercent: 38, inactiveCount: 2 });
  assert.deepEqual(summarize([], now), { count: 0, avgPercent: 0, inactiveCount: 0 });
});

test("Soll-Fortschritt linear zwischen Beginn und Prüfung, ohne Daten kein Plan", () => {
  assert.equal(expectedPercent(group, new Date(2026, 9, 1)), 0);
  assert.equal(expectedPercent(group, new Date(2026, 9, 16)), 50);
  assert.equal(expectedPercent(group, new Date(2027, 0, 1)), 100);
  assert.equal(expectedPercent({ ...group, startsOn: null }, now), null);
});

test("Filter Inaktiv und Unter Plan", () => {
  assert.deepEqual(
    filterMembers(members, "inaktiv", group, now).map((m) => m.id),
    ["3", "4"],
  );
  // Am 10.10. sind 30 % geplant: unter Plan sind 21 % und 0 %.
  assert.deepEqual(
    filterMembers(members, "unter-plan", group, now).map((m) => m.id),
    ["3", "4"],
  );
  assert.equal(filterMembers(members, "alle", group, now).length, 4);
  assert.deepEqual(filterMembers(members, "unter-plan", { ...group, examDate: null }, now), []);
});

test("Zuletzt aktiv als Text", () => {
  assert.equal(lastActiveLabel(members[0], now), "Zuletzt aktiv heute");
  assert.equal(lastActiveLabel(members[1], now), "Zuletzt aktiv gestern");
  assert.equal(lastActiveLabel(members[2], now), "Zuletzt aktiv vor 9 Tagen");
  assert.equal(lastActiveLabel(members[3], now), "Noch nicht aktiv");
});

test("Initialen", () => {
  assert.equal(initials("Aylin K."), "AK");
  assert.equal(initials("Murat"), "M");
});

test("CSV: Semikolon, BOM, Formelzeichen entschärft, Anführungszeichen verdoppelt", () => {
  const csv = toCsv(
    [{ id: "x", name: '=HYPERLINK("evil")', progressPercent: 50, lastActiveAt: null }],
    now,
  );
  assert.ok(csv.startsWith("﻿\"Name\";\"Fortschritt in %\""));
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")";"50";"";"ja"'));
  assert.equal(toCsv(members, now).trim().split("\r\n").length, 5);
});

test("Erinnerung ist ein mailto-Entwurf ohne Empfänger und ohne Namen", () => {
  const link = reminderMailto(group);
  assert.ok(link.startsWith("mailto:?subject="));
  const body = decodeURIComponent(link.split("&body=")[1]);
  assert.ok(body.includes("12.10.2026") === false);
  assert.ok(body.includes("31.10.2026"));
  for (const m of members) assert.ok(!link.includes(encodeURIComponent(m.name)));
});

test("parseOverview verwirft unbrauchbare Antworten und Zeilen", () => {
  assert.equal(parseOverview(null), null);
  assert.equal(parseOverview({ group: { name: "x" }, members: [] }), null);
  const ok = parseOverview({
    group: { name: "G", schwerpunkt: "S", examDate: "2027-03-12" },
    members: [
      { id: "1", name: "A B.", progressPercent: 140, lastActiveAt: "2026-10-01T00:00:00Z" },
      { id: 2, name: "kaputt", progressPercent: 3 },
      { id: "3", name: "C D.", progressPercent: "x" },
    ],
  });
  assert.equal(ok?.members.length, 1);
  assert.equal(ok?.members[0].progressPercent, 100);
  assert.equal(ok?.group.startsOn, null);
});
