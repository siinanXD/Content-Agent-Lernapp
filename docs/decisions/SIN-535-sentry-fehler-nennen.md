# SIN-535: Sentry-Kennzahl nennt Titel, Häufigkeit und Link

- Issue: https://linear.app/sinan-kahraman/issue/SIN-535
- Verwandt: [SIN-498](SIN-498-sentry-ungeloester-fehler.md) (dokumentiert nur die Zahl, kein Code-Fix; kein Konflikt)
- Code: `scripts/autonomy/sentry.mjs`, Test `src/lib/sentry.test.ts`

## Entscheidung

- Die Kennzahl `sentry` hängt hinter die Zahl bis zu 3 Fehler: `„Titel“ (12×, Link)`. Die Zahl vorn bleibt unverändert, Leser der Kennzahl brechen nicht.
- Personendaten: Titel ohne E-Mail und IP, auf 100 Zeichen gekürzt; Link ohne Query und Fragment. Es werden nur Titel, Anzahl und Link gelesen, nichts sonst aus dem Sentry-Ereignis.

## Annahmen

- Die Sentry-Issue-Liste liefert `title`, `count` und `permalink` (API-Doku: List a Project's Issues).
- SIN-498 deckt denselben Fehler ab, hat aber nur dokumentiert. Dieser PR liefert die Angabe, mit der der Planer ihn gezielt anlegen kann.

## Warum

- Kleinster Eingriff: keine neue Kennzahl, kein neuer Abruf (die vorhandene Abfrage liefert die Felder schon).
