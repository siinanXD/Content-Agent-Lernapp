# SIN-771: Stripe-Abo im Testmodus

Links: [Checkout-Sitzung anlegen](https://docs.stripe.com/api/checkout/sessions/create), [Abo mit Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions) (per Context7 gelesen, 16.10.2026).

**Entscheidung:** Stripe Checkout (gehostete Seite, Abo-Modus) per REST mit `fetch`, ohne SDK und ohne Datenbank. `/abo` startet, `/abo/bestaetigung` liest den Stand der Sitzung. Schlüssel `STRIPE_SECRET_KEY` und Preis `STRIPE_PRICE_ID` kommen aus der Umgebung; nur `sk_test_`/`rk_test_` werden angenommen, Sitzungen mit `livemode: true` gelten als Fehler. Der Live-Schalter bleibt unberührt.

**Annahmen:**
- Kein Webhook und keine Speicherung nötig: „durchspielbar bis zur Bestätigung“ heißt Anmeldung → Checkout → Bestätigungsseite. Ein Webhook (Abo einem Konto zuordnen) folgt mit dem Live-Schalter.
- Es gibt keinen Preis im Code. Sinan legt Produkt und Preis im Stripe-Testmodus an (Aufgabe `sinan`).
- Figma hat keinen Screen für das Abo. Die Seiten nutzen vorhandene Komponenten; Ein Design-Issue (Label `design`) ist noch nicht angelegt; der Planer bündelt es ins nächste Design-Paket.
- Der Pfad enthält „abo“, Code berührt Zahlung: Sinan prüft den PR (risk:high ist zu erwarten).

**Warum:** Zwei REST-Aufrufe sind weniger Abhängigkeit als das Stripe-SDK; Checkout nimmt uns Kartendaten und PCI-Pflichten ab.
