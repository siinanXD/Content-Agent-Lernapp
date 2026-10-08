# Screenreader-Prüfliste Lernweg (SIN-370)

`qual-wcag` ist automatisch belegt (axe-core, Tastatur-Tests in `e2e/`). Diese Liste ist der **manuelle** Test, den ein Mensch einmal durchläuft. Die Aufgabe dafür liegt als Linear-Issue mit Label `sinan` (siehe PR).

Geprüft wird mit mindestens einem Paar: VoiceOver + Safari (iPhone, Handy 390 px) und NVDA + Firefox oder Chrome (Windows, Desktop). Landmarks und Überschriften über Rotor bzw. Elementliste öffnen.

Der erwartete Vorlesetext ist der Sollwert aus dem Code (Stand SIN-370). Kleine Abweichungen der Sprachausgabe („Schaltfläche“ statt „Button“) sind kein Fehler. Fehlt ein Teil, falsche Reihenfolge, Doppelung oder Stille: Befund notieren.

## Für alle Routen

- [ ] Genau ein Landmark „Hauptbereich“ (`main`) und genau eine Überschrift Ebene 1.
- [ ] Tab-Reihenfolge entspricht der Lesereihenfolge, Fokus immer sichtbar und nie verloren.
- [ ] Symbole werden nicht vorgelesen (sind `aria-hidden`), Farbe trägt nie allein die Aussage.

## 1. Start (`/start`, erster Start leitet nach `/willkommen`)

| Schritt | Aktion | Erwarteter Vorlesetext |
| --- | --- | --- |
| 1.1 | Seite öffnen | „Content-Agent-Lernapp, Überschrift Ebene 1“ |
| 1.2 | Weiter lesen | „Aus einem Schlagwort wird dein MAF-Kurs.“ dann „Offizielle AO und RLP …“ |
| 1.3 | Tab | „Schlagwort, Eingabefeld“ (Beschriftung, nicht nur Platzhalter) |
| 1.4 | Tab | Gruppe „Lernvariante“, „Prüfungsvorbereitung · 2 Monate …, Schaltfläche, nicht gedrückt“ |
| 1.5 | Variante wählen | Zustand wechselt auf „gedrückt“ |
| 1.6 | Tab | „Kurs erzeugen, Schaltfläche“; ohne Schlagwort „nicht verfügbar“ |

## 2. Einheit (`/einheit/<id>`)

| Schritt | Aktion | Erwarteter Vorlesetext |
| --- | --- | --- |
| 2.1 | Seite öffnen | „Einheit M0 · 03 · 7 Min …“, Überschrift Ebene 1 mit dem Einheitentitel |
| 2.2 | Erklärung lesen | Abschnitte Einstieg, Kern, Beispiel, Merksatz bzw. „Erklärung“, danach Quelle |
| 2.3 | Frage erreichen | „Frage 1 von N · Typ · Niveau“, Überschrift Ebene 2 mit dem Fragetext |
| 2.4 | Tab durch Antworten | Je Antwort „<Text>, Schaltfläche, nicht gedrückt“; gewählt: „gedrückt“ |
| 2.5 | Lückentext | Gruppe „Lückentext“, Wortliste |
| 2.6 | Zuordnen | Gruppe „Zuordnen“, je Zeile „Zuordnung für <Begriff>, Auswahlliste, Bitte wählen“ |
| 2.7 | Reihenfolge | Liste „Reihenfolge“, je Eintrag „1. <Schritt>“ plus „<Schritt> nach oben“ / „nach unten“ |
| 2.8 | Rechnen offen | „Deine Lösung (wird nicht von KI bewertet), Eingabefeld“, nach Antwort Bereich „Musterlösung zur Selbstkontrolle“ |
| 2.9 | „Antwort prüfen“ | **Automatisch, ohne Fokuswechsel:** „Richtig.“ bzw. „Nicht ganz. Richtige Antwort: …“, danach die Erklärung (Live-Region) |
| 2.10 | Feedback lesen | „Richtig“ / „Nicht ganz“ genau einmal (kein doppeltes „RICHTIG … Richtig“), Erklärung, Quelle |
| 2.11 | „Warum?“ | „Warum?, Schaltfläche, ausgeklappt“; Panel mit Erklärung, einfacher Erklärung, Quelle, Vorlesen, Schließen |
| 2.12 | „Weiter“ | Fokus springt auf die neue Frage: „<Fragetext>, Überschrift Ebene 2“ |
| 2.13 | Letzte Frage | Schaltfläche heißt „Ergebnis anzeigen“ |
| 2.14 | Offline | Hinweis „Antworten werden gespeichert und später gesendet.“ |

