# SIN-796: Workflow `content-publish` setzt einen Kurs nach Prüfung auf published

- Issue: https://linear.app/sinan-kahraman/issue/SIN-796
- Vorarbeit: SIN-768 (Befund, PR #391), SIN-777 (Lernpfad zeigt nur `published`)

## Entscheidung

- Neuer Workflow `content-publish` (nur `workflow_dispatch`, Eingabe `keyword`, `dry_run` Standard an). Secrets wie bei `content-grow` aus dem Infisical-Sync; nur `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`.
- Die Prüfungen liegen in `src/lib/review/veroeffentlichen.ts` und nutzen den Wächter aus SIN-297 (`pruefeVeroeffentlichung`): Quelle und Abrufdatum am Kurs und je Einheit, KI-Kennzeichnung, Personendaten, IHK-Marker, Prüfhinweise. Dazu der Richter: jede sichtbare Frage hat als letzte Bewertung „bestanden“.
- Mängel brechen mit Liste ab (Exit 1, nichts geschrieben). Sonst setzt `scripts/content-publish.ts` `courses.status = published`, danach das Ereignis `publish` in `loop_events` (Schritt `publish`, Agent Content), eine Prüfung gegen `/api/kurse` und der Start von `nach-deploy` (Live-Check).
- Echtlauf nur per Hand-Start mit `dry_run` aus. Das Label `freigegeben` gilt für PRs, nicht für Workflow-Starts; der Hand-Start ist die Freigabe.

## Annahmen

- Streng gegenüber der App: Die App zeigt Fragen ohne Bewertung weiter an (SIN-395), der Workflow verlangt für eine Veröffentlichung dagegen eine bestandene Bewertung je sichtbarer Frage. Kurse mit unbewerteten Fragen müssen erst den Bewertungslauf durchlaufen.
- „Verbotsliste“ = die Prüfungen des Wächters in `content-guard.ts`; `regeln.ts` ist die Prompt-Liste und wird nicht noch einmal angewendet.
- Entwürfe und nur geprüfte Einheiten (SIN-628) zählen nicht mit, weil Lernende sie nie sehen.
- Stichwort wird ohne Groß-/Kleinschreibung verglichen; mehrdeutig oder unbekannt bricht ab. `listCourses` lädt alle Kurse, bei wenigen Kursen vertretbar.
- Der Echtlauf für Industriemechaniker steht noch aus: Er braucht den Hand-Start in GitHub Actions (siehe PR).

## Warum

Die Cloud-Worker haben keinen Schreibzugriff auf die Datenbank; ein Workflow mit Service-Key aus Infisical ist der einzige Weg, der ohne neues Secret auskommt und jede Veröffentlichung nachvollziehbar macht.
