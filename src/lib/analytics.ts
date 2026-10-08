/**
 * Learner analytics helpers (PostHog).
 * No-op when NEXT_PUBLIC_POSTHOG_KEY is missing so builds/tests work offline.
 * EU host: NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
 * @see https://posthog.com/docs/libraries/next-js
 */

type Props = Record<string, string | number | boolean | null | undefined>;

function capture(event: string, properties?: Props): void {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return;

  void import("posthog-js")
    .then(({ default: posthog }) => {
      if (!posthog.__loaded) return;
      posthog.capture(event, properties);
    })
    .catch(() => {
      /* analytics must never break learning */
    });
}

/** Verwirft die Zufalls-Kennung dieses Geräts (Einstellungen · Nutzungsdaten löschen). */
export async function forgetAnalyticsUser(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return;
  try {
    const [{ default: posthog }, { forgetPostHogUser }] = await Promise.all([
      import("posthog-js"),
      import("@/lib/analytics-consent"),
    ]);
    forgetPostHogUser(posthog);
  } catch {
    /* analytics must never break the app */
  }
}

/** Fired when a learner opens a Einheit. */
export function trackUnitStarted(properties: {
  unitId: string;
  unitTitle?: string;
  moduleId?: string;
  variant?: string;
}): void {
  capture("unit_started", properties);
}

/** Fired when a learner finishes a Einheit (Ergebnis). */
export function trackUnitCompleted(properties: {
  unitId: string;
  unitTitle?: string;
  correct: number;
  total: number;
  points?: number;
}): void {
  capture("unit_completed", properties);
}

/** Fired after a question is checked (auto or self-check). */
export function trackQuestionAnswered(properties: {
  unitId: string;
  questionId: string;
  correct: boolean;
  questionType?: string;
  level?: string;
  selfChecked?: boolean;
}): void {
  capture("question_answered", properties);
}

/** Fired when a learner reports that an AI explanation does not fit ("Passt nicht? Melden"). */
export function trackExplanationReported(properties: {
  unitId: string;
  questionId: string;
}): void {
  capture("explanation_reported", properties);
}

/** Onboarding: Schritt angezeigt (nur Schrittname, keine Auswahl). */
export function trackOnboardingStep(properties: { step: "schwerpunkt" }): void {
  capture("onboarding_step", properties);
}

/** Onboarding abgeschlossen. Der Schwerpunkt ist eine amtliche Kennung, keine Personendaten. */
export function trackOnboardingCompleted(properties: { schwerpunktId: string }): void {
  capture("onboarding_completed", properties);
}

/** Einheit verlassen, ohne sie zu beenden. Nur Zahlen, keine Antworten. */
export function trackUnitAbandoned(properties: {
  unitId: string;
  answered: number;
  total: number;
}): void {
  capture("unit_abandoned", properties);
}

/** Wiederholungsrunde gestartet. */
export function trackReviewStarted(properties: { total: number }): void {
  capture("review_started", properties);
}

/** Wiederholungsrunde beendet. */
export function trackReviewCompleted(properties: { correct: number; total: number }): void {
  capture("review_completed", properties);
}

/** Wiederholungsrunde verlassen, ohne sie zu beenden. */
export function trackReviewAbandoned(properties: { answered: number; total: number }): void {
  capture("review_abandoned", properties);
}
