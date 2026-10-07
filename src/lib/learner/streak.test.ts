import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDailyGoal,
  computeStreak,
  countLearningDays,
  dailyGoalCopy,
  dayKey,
  formatDays,
  shiftDay,
  type LearningEvent,
  type LearningSummary,
  weekActivity,
} from "./streak";

const BERLIN = "Europe/Berlin";
const ev = (iso: string, tz = BERLIN): LearningEvent => ({
  at: iso,
  day: dayKey(new Date(iso), tz),
  kind: "unit",
});

describe("dayKey und Tageswechsel (SIN-290)", () => {
  it("wechselt den Tag um Mitternacht der Zeitzone, nicht um UTC-Mitternacht", () => {
    // Sommerzeit (UTC+2): 22:30 UTC ist schon der nächste Tag in Berlin.
    assert.equal(dayKey(new Date("2026-10-06T21:59:00Z"), BERLIN), "2026-10-06");
    assert.equal(dayKey(new Date("2026-10-06T22:00:00Z"), BERLIN), "2026-10-07");
    // Winterzeit (UTC+1)
    assert.equal(dayKey(new Date("2026-12-06T22:59:00Z"), BERLIN), "2026-12-06");
    assert.equal(dayKey(new Date("2026-12-06T23:00:00Z"), BERLIN), "2026-12-07");
  });

  it("derselbe Zeitpunkt ist je Zeitzone ein anderer Tag", () => {
    const t = new Date("2026-10-06T23:30:00Z");
    assert.equal(dayKey(t, "UTC"), "2026-10-06");
    assert.equal(dayKey(t, BERLIN), "2026-10-07");
    assert.equal(dayKey(t, "America/New_York"), "2026-10-06");
  });

  it("shiftDay rechnet über Monats- und Jahresgrenzen", () => {
    assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
    assert.equal(shiftDay("2028-03-01", -1), "2028-02-29");
    assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  });
});

