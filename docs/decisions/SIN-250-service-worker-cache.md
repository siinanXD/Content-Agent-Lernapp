# SIN-250 — Service-Worker: Cache folgt dem Deploy

- **Links:** Linear [SIN-250](https://linear.app/sinan-kahraman/issue/SIN-250/bug-service-worker-liefert-nach-deploys-alte-seiten-fester-cache-name); [MDN: skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting); [web.dev: Service-Worker-Lebenszyklus](https://web.dev/articles/service-worker-lifecycle). Workbox wäre eine fertige Lösung, für drei Regeln aber eine zusätzliche Abhängigkeit; Eigenbau in `public/sw.js`.
- **Entscheidung:** Cache-Name `cal-shell-<buildId>`; die Kennung kommt als `/sw.js?v=<buildId>` (aus `NEXT_PUBLIC_BUILD_ID`, gesetzt in `next.config.ts` aus `VERCEL_GIT_COMMIT_SHA`). `activate` löscht alle anderen Caches, damit auch `cal-shell-v1` verschwindet. HTML und übrige GETs: network-first, offline aus dem Cache, sonst `/offline.html`. `/_next/static/*`: cache-first. `/api/*` wird nicht angefasst. `sw.js` wird mit `no-cache` ausgeliefert.
- **Annahmen:**
  1. Statt eines Hinweis-Banners (wäre eine neue Komponente, braucht ein Design-Issue) lädt die App nach `controllerchange` einmal automatisch neu, aber nur, wenn die Seite schon von einem Worker kontrolliert wurde (kein Reload beim Erstbesuch).
  2. Die Seiten `/`, `/lernpfad` usw. werden nicht mehr vorab gecacht, sondern beim ersten Besuch; vorab nur `offline.html` und Manifest.
  3. Bestehende Nutzer: Der Browser holt `/sw.js` ohnehin neu (byte-verschieden); der neue Worker räumt `cal-shell-v1` ab.
  4. E2E simuliert Deploy B über eine zweite Build-Kennung; ein echter Zweit-Deploy ist in CI nicht möglich.
- **Warum:** Ein fester Cache-Name und cache-first auf HTML hielt alte Seiten über Deploys hinweg; Build-Kopplung plus network-first beendet das, ohne den Offline-Betrieb zu verlieren.
