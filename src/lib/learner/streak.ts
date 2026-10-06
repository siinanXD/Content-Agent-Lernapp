/**
 * Serie und Tagesziel (SIN-290, Figma Screens 22–26).
 * Alles wird aus echten Lernereignissen berechnet, die lokal im Browser liegen
 * (`cal-learn-events`, kein Server, keine Personendaten). Ein Ereignis entsteht,
 * wenn eine Einheit, eine Wiederholung oder eine Prüfung abgeschlossen wird.
 *
 * Ein „Tag“ ist ein Kalendertag in der Zeitzone des Geräts. Er wird beim
 * Speichern am Ereignis festgehalten, damit ein Zeitzonenwechsel alte Serien
 * nicht umsortiert.
 */

/** Tagesziel in Einheiten (Figma 22: „Tagesziel: 4 Einheiten“). */
export const DAILY_GOAL = 4;

/** Geschätzte Minuten je Einheit für den Hinweis „ca. 7 Minuten“ (Figma 22). */
export const MINUTES_PER_UNIT = 7;

export type LearningEventKind = "unit" | "review" | "exam";

export type LearningEvent = {
  /** Zeitpunkt (ISO, UTC) */
  at: string;
  /** Kalendertag `YYYY-MM-DD` in der Zeitzone des Geräts zum Zeitpunkt `at` */
  day: string;
  kind: LearningEventKind;
};

const KEY = "cal-learn-events";
/** Älteres wird nicht mehr für die Serie gebraucht; hält den Speicher klein. */
const MAX_EVENTS = 800;

/** Kalendertag `YYYY-MM-DD` eines Zeitpunkts in einer Zeitzone (Standard: Gerät). */
export function dayKey(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Verschiebt einen Kalendertag um ganze Tage. Rechnet auf Datumsebene, daher sommerzeitfest. */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + delta)).toISOString().slice(0, 10);
}

export type StreakState = {
  /** Aktuelle Serie in Lerntagen (0 = keine laufende Serie) */
  days: number;
  /** Heute schon gelernt? Sonst ist die Serie noch offen, aber nicht gerissen. */
  learnedToday: boolean;
  /** Länge der zuletzt gerissenen Serie; nur gesetzt, wenn die Serie jetzt 0 ist */
  previousDays: number;
};

/**
 * Serie = aufeinanderfolgende Tage mit mindestens einem Lernereignis.
 * Sie lebt weiter, wenn heute noch nichts gelernt wurde, aber gestern schon
 * („Dann ist deine Serie für heute sicher“). Ein ganzer Tag ohne Lernen reißt sie.
 */
export function computeStreak(
  events: readonly LearningEvent[],
  now: Date = new Date(),
  timeZone?: string,
): StreakState {
  const today = dayKey(now, timeZone);
  const days = new Set(events.map((e) => e.day).filter((d) => d <= today));
  const runEndingAt = (end: string) => {
    let n = 0;
    for (let d = end; days.has(d); d = shiftDay(d, -1)) n++;
    return n;
  };
  const learnedToday = days.has(today);
  const yesterday = shiftDay(today, -1);
  if (learnedToday || days.has(yesterday)) {
    return {
      days: runEndingAt(learnedToday ? today : yesterday),
      learnedToday,
      previousDays: 0,
    };
  }
  const last = [...days].sort().at(-1);
  return { days: 0, learnedToday: false, previousDays: last ? runEndingAt(last) : 0 };
}

export type DailyGoalState = {
  done: number;
  goal: number;
  /** done >= goal */
  reached: boolean;
  /** done > goal */
  exceeded: boolean;
  remaining: number;
};

/** Tagesziel: Lernereignisse des heutigen Kalendertags gegen das Ziel. */
export function computeDailyGoal(
  events: readonly LearningEvent[],
  now: Date = new Date(),
  timeZone?: string,
  goal: number = DAILY_GOAL,
): DailyGoalState {
  const today = dayKey(now, timeZone);
  const done = events.filter((e) => e.day === today).length;
  return {
    done,
    goal,
    reached: done >= goal,
    exceeded: done > goal,
    remaining: Math.max(0, goal - done),
  };
}

/** Wirft, wenn der Speicher gesperrt oder der Inhalt kein gültiges JSON ist. */
function readLearningEvents(): LearningEvent[] {
  const raw = window.localStorage.getItem(KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(parsed)) throw new Error("cal-learn-events ist keine Liste");
  return parsed.filter(
    (e): e is LearningEvent =>
      !!e && typeof e.at === "string" && typeof e.day === "string",
  );
}

export function loadLearningEvents(): LearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return readLearningEvents();
  } catch {
    return [];
  }
}