describe("computeStreak (SIN-290)", () => {
  it("ohne Ereignisse: keine Serie", () => {
    const s = computeStreak([], new Date("2026-10-06T10:00:00Z"), BERLIN);
    assert.deepEqual(s, { days: 0, learnedToday: false, previousDays: 0 });
  });

  it("zählt aufeinanderfolgende Lerntage, mehrere Ereignisse am Tag zählen einmal", () => {
    const events = [
      ev("2026-10-04T08:00:00Z"),
      ev("2026-10-05T08:00:00Z"),
      ev("2026-10-05T09:00:00Z"),
      ev("2026-10-06T08:00:00Z"),
    ];
    const s = computeStreak(events, new Date("2026-10-06T12:00:00Z"), BERLIN);
    assert.equal(s.days, 3);
    assert.equal(s.learnedToday, true);
  });

  it("bleibt am Folgetag offen, solange gestern gelernt wurde", () => {
    const events = [ev("2026-10-04T08:00:00Z"), ev("2026-10-05T08:00:00Z")];
    const s = computeStreak(events, new Date("2026-10-06T07:00:00Z"), BERLIN);
    assert.deepEqual(s, { days: 2, learnedToday: false, previousDays: 0 });
  });

  it("reißt nach einem ganzen Tag ohne Lernen und merkt sich die alte Serie", () => {
    const events = [
      ev("2026-10-01T08:00:00Z"),
      ev("2026-10-02T08:00:00Z"),
      ev("2026-10-03T08:00:00Z"),
    ];
    const s = computeStreak(events, new Date("2026-10-05T07:00:00Z"), BERLIN);
    assert.deepEqual(s, { days: 0, learnedToday: false, previousDays: 3 });
  });

  it("eine neue Serie nach der Lücke zählt ab 1", () => {
    const events = [
      ev("2026-10-01T08:00:00Z"),
      ev("2026-10-02T08:00:00Z"),
      ev("2026-10-05T08:00:00Z"),
    ];
    const s = computeStreak(events, new Date("2026-10-05T12:00:00Z"), BERLIN);
    assert.equal(s.days, 1);
    assert.equal(s.previousDays, 0);
  });

  it("Lernen kurz nach Mitternacht Ortszeit zählt für den neuen Tag", () => {
    // 23:30 UTC = 01:30 Berlin am Folgetag
    const events = [ev("2026-10-05T10:00:00Z"), ev("2026-10-05T23:30:00Z")];
    const s = computeStreak(events, new Date("2026-10-06T08:00:00Z"), BERLIN);
    assert.equal(s.days, 2);
    assert.equal(s.learnedToday, true);
  });

  it("23:59 und 00:01 Ortszeit sind zwei aufeinanderfolgende Tage", () => {
    const events = [ev("2026-10-05T21:59:00Z"), ev("2026-10-05T22:01:00Z")];
    const s = computeStreak(events, new Date("2026-10-06T10:00:00Z"), BERLIN);
    assert.equal(s.days, 2);
  });

  it("die Umstellung auf Winterzeit (25-Stunden-Tag) reißt die Serie nicht", () => {
    // 2026-10-25 hat in Berlin 25 Stunden.
    const events = [
      ev("2026-10-24T10:00:00Z"),
      ev("2026-10-25T10:00:00Z"),
      ev("2026-10-26T10:00:00Z"),
    ];
    const s = computeStreak(events, new Date("2026-10-26T12:00:00Z"), BERLIN);
    assert.equal(s.days, 3);
  });

  it("die Umstellung auf Sommerzeit (23-Stunden-Tag) reißt die Serie nicht", () => {
    // 2026-03-29 hat in Berlin 23 Stunden.
    const events = [
      ev("2026-03-28T10:00:00Z"),
      ev("2026-03-28T23:30:00Z"), // 00:30 am 29.03. (noch CET)
      ev("2026-03-29T21:30:00Z"), // 23:30 am 29.03. (CEST), selber Tag
      ev("2026-03-30T10:00:00Z"),
    ];
    const s = computeStreak(events, new Date("2026-03-30T12:00:00Z"), BERLIN);
    assert.equal(s.days, 3);
  });

  it("Ereignisse mit Tag in der Zukunft (Uhr falsch gestellt) verlängern die Serie nicht", () => {
    const events = [ev("2026-10-05T10:00:00Z"), ev("2026-10-09T10:00:00Z")];
    const s = computeStreak(events, new Date("2026-10-06T10:00:00Z"), BERLIN);
    assert.equal(s.days, 1);
  });

  it("Reisen: der am Ereignis gespeicherte Tag bleibt maßgeblich", () => {
    // Gleicher Zeitpunkt, gespeichert in New York (Vortag) – die Serie läuft dort weiter.
    const events = [ev("2026-10-05T03:00:00Z", "America/New_York"), ev("2026-10-05T20:00:00Z", "America/New_York")];
    assert.equal(events[0]!.day, "2026-10-04");
    const s = computeStreak(events, new Date("2026-10-05T22:00:00Z"), "America/New_York");
    assert.equal(s.days, 2);
  });
});

