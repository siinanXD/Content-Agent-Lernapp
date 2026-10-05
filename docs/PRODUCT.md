# Konzept: Autonomer Kurs-Generator (Lern-App)

2. Okt. 2026 · @Sinan

## Kurzfassung

Gebaut wird eine Lern-App, die aus einem Schlagwort (z. B. "Maschinen- und Anlagenführer") selbstständig einen kompletten Kurs erzeugt und aktuell hält. Du baust nur den Rahmen einmal: Hauptmenü, Lernreise, Design. Alle Inhalte kommen über API-Aufrufe von Agenten.

Drei Dinge entscheidest du selbst, alles andere läuft autonom:

1. Zugänge anlegen: API-Keys für Claude, OpenAI, Langfuse, Supabase (ca. 30 Minuten)
2. Das von Claude gebaute Figma-Design der 5 Hauptscreens freigeben (ca. 1 Stunde)
3. "Go" sagen: Arbeitspakete AP-00 bis AP-11 als Linear-Issues anlegen lassen

Gebaut wird mit Cursor-Agenten: Linear-Issue zuweisen, Agent schreibt Code, Review, Merge, Vercel. Claude Max übernimmt Figma, Konzept und Recherche. Geschätzte Dauer bis zum ersten fertigen Pilotkurs: 2 bis 3 Wochen Kalenderzeit.

Lokale Modelle brauchst du nicht. Die Quellen sind öffentlich, es fließen keine Personendaten durch die Agenten.

## Was es schon gibt

Kurs-Generatoren existieren, aber keiner arbeitet mit deutschen Ausbildungsordnungen. Das ist deine Lücke.

| Projekt | Was es macht | Nutzen für dich |
| --- | --- | --- |
| OpenMAIC | Erzeugt aus einem Prompt einen ganzen Kurs mit Quiz, MIT-Lizenz | Vorlage für die Agenten-Aufteilung, nicht als Basis |
| Open-Source-Duolingo-Alternative | Duolingo-artige App, Kurse aus PDFs per KI | Vorlage für Lernpfad und Fragetypen |
| BZE Online Campus (dein Repo) | Fertige Lernplattform mit 70 geprüften MAF-Fragen | Maßstab für die Qualitätsprüfung |

Offen: Ich habe Hugging Face nicht nach deutschen Berufsbildungs-Datensätzen durchsucht. Das erledigt AP-00 als erste Aufgabe.

Original-Prüfungsaufgaben der IHK sind keine Datenquelle, sie sind urheberrechtlich geschützt.

## Aufteilung: wer macht was

Claude erzeugt, OpenAI prüft, Hermes hält den Betrieb am Laufen. Zwei verschiedene Modellfamilien für Erzeugen und Prüfen verhindern, dass ein Modell seine eigenen Fehler durchwinkt.

| Aufgabe | Wer | Warum |
| --- | --- | --- |
| Code schreiben | Cursor-Agenten, Aufgaben aus Linear | Läuft über dein Cursor-Abo, keine API-Kosten pro Token |
| Recherche (Ausbildungsordnung, Rahmenlehrplan) | Claude mit Web-Suche und Web-Abruf | Beide Werkzeuge sind in die Claude API eingebaut |
| Lernplan bauen | Claude mit strukturierter Ausgabe | Die Ausgabe hält garantiert das JSON-Schema ein |
| Lektionen und Fragen in Masse | Claude über die Batch-Schnittstelle | Viele Anfragen zeitversetzt und günstiger |
| Prüfen und bewerten | OpenAI als Richter-Modell | Unabhängige zweite Meinung, ebenfalls mit Batch und strukturierter Ausgabe |
| Wöchentliche Aktualisierung | Hermes Agent auf Railway | Prüft, ob sich Quellen geändert haben, und stößt die Pipeline per API an |
| Tracing und Bewertung | Langfuse Cloud (EU) | Hermes hat ein fertiges Langfuse-Plugin |
| API-Vertrag und API-Tests | Postman | Ein Vertrag für alle Agenten, Tests laufen bei jedem Merge |
| Design-Vorgaben | Figma | Farben, Abstände, Komponenten als feste Quelle für die Code-Agenten |

Technik: Next.js auf Vercel für die App, Supabase in der EU für Daten, ein Worker auf Railway für die Pipeline.

Hermes ist der einzige Teil, der zuletzt kommt. Bis AP-10 reicht ein manueller Start der Pipeline.

Eine Alternative zum eigenen Worker sind Claude Managed Agents, ein gehosteter Agenten-Dienst in öffentlicher Beta. AP-00 entscheidet, ob das günstiger ist als der eigene Worker.

