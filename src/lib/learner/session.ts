import type { AreaResult } from "@/lib/learner/exam";
import type { ReviewItem, WrongAnswer } from "@/lib/learner/exam-result";
import { demoSession, isDemoMode } from "@/lib/learner/demo-modus";

export type LearnerSession = {
  keyword: string;
  variant: "pruefung" | "weiterbildung";
  totalPoints: number;
  lastResult?: {
    unitId: string;
    unitTitle: string;
    correct: number;
    total: number;
    points: number;
    kind?: "unit" | "exam" | "review";
    areaResults?: AreaResult[];
    partTitle?: string;
    /** Falsch beantwortete Prüfungsfragen (kommen in die Wiederholung). */
    wrongAnswers?: WrongAnswer[];
    /** Alle Prüfungsfragen mit Antwort, Lösung, Erklärung und Quelle; erst im Ergebnis sichtbar (SIN-1538). */
    review?: ReviewItem[];
  };
};

const KEY = "cal-learner-session";

export function loadSession(): LearnerSession | null {
  if (typeof window === "undefined") return null;
  if (isDemoMode()) return demoSession();
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LearnerSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: LearnerSession) {
  if (isDemoMode()) return;
  window.sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  if (isDemoMode()) return;
  window.sessionStorage.removeItem(KEY);
}
