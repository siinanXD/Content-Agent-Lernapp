# SIN-392 — Sentry speichert IP und Standort trotz sendDefaultPii false

- **Links:** Linear [SIN-392](https://linear.app/sinan-kahraman/issue/SIN-392/sentry-speichert-ip-und-standort-trotz-senddefaultpii-false-ursache); [Sentry: Sensitive Data](https://docs.sentry.io/security-legal-pii/scrubbing/); [Sentry: Next.js Options (`sendDefaultPii`)](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/). Vorgänger: SIN-259, SIN-273.
- **Entscheidung:**
  1. `beforeSend` (Fehler) und neu `beforeSendTransaction` (Transaktionen, vorher ungefiltert) nutzen `scrubEvent`, in allen drei Inits (Client, Server, Edge) über `SENTRY_PRIVACY_OPTIONS`. Der Client gated beide mit der Einwilligung.
  2. Test: Ereignis mit `user.ip_address`, `user.geo` und `request.headers` kommt ohne diese Felder heraus.
  3. Die IP-Ableitung aus der Verbindung macht Sentry serverseitig; das SDK kann sie nicht abschalten. Dafür gilt die Projekteinstellung „Prevent Storing of IP Addresses“ (Sinan-Aufgabe, eigenes Issue mit Label `sinan`).
- **Annahmen:**
  1. Die Sentry-Doku war in der Agent-Umgebung nicht abrufbar (kein Web-Zugriff), die Links sind nicht live geprüft. Geprüft wurde stattdessen der Quelltext von `@sentry/browser`/`@sentry/core` 11.x: Die Sitzungs-IP `{{auto}}` wird nur bei `sendDefaultPii` gesetzt, mit `false` also nicht.
  2. `scrubEvent` entfernte `user` schon vollständig; das Ereignis CONTENT-AGENT-LERNAPP-1 stammt daher wahrscheinlich aus der serverseitigen IP-Ableitung (Projekteinstellung aus) oder von einem älteren Release. Nicht belegt.
  3. Bestehende Ereignisse bleiben; Löschen entscheidet Sinan.
- **Warum:** Das SDK sendet keine IP mehr; was Sentry selbst aus der Verbindung ableitet, stoppt nur die Projekteinstellung.