## Content-Pipeline: vom Schlagwort zum Kurs

Jeder Schritt ist eine eigene API-Route. So kann jeder Agent jeden Schritt einzeln aufrufen und wiederholen.

1. Eingabe `POST /courses`: Schlagwort, z. B. "Elektroniker für Betriebstechnik"
2. Recherche `POST /courses/{id}/research`: offizielle Quellen holen (Ausbildungsordnung, Rahmenlehrplan, Prüfungsanforderungen), jede Aussage mit Link speichern
3. Dauer bestimmen: Regeldauer der Ausbildung, mögliche Verkürzung, daraus 2 bis 3 Lernvarianten (z. B. 2 Monate Prüfungsvorbereitung, 3 Monate Weiterbildung)
4. Lernplan `POST /courses/{id}/plan`: Lernfelder in Tage zerlegen, 2 bis 3 Stunden pro Tag, in Einheiten von 5 bis 10 Minuten
5. Inhalte `POST /courses/{id}/generate`: pro Einheit eine kurze Erklärung, 5 bis 8 Fragen, eine Erklärung zu jeder Antwort
6. Prüfung `POST /courses/{id}/evaluate`: Richter-Modell bewertet jede Frage, siehe Abschnitt Qualität
7. Veröffentlichen `POST /courses/{id}/publish`: nur Inhalte über der Schwelle gehen live
8. Aktualisieren (wöchentlich): Quellen neu abrufen, bei Änderung nur die betroffenen Einheiten neu erzeugen

Jede Einheit speichert ihre Quelle und das Abrufdatum. Ohne Quelle wird nichts erzeugt.

Pilotberuf ist der Maschinen- und Anlagenführer, weil dafür schon 70 geprüfte Fragen als Maßstab existieren.

## Lern-Erlebnis, Design und Barrierefreiheit

Lernen in kleinen Einheiten von 5 bis 10 Minuten mit sofortiger Rückmeldung. Das ist das Duolingo-Prinzip, und es ist fest im Rahmen eingebaut, nicht pro Kurs erzeugt.

5 Hauptscreens (einmal in Figma entwerfen):

1. Start: Schlagwort eingeben, Lernvariante wählen
2. Lernpfad: Karte mit allen Einheiten und dem heutigen Ziel
3. Einheit: Erklärung, dann Fragen
4. Ergebnis: Punkte, Serie, was morgen dran ist
5. Profil: Fortschritt in Prozent bis zur Prüfung

Was das Lernen entspannt macht:

- Tagesziel statt Gesamtberg: "Heute 4 Einheiten"
- Serie (Tage am Stück) und Punkte
- Falsche Antworten kommen nach 1, 3 und 7 Tagen wieder
- 5 Fragetypen: Auswahl, Zuordnen, Lückentext, Reihenfolge, Rechnen
- Jede Antwort zeigt eine Erklärung mit Quelle

Barrierefreiheit (Pflicht in jedem Arbeitspaket):

- Standard WCAG 2.2 Stufe AA
- Schalter für einfache Sprache und Vorlesen
- Komplett per Tastatur bedienbar, Kontrast mindestens 4,5 zu 1
- Funktioniert offline und auf alten Android-Geräten
- Automatische Prüfung mit axe-core und Lighthouse bei jedem Merge, Fehler blockieren den Merge

Das Frontend entwickelt sich weiter: Der wöchentliche Planer (`.github/workflows/planner.yml`, SIN-223) liest die Nutzungsdaten (wo brechen Lernende ab) und legt maximal 5 Issues pro Woche in Linear an. Er ersetzt den früheren Frontend-Agent. Die Issues laufen dann durch den Dispatcher und den normalen Ablauf.

Figma liefert Farben, Abstände und Komponenten. Die Code-Agenten lesen das Design über den Figma-Connector und erfinden kein eigenes.

## Qualität: automatische Prüfung mit Langfuse

Kein Inhalt geht live, ohne dass ein zweites Modell ihn gegen die Quelle geprüft hat. Diese Prüfung ersetzt die Freigabe von Hand.

| Prüfpunkt | Frage an das Richter-Modell | Schwelle |
| --- | --- | --- |
| Quellentreue | Steht die richtige Antwort so in der Quelle? | Ja, sonst verwerfen |
| Eindeutigkeit | Gibt es genau eine richtige Antwort? | Ja, sonst verwerfen |
| Niveau | Passt die Frage zum Lernfeld und zur Prüfungsstufe? | Mindestens 4 von 5 |
| Sprache | Verständlich, ohne unnötige Fachwörter? | Mindestens 4 von 5 |
| Sicherheit | Betrifft die Frage Arbeiten an elektrischen Anlagen oder Maschinensicherheit? | Wenn ja: Stichprobe durch einen Menschen |

