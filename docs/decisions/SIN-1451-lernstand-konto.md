# SIN-1451: Lernstand gehört zum Konto

Stand: 02.11.2026. Risiko `risk:high` (Migration, RLS), Sinan merged.

## Entscheidung

Angemeldete Konten speichern Lernereignisse (Serie, Tagesziel, abgeschlossene Einheiten) und den Wiederholungs-Stapel in `public.learner_state`, eine Zeile je Konto, RLS auf `auth.uid()`. Der Browser spricht direkt mit Supabase (Anon-Key plus Sitzung des Kontos), es gibt keine neue API-Route und keinen Service-Role-Key im Weg. Fertige Lösung statt Eigenbau: Supabase-Auth, PostgREST und RLS sind schon im Einsatz; ein Sync-Framework (z. B. PowerSync, RxDB) wäre eine neue Abhängigkeit für zwei kleine Listen.

## Annahmen

- „Schema der Lernapp“: im Repo gibt es nur das Schema `public` mit eigenen Tabellen (z. B. `trainer_groups`, `learning_progress`). Die neue Tabelle folgt dem und heißt `learner_state`. Ein eigenes Schema bräuchte zusätzliche Exposed-Schema-Einstellungen in Supabase (Sinans Konto) und wäre ein Bruch zum Bestand.
- Abgleich = Vereinigung, nie Ersetzen: Ereignisse nach (Zeitpunkt, Art, Einheit), Stapel je Frage der jüngere Eintrag. Jede Stufenänderung trägt einen Änderungszeitpunkt (`at`), eine fertig gelernte Frage (Stufe 4 richtig) hinterlässt einen Löschvermerk im selben `stack`-Feld (`entfernt: true`, keine Schemaänderung). Offline begonnene Einheiten bleiben deshalb erhalten, Entfernen und Zurücksetzen auf Stufe 1 gelten auch gegenüber dem Konto. Grenze (im Code als `shortcut` vermerkt): nur die jüngsten 500 Löschvermerke bleiben; Stände von vor diesem Fix haben keinen Zeitpunkt und gelten als die ältesten.
- Der Stapel liegt jetzt in `localStorage` statt `sessionStorage` (sonst wäre er offline nach Tab-Schließen weg); ältere Stände werden weiter gelesen.
- Gemeinsames Gerät: der lokale Stand merkt sich sein Konto (`cal-lernstand-konto`). Meldet sich ein anderes Konto an, wird der lokale Stand zuerst geleert; Stand ohne Konto (anonym gelernt) wird beim ersten Anmelden ins Konto übernommen.
- Beispielmodus (`?demo=1`) und anonyme Messung (`/api/progress`, Zufalls-ID) bleiben unverändert.
- Ansichten, die den Stand nur beim Laden lesen (`/lernpfad`, `/profil`), laden nach einem Abgleich, der lokal etwas geändert hat, einmal neu. Andere Seiten (z. B. mitten in einer Einheit) werden nie unterbrochen.

## Nach dem Merge (Sinan)

Migration `20261102010000_sin1451_learner_state.sql` anwenden (läuft über `migrate.yml`), danach `scripts/verify-sin1451-rls.sql` per psql auf Staging mit `ON_ERROR_STOP=1`.

## Entwurf Datenschutzerklärung (nicht live; die Seite `content/legal/datenschutz.md` ändert Sinan nach Prüfung)

Abschnitt 2, Satz ergänzen:

> Lernstand: Für angemeldete Konten speichern wir, welche Einheiten Sie abgeschlossen haben (Einheit-ID, Zeitpunkt, Tag), die Fragen Ihres Wiederholungs-Stapels mit Stufe und Fälligkeit sowie daraus Ihre Lernserie. Der Stand ist Ihrem Konto zugeordnet, damit er bei einem Gerätewechsel erhalten bleibt. Auf Ihrem Gerät bleibt eine Kopie für das Lernen ohne Internet.

Abschnitt 3: Vertrag (Art. 6 Abs. 1 lit. b DSGVO) deckt den Lernstand ab, keine zusätzliche Einwilligung nötig.

Abschnitt 5: „Konto und Lernfortschritt (inkl. Lernstand): bis zur Löschung des Kontos; mit dem Konto wird die Zeile gelöscht.“

Empfänger: unverändert Supabase (EU, Irland).
