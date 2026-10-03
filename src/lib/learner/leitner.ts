/**
 * Leitner review stack (AP-18c): stages 1→4 with intervals 1/3/7/14 days.
 * Wrong → stage 1; correct → stage + 1; stage 4 correct → leave stack.
 */

import {
  LEITNER_INTERVALS_DAYS,
  type ReviewItem,
} from "@/lib/content/didaktik";

const KEY = "cal-leitner-stack";

export type LeitnerStack = {
  items: ReviewItem[];
  updatedAt: string;
};

export function emptyStack(): LeitnerStack {
  return { items: [], updatedAt: new Date().toISOString() };
}

export function loadStack(): LeitnerStack {
  if (typeof window === "undefined") return emptyStack();
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return emptyStack();
    return JSON.parse(raw) as LeitnerStack;
  } catch {
    return emptyStack();
  }
}

export function saveStack(stack: LeitnerStack) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    KEY,
    JSON.stringify({ ...stack, updatedAt: new Date().toISOString() }),
  );
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function dueItems(
  stack: LeitnerStack,
  now: Date = new Date(),
  limit = 10,
): ReviewItem[] {
  const t = now.toISOString();
  return stack.items
    .filter((i) => i.dueAt <= t)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.stage - b.stage)
    .slice(0, limit);
}

/** Wrong answer: insert or reset to stage 1, due tomorrow. */
export function markWrong(stack: LeitnerStack, questionId: string, now = new Date()): LeitnerStack {
  const dueAt = addDays(now.toISOString(), LEITNER_INTERVALS_DAYS[1]);
  const rest = stack.items.filter((i) => i.questionId !== questionId);
  return {
    items: [...rest, { questionId, stage: 1, dueAt }],
    updatedAt: now.toISOString(),
  };
}

/**
 * Correct answer:
 * - If already in stack: promote; stage 4 correct removes item.
 * - If anwenden and not in stack: enter at stage 2 (long interval retention).
 */
export function markCorrect(
  stack: LeitnerStack,
  questionId: string,
  opts: { anwenden?: boolean } = {},
  now = new Date(),
): LeitnerStack {
  const existing = stack.items.find((i) => i.questionId === questionId);
  const rest = stack.items.filter((i) => i.questionId !== questionId);

  if (existing) {
    if (existing.stage >= 4) {
      return { items: rest, updatedAt: now.toISOString() };
    }
    const next = (existing.stage + 1) as 1 | 2 | 3 | 4;
    const dueAt = addDays(now.toISOString(), LEITNER_INTERVALS_DAYS[next]);
    return {
      items: [...rest, { questionId, stage: next, dueAt }],
      updatedAt: now.toISOString(),
    };
  }

  if (opts.anwenden) {
    const stage = 2 as const;
    return {
      items: [
        ...rest,
        {
          questionId,
          stage,
          dueAt: addDays(now.toISOString(), LEITNER_INTERVALS_DAYS[stage]),
        },
      ],
      updatedAt: now.toISOString(),
    };
  }

  return stack;
}

export function stackSize(stack: LeitnerStack): number {
  return stack.items.length;
}