So läuft es in Langfuse:

1. Die 70 geprüften MAF-Fragen werden als Datensatz angelegt
2. Das Richter-Modell bewertet sie. Das ergibt den Zielwert
3. Erzeugte Fragen müssen diesen Zielwert erreichen
4. Jeder Agenten-Lauf wird aufgezeichnet: Kosten, Dauer, Bewertung
5. Prompts liegen versioniert in Langfuse, eine neue Version geht nur live, wenn sie besser abschneidet

Verworfene Fragen werden einmal neu erzeugt. Scheitert der zweite Versuch, bleibt die Einheit kürzer.

## Lern-Schleife: die App verbessert sich aus Nutzungsdaten

Einmal pro Woche wertet ein Agent die Nutzungsdaten aus und verbessert Kursaufbau, Fragen und Oberfläche selbst. Das Sprachmodell wird dabei nicht trainiert. Geändert werden Inhalte, Reihenfolge und Prompts.

| Signal aus den Daten | Was der Agent erkennt | Was er automatisch tut |
| --- | --- | --- |
| Fehlerquote pro Frage | Über 70 Prozent falsch: Frage unklar oder zu schwer | Frage neu erzeugen oder Erklärung davor einfügen |
| Abbruch pro Einheit | Viele hören an derselben Stelle auf | Einheit teilen oder kürzen |
| Dauer pro Einheit | Länger als 10 Minuten | Einheit in zwei Teile zerlegen |
| Rückkehr am nächsten Tag | Sinkt nach bestimmten Einheiten | Reihenfolge ändern, leichtere Einheit davor |
| Wiederholungen | Thema wird oft falsch wiederholt | Zusätzliche Übungseinheit erzeugen |

So läuft es:

1. Die App speichert pro Antwort: Frage, richtig oder falsch, Dauer, Abbruch. Ohne Namen, nur mit Zufalls-Kennung
2. Der Agent bildet pro Woche die 5 schwächsten Einheiten
3. Er erzeugt für jede eine verbesserte Version
4. Die Hälfte der Lernenden bekommt die neue Version, die andere Hälfte die alte
5. Nach 2 Wochen bleibt die Version mit der besseren Abschlussquote
6. Was funktioniert hat, wird als Regel in den Erzeugungs-Prompt übernommen. So werden auch neue Kurse von Anfang an besser

Zielgröße ist "Einheit abgeschlossen und später richtig beantwortet", nicht "Zeit in der App". Wer nur auf Verweildauer optimiert, bekommt eine App, die festhält statt lehrt.

Grenzen: Der Vergleich braucht Nutzer. Unter etwa 50 aktiven Lernenden pro Kurs sind die Zahlen zu klein, dann ändert der Agent nur bei eindeutigen Signalen. Für die Nutzungsdaten braucht die App eine Einwilligung oder eine saubere Rechtsgrundlage nach DSGVO.

Dieses Paket ist AP-12, geschätzt 3 Tage, und kommt nach dem Pilotkurs.

## Recht: EU, Deutschland, NRW

Die KI erzeugt Lernstoff, sie bewertet keine Menschen und entscheidet nicht über Zulassung. Das hält die App nach unserem Verständnis aus der Hochrisiko-Stufe des EU-KI-Gesetzes. Kein Anwalt.

| Thema | Regel im Produkt |
| --- | --- |
| DSGVO | Hosting in der EU, Auftragsverarbeitungsvertrag mit jedem Anbieter, keine Personendaten in Prompts |
| EU-KI-Gesetz | KI-Inhalte sichtbar kennzeichnen. Die Hochrisiko-Pflichten für Bildung gelten ab 2. Dezember 2027 |
| Fernunterricht (FernUSG) | Verkauf an Bildungsträger, nicht direkt an Lernende, sonst ZFU-Zulassung prüfen |
| Urheberrecht | Nur amtliche Quellen, keine IHK-Prüfungsaufgaben |
| Barrierefreiheit (BFSG) | WCAG 2.2 AA von Anfang an |

Zuständig in NRW: Landesdatenschutzbeauftragte (LDI NRW) und die jeweilige IHK, für Euskirchen die IHK Aachen.

Offene Frage vor dem ersten Vertrag: 1 Stunde Fachanwalt für IT-Recht zu KI-Gesetz und FernUSG.

## Bauplan: 12 Arbeitspakete

