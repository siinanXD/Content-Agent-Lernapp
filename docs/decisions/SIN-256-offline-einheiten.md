# SIN-256 — Offline: Einheiten und Wiederholung ohne Netz

- **Links:** Linear [SIN-256](https://linear.app/sinan-kahraman/issue/SIN-256/offline-nutzung-einheiten-und-wiederholung-ohne-netz); [MDN: Offline und Hintergrund-Sync](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation); [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine). Workbox (Background Sync) wäre fertig, ist aber eine zusätzliche Abhängigkeit, und die Background-Sync-API gibt es nicht in Safari/Firefox; Eigenbau mit `online`-Ereignis.
- **Entscheidung:**
  1. Der Service Worker (`public/sw.js`) bedient zusätzlich `GET /api/learner/phase-a` network-first mit Cache-Fallback. Damit findet ein harter Neuaufruf einer Einheit offline den Kurs; andere `/api/*`-Pfade bleiben unberührt.
  2. Antworten aus Einheit und Wiederholung kommen in eine Warteschlange in `localStorage` (`cal-progress-outbox`, höchstens 500 Einträge) und gehen an `POST /api/progress`. Gesendet wird sofort, beim App-Start und bei jedem `online`-Ereignis, der Reihe nach. Bei Netz- oder 5xx-Fehler bleibt der Rest liegen, 4xx-Ereignisse werden verworfen.
  3. Hinweis offline: vorhandene Komponente `StateView kind="offline"` (Screen 17) mit kurzem Text „Antworten werden gespeichert und später gesendet.“ auf Einheit und Wiederholung. Keine neue Komponente, keine neuen Tokens.
  4. Der Online-Hook aus dem Lernpfad liegt jetzt in `src/lib/use-online.ts`.
- **Annahmen:**
  1. Offline bedienbar ist, was online schon einmal geladen wurde: die Seite (HTML, network-first) und der Kurs-Snapshot. Die Ergebnis-Seite muss einmal besucht worden sein; sonst zeigt der Worker beim Wechsel `offline.html`. Ein gezieltes Vorladen aller Einheiten ist nicht Teil dieses Issues.
  2. Die Zufalls-Kennung (`cal-anonymous-id`, `crypto.randomUUID`) enthält keine Personendaten und entspricht dem bestehenden Vertrag von `/api/progress`. Sie wird erst beim ersten Senden angelegt.
  3. `/api/progress` hat keine Idempotenz. Geht eine Antwort des Servers verloren, kann ein Ereignis doppelt ankommen; für Lernstatistik hinnehmbar. Idempotenz-Schlüssel wären ein eigenes Backend-Issue.
  4. Leitner-Stapel und Sitzung liegen weiter in `sessionStorage` (Bestand). Offline bleibt der Stapel pro Tab-Sitzung erhalten; Umzug nach `localStorage` ist nicht Teil dieses Issues.
  5. Der Playwright-Test nutzt `context.route` für die Server-Antworten und `context.setOffline`. Er lief lokal nicht (Browser-Download in der Agent-Umgebung gesperrt), sondern erst in der CI.
- **Warum:** Lernende sollen Einheit und Wiederholung auch bei schlechtem Netz zu Ende bringen, ohne Antworten zu verlieren. Der kleinste Weg ohne neue Abhängigkeit sind drei Bausteine: Kurs im Worker-Cache, lokale Warteschlange, Hinweis aus der vorhandenen Zustands-Komponente.
