# SIN-263: Gemeinsamer JSON-Abruf mit Wiederholung, optionale Quellen dürfen ausfallen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-263/bug-planer-sturzt-ab-wenn-ein-dienst-kurz-keine-json-antwort-liefert
- Baut auf: SIN-253 (Nachfüllen), SIN-259 (Sentry), SIN-262 (2-h-Sperre)
- Doku: https://developers.linear.app/docs/graphql/working-with-the-graphql-api/rate-limiting, https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After

## Entscheidung

`scripts/autonomy/http.mjs` liefert `fetchJson(dienst, url, init, opts)`: prüft Status und Inhalt, wiederholt 3× bei 429, 5xx, Netzfehler und Fehlerseite statt JSON (Wartezeit 1 s, 4 s, 10 s; bei 429 gilt `Retry-After`, höchstens 30 s) und wirft einen `ServiceError` mit Dienst, Status und den ersten 80 Zeichen der Antwort. Rate-Limit-Header (`x-ratelimit-*`, `retry-after`) stehen im Protokoll. Linear, Sentry, Supabase, PostHog und die Kennzahlen des Wächters (Vercel, Langfuse) nutzen den Helfer.

- Optionale Quellen (Sentry, Supabase, PostHog, Figma, Vercel, Langfuse) melden bei Fehler „nicht messbar (Dienst: Grund)“ und der Planer läuft weiter.
- Pflicht ist nur Linear. Ist es nach den Wiederholungen weg, schreibt der Planer eine Warnung, legt nichts an und setzt `linear_ok=false`; die Schritte „Claude schreibt den Plan“ und „Issues anlegen“ entfallen, der Lauf bleibt grün.
- Die 2-h-Sperre liegt im Merker `lastRefill` des Wächters. Ist Linear nicht lesbar, löst der Wächter nicht mehr aus (vorher zählte „0 startbar“ als Anlass) und lässt `lastRefill` unverändert; der nächste Takt versucht es erneut.
- Linear-Anfragen: Team-Status werden je Lauf einmal gelesen statt je Issue (`stateIdByName`); Wächter und Status-Seite lesen die Issues bereits mit einem Abruf pro Lauf.

## Annahmen

- Eine Antwort mit HTTP 200, die kein JSON ist, zählt als kurzer Ausfall und wird wiederholt. Statt des Content-Type entscheidet das Parsen; der Content-Type steht nur in der Fehlermeldung.
- GraphQL-Fehler von Linear (`errors` im Body) sind keine Ausfälle und werden nicht wiederholt.
- 4xx außer 429 (z. B. 401) wird nicht wiederholt. Bei Linear führt auch das zum sauberen Abbruch mit Warnung, nicht zum Absturz.
- Die Wächter-Takte (15 Min) liegen bei cron-job.org; im Repo ist das nicht änderbar.

## Warum

Ein einzelner 502 mit Fehlerseite ließ den ganzen Planer abstürzen (`Unexpected token 'u'`), die Schlange blieb 2 h leer. Eigener Helfer statt Bibliothek: wenige Zeilen, keine neue Abhängigkeit.