Jedes Paket wird ein Linear-Issue. AP-00 bis AP-02 laufen nacheinander, danach laufen Pipeline (AP-03 bis AP-06) und App (AP-07 bis AP-09) parallel. Die Zeiten sind Schätzungen für Agenten-Arbeit.

| Paket | Inhalt | Fertig, wenn | Zeit |
| --- | --- | --- | --- |
| AP-00 | Recherche: GitHub, Hugging Face, offizielle Docs. Entscheidungen festhalten | docs/DECISIONS.md mit Links existiert | 0,5 Tage |
| AP-01 | Repo, Tests, Vertragsdateien (AGENTS.md, PRODUCT.md, ARCHITECTURE.md) | Leerer Build läuft auf Vercel | 0,5 Tage |
| AP-02 | Datenmodell und API-Vertrag (OpenAPI, Postman-Collection, Mock) | Alle 7 Routen antworten als Mock | 1 Tag |
| AP-03 | Recherche-Agent | MAF-Quellen mit Links gespeichert | 1 bis 2 Tage |
| AP-04 | Lernplan-Agent | Tagesplan für 2 Lernvarianten als JSON | 1 Tag |
| AP-05 | Inhalts-Agent mit Batch | 1 Lernfeld komplett erzeugt | 2 Tage |
| AP-06 | Qualitäts-Schranke in Langfuse | Zielwert aus den 70 MAF-Fragen steht, Schwelle blockiert | 2 Tage |
| AP-07 | Figma von Grund auf: erst Recherche zu Variablen, Auto-Layout und Komponenten, dann Design-System und 5 Screens über den Figma-Connector | Figma-Datei freigegeben, Komponenten im Code, Kontrast geprüft | 2 Tage |
| AP-08 | 5 Hauptscreens | Eine Einheit von Start bis Ergebnis spielbar | 3 bis 4 Tage |
| AP-09 | Barrierefreiheit und Offline | axe-core und Lighthouse ohne Fehler | 2 Tage |
| AP-10 | Hermes-Betrieb | Wöchentlicher Lauf meldet Änderungen per Telegram | 1 Tag |
| AP-11 | Pilotkurs MAF komplett | Ganzer Kurs live, Kosten und Bewertung in Langfuse sichtbar | 1 Tag |

Summe: 17 bis 19 Agenten-Tage, durch Parallelarbeit 2 bis 3 Wochen Kalenderzeit.

Kosten: Der Code-Bau läuft über das Cursor-Abo und dessen Nutzungsgrenzen. Laufende API-Kosten entstehen nur in der Pipeline. Die Web-Suche der Claude API kostet 10 Dollar pro 1.000 Suchen. Die Kosten pro Kurs sind noch nicht bekannt. AP-11 misst sie in Langfuse. Bis dahin gilt ein Deckel von 20 Euro pro Kurslauf.

## Entscheidungsregeln für die Agenten

Diese Regeln kommen wörtlich in die AGENTS.md. Sie ersetzen Rückfragen.

Vor jeder Entscheidung:

1. Suche auf GitHub und Hugging Face nach einer fertigen Lösung
2. Lies die offiziellen Docs von Anthropic, OpenAI, Hermes oder Langfuse zum aktuellen Stand. Nutze nie Modellnamen oder Funktionen aus dem Gedächtnis
3. Schreibe die Entscheidung mit Links und einem Satz Begründung in docs/DECISIONS.md

So wird entschieden:

- Fertige Open-Source-Lösung vor Eigenbau, wenn: Lizenz MIT oder Apache, letzter Commit jünger als 6 Monate, mehr als 500 Sterne
- Das günstigste Modell, das die Qualitäts-Schwelle besteht
- Bei zwei gleich guten Wegen: der mit weniger Abhängigkeiten
- Nie zurückfragen. Bei Unsicherheit die Annahme in docs/DECISIONS.md notieren und weiterarbeiten

Stopp-Regeln:

- Höchstens 3 Reparatur-Runden pro Pull Request, dann stoppen und den Blocker melden
- Höchstens 20 Euro API-Kosten pro Kurslauf, dann stoppen

Verboten:

- IHK-Prüfungsaufgaben kopieren
- Personendaten in Prompts
- Inhalte unter der Qualitäts-Schwelle veröffentlichen
- Zugangsdaten, Abrechnung oder Datenbank-Löschungen anfassen
- Barrierefreiheits-Tests abschalten, um einen Merge durchzubekommen

## Risiken und Grenzen

"Go sagen und ein komplett fertiges Produkt bekommen" stimmt für den ersten Pilotkurs, nicht für ein verkaufsfertiges Produkt. Diese Punkte bleiben beim Menschen:

