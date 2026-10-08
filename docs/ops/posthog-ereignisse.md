# PostHog: Ereignisse im Lernweg (SIN-373)

Gesendet wird nur nach Einwilligung (SIN-354, `src/lib/analytics-consent.ts`). Ohne Einwilligung gibt es kein `init`, also keine Anfrage (`e2e/einwilligung-tracking.spec.ts`). Alle Ereignisse enthalten nur Kennungen von Inhalten und Zahlen: keine Namen, keine E-Mail, keine Antworttexte.

Code: `src/lib/analytics.ts`.

| Ereignis | Wann | Eigenschaften |
| --- | --- | --- |
| `onboarding_step` | Seite „Schwerpunkt wählen“ angezeigt | `step` |
| `onboarding_completed` | Schwerpunkt bestätigt | `schwerpunktId` (amtliche Kennung) |
| `unit_started` | Einheit geöffnet | `unitId`, `unitTitle`, `moduleId`, `variant` |
| `question_answered` | Frage geprüft | `unitId`, `questionId`, `correct`, `questionType`, `level`, `selfChecked` |
| `unit_completed` | Einheit beendet (Ergebnis) | `unitId`, `unitTitle`, `correct`, `total`, `points` |
| `unit_abandoned` | Einheit verlassen oder Tab geschlossen, ohne Ende | `unitId`, `answered`, `total` |
| `explanation_reported` | „Passt nicht? Melden“ | `unitId`, `questionId` |
| `review_started` | Wiederholungsrunde mit fälligen Fragen geöffnet | `total` |
| `review_completed` | Runde beendet | `correct`, `total` |
| `review_abandoned` | Runde verlassen, ohne Ende | `answered`, `total` |

Dazu `$pageview` und `$pageleave` von PostHog selbst.

## Kennzahl `posthog`

`scripts/autonomy/posthog.mjs` fragt die letzten 7 Tage ab und nennt die Abbruchquote je Schritt: Onboarding (`onboarding_step` → `onboarding_completed`), Einheit (`unit_started` → `unit_completed`), Wiederholung (`review_started` → `review_completed`). Gezählt werden Besucher je Ereignis, nicht Ereignisse. Quote = 1 − beendet / gestartet.

Ist die Liste leer, steht der Grund da: keine Einwilligung, kein `NEXT_PUBLIC_POSTHOG_KEY` im Build oder noch keine Nutzung. Fehlen die Secrets, steht „nicht verfügbar“.

## Grenzen

- Abbruch wird beim Verlassen der Seite (Seitenwechsel, `pagehide`) gemeldet. Ein hartes Beenden des Browsers kann ohne Meldung bleiben, die Quote ist dann etwas zu niedrig.
- Die Einwilligungsseite selbst sendet nichts (vor der Zustimmung darf nichts gesendet werden).
