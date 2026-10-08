# SIN-407: Abbruchstellen im Kennzahlen-Bericht

- Links: Linear SIN-407, SIN-373, SIN-387, `docs/ops/posthog-ereignisse.md`, PostHog HogQL https://posthog.com/docs/api/query
- Entscheidung: `scripts/autonomy/posthog.mjs` nennt je Schritt (Onboarding, Einheit, Wiederholung) die Quote, die höchstens 3 häufigsten Abbruchstellen und die meistverlassenen Einheiten. Bei leeren Daten trennt eine Zusatzabfrage „irgendein Ereignis“: da = keine Nutzung, nicht da = Key fehlt oder keine Einwilligung.
- Annahmen: Es gibt kein Prüfungs-Ereignis, daher nur vorhandene Ereignisse (Einheit, Wiederholung, Onboarding). Key fehlt und fehlende Einwilligung sind von außen nicht unterscheidbar (beides sendet nichts). Die Einwilligungslogik bleibt unberührt.
- Warum: Keine neuen Ereignisse oder Screens, nur Besucherzahlen und Inhaltskennungen, keine Personendaten.