| Risiko | Was passiert | Gegenmaßnahme |
| --- | --- | --- |
| Falsche Fachinhalte | Das Richter-Modell übersieht Fehler, vor allem in Elektrotechnik | Stichprobe von 10 Prozent bei Sicherheits-Themen |
| Agenten bleiben hängen | Ein Paket scheitert nach 3 Reparatur-Runden | Blocker wird gemeldet und entschieden |
| Quellen fehlen | Für neue Berufe wie "AI Engineer" gibt es keine Ausbildungsordnung | Der Kurs wird als "ohne amtliche Grundlage" gekennzeichnet |
| Design wirkt beliebig | Agenten bauen ohne Vorlage austauschbare Oberflächen | 5 Hauptscreens zuerst in Figma freigegeben |
| Kosten laufen weg | Viele Berufe, viele Neuerzeugungen | Deckel pro Kurslauf, nur geänderte Einheiten neu erzeugen |

Eine Ausbildung verkürzt die App nicht. Sie bereitet auf die schriftliche Prüfung vor. Über die Zulassung entscheidet die Kammer.

## Definition fertig

Die App gilt als fertig, wenn alle vier Punkte erfüllt sind. Der Planer misst den Ist-Stand daran und legt für jede Lücke Issues an.

- **Funktionsfähig:** Start → Einheit → Ergebnis → Wiederholung → Prüfung funktioniert für jeden veröffentlichten Kurs, E2E grün.
- **Evaluierbar:** Jede Frage ist bewertet, die Kosten pro Lauf sind gemessen, ein Langfuse-Dashboard zeigt beides.
- **Skalierbar:** Neue Berufe entstehen nur über die Curriculum-Map. Die Content-Fabrik läuft wöchentlich.
- **Frontend:** Die Screens entsprechen Figma (Tokens aus Figma), WCAG 2.2 AA.

## Produktreife

Ziel (Vorgabe Sinan, 2026-10-05): ein **fertiges Produkt mit einem Modul**, kein MVP. MAF Metall komplett, so gut, dass man es Bildungsträgern zeigen und verkaufen kann. Das Projekt läuft im Dauer-Loop auf drei Spuren (Frontend, Content, Backend), bis die Checkliste grün ist. Der Planer prüft sie jede Woche und zeigt sie als Tabelle im Bericht (Schlüssel und Messung: `scripts/autonomy/readiness.mjs`, Bestätigungen: `docs/product-readiness.json`).

- **Content:** alle Module von MAF Metall veröffentlicht; Bestehensquote ≥ Goldset-Zielwert; Sicherheits-Stichproben erledigt
- **Lernen:** Start → Lernpfad → Einheit → Ergebnis → Wiederholung (1/3/7 Tage) → Prüfungsmodus komplett, E2E grün
- **Design:** alle Screens aus Figma; keine offenen `design`-Issues; Figma-Abgleich ohne Abweichung
- **Qualität:** Lighthouse ≥ 90 in allen Kategorien; axe ohne Fehler; WCAG 2.2 AA; offline nutzbar
- **Betrieb:** Sentry ohne offene kritische Fehler seit 7 Tagen; Kosten pro Kurslauf gemessen und unter Deckel; Content-Fabrik läuft
- **Recht/Vertrieb:** KI-Kennzeichnung; Impressum; Datenschutzerklärung; Einwilligung für Nutzungsdaten; Demo-Zugang für Bildungsträger

Wenn alles grün ist, legt der Planer **ein** Issue „Produkt-Abnahme MAF Metall“ für Sinan an (`risk:high`, Grundsatz-Entscheidung) und schaltet auf **Pflege-Modus**: nur Fehler und Content, bis Sinan antwortet.

**Spuren und Design:** Der Planer plant je Spur (Label `frontend`, `content`, `backend`) höchstens 3 Issues pro Woche. Jedes Frontend-Issue mit neuer oder geänderter Oberfläche wartet auf ein Design-Issue (Label `design`, höchstens 1 Paket pro Woche), das in einer Claude-Sitzung mit Figma-Connector erledigt wird. Der Dispatcher überspringt `design`-Issues und wechselt die Spuren ab. Code-Issues bauen nur nach freigegebenem Figma-Frame.

## Nächster Schritt

- [ ] Neues Repo anlegen und dieses Dokument als docs/PRODUCT.md ablegen
- [ ] API-Keys für Claude, OpenAI, Langfuse und Supabase als Secrets hinterlegen
- [ ] AP-00 als erstes Linear-Issue anlegen und starten

Repo: https://github.com/siinanXD/Content-Agent-Lernapp
