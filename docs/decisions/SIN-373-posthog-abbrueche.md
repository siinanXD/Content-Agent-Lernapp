# SIN-373: PostHog-Ereignisse für Abbrüche im Lernweg

- Links: [PostHog Capture-API](https://posthog.com/docs/product-analytics/capture-events), [PostHog Query-API](https://posthog.com/docs/api/query), `docs/ops/posthog-ereignisse.md`, [SIN-354](SIN-354-einwilligung-demo-beleg.md)
- Entscheidung: Neue Ereignisse `onboarding_step`, `onboarding_completed`, `unit_abandoned`, `review_started`, `review_completed`, `review_abandoned` über den bestehenden Einwilligungs-Weg (`src/lib/analytics.ts`). Abbruch wird beim Verlassen der Seite (Unmount, `pagehide`) gemeldet. Das Kennzahlen-Skript gibt die Abbruchquote je Schritt aus oder den Grund für leere Daten.
- Annahmen: Die Einwilligungsseite sendet nichts, da vor der Zustimmung keine Anfrage erlaubt ist; der Onboarding-Start ist daher der Schritt „Schwerpunkt“. Abbrüche per hartem Browser-Ende werden nicht erfasst (Quote leicht zu niedrig). Die Quote je Schritt nutzt Ereigniszahlen, nicht Personen (keine Kennung nötig).
- Warum: Ohne diese Ereignisse war die Kennzahl leer und Abbrüche nicht messbar. Nur vorhandene UI, keine Personendaten, keine Antwortinhalte.