describe("dailyGoalCopy (Figma 22 und 24)", () => {
  const summary = (events: LearningEvent[], iso: string): LearningSummary => {
    const now = new Date(iso);
    return { streak: computeStreak(events, now, BERLIN), goal: computeDailyGoal(events, now, BERLIN, 4) };
  };

  it("neuer Tag nach gerissener Serie: Neustart ohne Schuld, alte Serie bleibt sichtbar", () => {
    const events = Array.from({ length: 8 }, (_, i) => ev(`2026-09-${20 + i}T10:00:00Z`));
    const copy = dailyGoalCopy(summary(events, "2026-10-01T10:00:00Z"), 0);
    assert.equal(copy.title, "Neue Serie, neuer Start");
    assert.match(copy.text, /Deine 8 Tage bleiben im Profil/);
  });

  it("neuer Tag, noch nichts gemacht", () => {
    const copy = dailyGoalCopy(summary([], "2026-10-06T10:00:00Z"), 3);
    assert.equal(copy.title, "Tagesziel: 0 von 4");
    assert.match(copy.text, /Wiederholung/);
  });

  it("unterwegs: nennt die Restmenge", () => {
    const events = [ev("2026-10-06T06:00:00Z"), ev("2026-10-06T07:00:00Z"), ev("2026-10-06T08:00:00Z")];
    const copy = dailyGoalCopy(summary(events, "2026-10-06T10:00:00Z"), 0);
    assert.equal(copy.title, "Tagesziel: 4 Einheiten");
    assert.match(copy.text, /^Noch 1 Einheit, ca\. 7 Minuten\./);
  });

  it("erreicht und übererfüllt", () => {
    const four = Array.from({ length: 4 }, (_, i) => ev(`2026-10-06T0${i + 1}:00:00Z`));
    assert.equal(dailyGoalCopy(summary(four, "2026-10-06T10:00:00Z"), 0).title, "Tagesziel geschafft");
    const six = [...four, ev("2026-10-06T05:00:00Z"), ev("2026-10-06T06:00:00Z")];
    assert.equal(dailyGoalCopy(summary(six, "2026-10-06T10:00:00Z"), 0).title, "6 von 4 geschafft");
  });

  it("formatDays: Einzahl und Mehrzahl", () => {
    assert.equal(formatDays(1), "1 Tag");
    assert.equal(formatDays(8), "8 Tage");
  });
});

describe("computeDailyGoal (SIN-290)", () => {
  const now = new Date("2026-10-06T16:00:00Z");

  it("zählt nur Ereignisse des heutigen Kalendertags", () => {
    const events = [
      ev("2026-10-05T10:00:00Z"),
      ev("2026-10-06T06:00:00Z"),
      ev("2026-10-06T07:00:00Z"),
    ];
    const g = computeDailyGoal(events, now, BERLIN, 4);
    assert.deepEqual(g, { done: 2, goal: 4, reached: false, exceeded: false, remaining: 2 });
  });

  it("erreicht genau beim Ziel, übererfüllt darüber", () => {
    const four = Array.from({ length: 4 }, (_, i) => ev(`2026-10-06T0${i + 1}:00:00Z`));
    assert.equal(computeDailyGoal(four, now, BERLIN, 4).reached, true);
    assert.equal(computeDailyGoal(four, now, BERLIN, 4).exceeded, false);
    const six = [...four, ev("2026-10-06T05:00:00Z"), ev("2026-10-06T06:00:00Z")];
    const g = computeDailyGoal(six, now, BERLIN, 4);
    assert.equal(g.exceeded, true);
    assert.equal(g.done, 6);
    assert.equal(g.remaining, 0);
  });

  it("beginnt nach Mitternacht Ortszeit wieder bei 0", () => {
    const events = [ev("2026-10-06T20:00:00Z")]; // 22:00 Berlin
    assert.equal(computeDailyGoal(events, new Date("2026-10-06T21:59:00Z"), BERLIN, 4).done, 1);
    assert.equal(computeDailyGoal(events, new Date("2026-10-06T22:01:00Z"), BERLIN, 4).done, 0);
  });
});

describe("Wochen-Säulen und Lerntage (SIN-317)", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  const events = [
    ev("2026-10-07T07:00:00Z"),
    ev("2026-10-07T08:00:00Z"),
    ev("2026-10-05T08:00:00Z"),
    ev("2026-09-20T08:00:00Z"),
  ];

  it("liefert 7 Tage bis heute, älteste zuerst, mit Anzahl je Tag", () => {
    const week = weekActivity(events, now, BERLIN);
    assert.equal(week.length, 7);
    assert.equal(week[0]!.day, "2026-10-01");
    assert.deepEqual(week.map((d) => d.count), [0, 0, 0, 0, 1, 0, 2]);
    assert.deepEqual(week.map((d) => d.today), [false, false, false, false, false, false, true]);
  });

  it("zählt verschiedene Lerntage", () => {
    assert.equal(countLearningDays(events), 3);
    assert.equal(countLearningDays([]), 0);
  });
});