## 3. Ergebnis (`/ergebnis`)

| Schritt | Aktion | Erwarteter Vorlesetext |
| --- | --- | --- |
| 3.1 | Seite öffnen | „Einheit geschafft, Überschrift Ebene 1“, danach „<Titel> · X von Y richtig“ |
| 3.2 | Fortschrittsring | Wert als Text („X von Y richtig“), nicht nur als Farbe |
| 3.3 | Werte | „Punkte heute +N“, „Serie N Tage“ |
| 3.4 | Ohne Ergebnis | „Noch kein Ergebnis“, „Schließe eine Einheit ab …“ (keine erfundenen Zahlen) |
| 3.5 | Prüfungsgebiete | Liste „Ampel je Gebiet“: Titel, „a/b · p%“, Ampel als Wort |
| 3.6 | Links | „Weiter lernen“, „Zur Wiederholung“, „Für heute fertig“ |

## 4. Wiederholung (`/wiederholung`)

| Schritt | Aktion | Erwarteter Vorlesetext |
| --- | --- | --- |
| 4.1 | Laden | „Wiederholungsstapel wird geladen“ |
| 4.2 | Stapel | Überschrift „Fällige Fragen“, danach Stufen und Gebiete mit Überschriften |
| 4.3 | Fragen | wie 2.3 bis 2.12 |
| 4.4 | Nichts fällig | „Heute nichts fällig, Überschrift Ebene 1“ |
| 4.5 | Fertig | „Wiederholung fertig, Überschrift Ebene 1“ |

## 5. Prüfung (`/pruefung`, `/pruefung/ergebnis`)

| Schritt | Aktion | Erwarteter Vorlesetext |
| --- | --- | --- |
| 5.1 | Start | „Prüfungsmodus, Überschrift Ebene 1“ |
| 5.2 | Teil | Teiltitel als Überschrift Ebene 1, Liste „Fragen-Übersicht“ |
| 5.3 | Übersicht | Je Eintrag „Frage N: <Zustand>“, aktuelle Frage „aktueller Schritt“ |
| 5.4 | Antworten | wie 2.4 bis 2.8, ohne sofortige Rückmeldung (Prüfungsmodus) |
| 5.5 | Ergebnis | „Über/Unter der Bestehensgrenze, Überschrift Ebene 1“, „N Prozent richtig, X von Y“ |
| 5.6 | Lernfelder | Fortschrittsbalken je Lernfeld mit Name und Prozentwert |
| 5.7 | Ohne Ergebnis | „Noch keine Prüfung abgeschlossen“ |

## Befunde

Je Befund: Route, Schritt, Gerät/Reader, Ist-Text, Soll-Text. Per Code behebbare Befunde (Beschriftung, Live-Region, Fokus) als Issue mit Label `claude`; alles andere an Sinan.

## Bereits per Code behoben (SIN-370)

- `main`-Landmark fehlte auf Start, Lernpfad, Ergebnis und Einheit.
- Rückmeldung nach „Antwort prüfen“ stand erst mit ihrem Inhalt im DOM (Reader sagen das oft nicht an): jetzt dauerhafte Live-Region.
- „RICHTIG“ wurde zusätzlich zu „Richtig“ vorgelesen: Kennzeichen ist nun `aria-hidden`.
- Nach „Weiter“ ging der Fokus verloren: Fokus liegt jetzt auf der neuen Frage.