/** Hält ein abgeschlossenes Lernereignis lokal fest. */
export function recordLearningEvent(
  kind: LearningEventKind,
  now: Date = new Date(),
): LearningEvent[] {
  const next = [
    ...loadLearningEvents(),
    { at: now.toISOString(), day: dayKey(now), kind },
  ].slice(-MAX_EVENTS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Speicher voll oder gesperrt: Lernen geht trotzdem weiter */
  }
  return next;
}

export type WeekDot = {
  /** Kurzname des Wochentags, `Mo` bis `So` */
  label: string;
  /** Mindestens ein Lernereignis an diesem Tag */
  learned: boolean;
  today: boolean;
  /** Liegt nach heute */
  future: boolean;
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Die sieben Punkte der laufenden Woche (Montag bis Sonntag) aus echten Lernereignissen (Figma 52:377). */
export function computeWeek(
  events: readonly LearningEvent[],
  now: Date = new Date(),
  timeZone?: string,
): WeekDot[] {
  const today = dayKey(now, timeZone);
  const [y, m, d] = today.split("-").map(Number);
  // 0 = Montag; rechnet auf Datumsebene, daher unabhängig von Sommerzeit.
  const sinceMonday = (new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() + 6) % 7;
  const learnedDays = new Set(events.map((e) => e.day));
  return WEEKDAYS.map((label, i) => {
    const day = shiftDay(today, i - sinceMonday);
    return { label, learned: learnedDays.has(day), today: day === today, future: day > today };
  });
}

/** Wochenpunkte für jetzt aus dem lokalen Speicher; ohne lesbaren Speicher eine leere Woche. */
export function loadWeek(): WeekDot[] {
  return computeWeek(loadLearningEvents());
}

/** Leere Woche für das Server-HTML (SIN-311): nichts erfunden, bis der lokale Speicher gelesen ist. */
export const EMPTY_WEEK: WeekDot[] = WEEKDAYS.map((label) => ({
  label,
  learned: false,
  today: false,
  future: false,
}));

export type LearningSummary = {
  streak: StreakState;
  goal: DailyGoalState;
};

/** Stand ohne Lernereignisse: Anzeige im Server-HTML, bis der lokale Speicher gelesen ist (SIN-311). */
export const EMPTY_LEARNING_SUMMARY: LearningSummary = {
  streak: { days: 0, learnedToday: false, previousDays: 0 },
  goal: { done: 0, goal: DAILY_GOAL, reached: false, exceeded: false, remaining: DAILY_GOAL },
};

/** Serie und Tagesziel für jetzt, aus dem lokalen Speicher. `"fehler"`, wenn dieser nicht lesbar ist (Figma 24). */
export function loadLearningSummary(): LearningSummary | "fehler" {
  try {
    const events = readLearningEvents();
    return { streak: computeStreak(events), goal: computeDailyGoal(events) };
  } catch {
    return "fehler";
  }
}

export type DailyGoalCopy = { title: string; text: string };

/**
 * Texte der Tagesziel-Karte (Figma 22 und 24). Die Serie bestraft keine Pausen:
 * nach einem Riss steht ein Neustart, keine Schuld. `dueCount` = fällige Wiederholungen.
 */
export function dailyGoalCopy(
  { streak, goal }: LearningSummary,
  dueCount: number,
): DailyGoalCopy {
  if (goal.exceeded) {
    return {
      title: `${goal.done} von ${goal.goal} geschafft`,
      text: "Stark. Mehr ist heute nicht nötig, Wiederholen wirkt am besten mit Pausen.",
    };
  }
  if (goal.reached) {
    return {
      title: "Tagesziel geschafft",
      text: `${goal.done} von ${goal.goal} Einheiten. Deine Serie ist für heute sicher.`,
    };
  }
  if (goal.done === 0 && streak.days === 0 && streak.previousDays > 0) {
    return {
      title: "Neue Serie, neuer Start",
      text: `Gestern hat es nicht geklappt, kein Problem. Deine ${streak.previousDays} Tage bleiben im Profil. Heute 1 Einheit, dann läuft die neue Serie.`,
    };
  }
  if (goal.done === 0) {
    return {
      title: `Tagesziel: 0 von ${goal.goal}`,
      text:
        dueCount > 0
          ? "Fang mit einer Wiederholung an, das dauert 3 Minuten."
          : "Fang mit einer Einheit an.",
    };
  }
  const n = goal.remaining;
  return {
    title: `Tagesziel: ${goal.goal} Einheiten`,
    text: `Noch ${n} ${n === 1 ? "Einheit" : "Einheiten"}, ca. ${n * MINUTES_PER_UNIT} Minuten.${
      streak.learnedToday ? " Dann ist deine Serie für heute sicher." : ""
    }`,
  };
}

/** „1 Tag“ / „8 Tage“ */
export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "Tag" : "Tage"}`;
}
