# Changelog

Erzeugt aus den Titeln der gemergten Pull Requests (`npm run changelog`), nicht von Hand bearbeiten.

## 2026-10

### Neu

- qualitaet: Lauf-Workflow mit Secrets für Messläufe und Migrationen (SIN-302, #122)
- lernpfad: Serie und Tagesziel aus echten Lernereignissen (SIN-290, #123)
- recht: Impressum, Datenschutz und KI-Hinweis als echte Seiten (SIN-301, #121)
- backup: nächtliche Sicherung der Inhalte mit Wiederherstellung (SIN-293, #120)
- qualitaet: Lighthouse, axe und Tastatur je Screen gemessen (SIN-286, #119)
- planer: gebaut von gelaufen unterscheiden, Lauf-Aufträge, Duplikat-Schutz (SIN-292, #118)
- autonomie: Loop diagnostiziert Stillstand selbst und legt das Bug-Issue an (SIN-291, #117)
- worker: Frontend-Worker prüfen sich mit Screenshots und Checkliste (SIN-275, #116)
- design-paket-2: Startseite, Ausbilder-Ansicht, Demo-Zugang, Prüfungsergebnis (SIN-277, #114)
- daten: Tabellen und Rolle für Demo-Anfragen und Ausbilder-Ansicht (SIN-277, #113)
- kosten: Kosten-Ledger prüfen und Deckel-Stopp testen (SIN-280, #112)
- qualitaet: Prüfseite für Sicherheits-Stichprobe gegen Live-App (SIN-278, #111)
- qualitaet: Sicherheits-Stichprobe für MAF Metall (SIN-272, #110)
- betrieb: Sentry-Release und PostHog-Auslese für den Planer (SIN-273, #108)
- qualitaet: Bewertungslauf meldet Frage-Bewertung und Kosten an Langfuse (SIN-270, #107)
- vercel: Production-Deploys bündeln, Planung nicht blockieren (SIN-266, #103)
- betrieb: Sentry ohne Personendaten, Fehlerzahl für den Planer (SIN-259, #100)
- planer: Bauphase füllt alle 2 h nach, neue Issues bekommen Label claude (SIN-262, #99)
- kosten: Kosten je Kurslauf ins Ledger und an Langfuse (SIN-258, #98)
- qualitaet: Bewertungslauf für bestehende Fragen mit Ledger (SIN-260, #96)
- offline: Einheiten und Wiederholung ohne Netz (SIN-256, #95)
- autonomie: Planer füllt die Schlange nach (SIN-253, #91)
- gate: risk:high nur noch bei echten Risiken (SIN-252, #90)
- autonomie: Planer-Phasen bauen und Betrieb (SIN-244, #89)
- gate: wartet auf Freigabe gelb statt rot (SIN-247, #88)
- decisions: Index im selben PR, Docs-only ohne Vercel-Build (SIN-251, #86)
- pr-gate: Steckbrief ganz oben im PR (SIN-248, #83)
- autonomie: Tages-Update um 10:00 und 20:00 aufs Handy (SIN-246, #82)
- autonomie: Free-Tier-Wächter im Planer (SIN-225, #76)
- planer: Content-Abdeckung je Beruf/Modul und Content-Regeln (SIN-226, #77)
- design: Stil E (Orange/Weiß/Schwarz) aus Figma übernehmen (SIN-245, #74)
- design: Design-Paket 1 umsetzen (SIN-230, #71)
- autonomy: Loop-Härtung mit Agenten-Token, Abgleich, Entscheidungs-Dateien (SIN-240, #72)
- autonomy: Loop-Status mit Kontingenten und Wächter (SIN-238, #69)
- content: Content-Fabrik content-grow.yml mit Zeitplan und 20-€-Deckel (SIN-220, #68)
- generate: nur durchgefallene Fragen reparieren (SIN-218, #65)
- design: Figma-Regel entschärft, Figma-Lesezugriff für Agenten (SIN-239, #67)
- autonomy: Agenten-Token mit Workflow-Recht (SIN-234, #64)
- autonomie: Dauer-Loop auf drei Spuren, Figma zuerst, Produktreife (SIN-227, #62)
- generate: GENERATOR_MODEL Config und A/B-Skript Haiku vs Sonnet (SIN-219, #61)
- content: gemeinsame MAF-Module wiederverwenden, M0 geteilt (SIN-217, #56)
- autonomy: Gate auf medium, Dispatcher, Planer, Definition fertig (SIN-223, #52)
- quality: Bewertung pro Frage (SIN-216, #49)
- obs: Sentry EU + PostHog EU analytics (SIN-203)

### Behoben

- design: Figma-Abgleich Screen 17 angleichen (SIN-274, #115)
- a11y: Hex-Farben durch Tokens ersetzen, Messung offen (SIN-271, #109)
- kosten: Kostenmessung pro Kurslauf reparieren (SIN-268, #106)
- autonomie: Tages-Update nicht mehr von Testläufen blockiert (SIN-267, #104)
- planer: Fehlerseiten der Dienste stürzen den Planer nicht mehr ab (SIN-263, #101)
- autonomie: merge-gate wieder als echter Job (SIN-261, #93)
- offline: Service-Worker-Cache an Build koppeln (SIN-250, #85)
- lernpfad: Einheiten robust öffnen, Betrieb statt Referenzberuf (SIN-249, #79)
- autonomy: Linear-Abgleich nach Merge, Auto-Merge mit Agenten-Token (SIN-237, #66)
- dispatch: Claude darf Dateien bearbeiten, Selbst-Anstoß (SIN-223, #55)
- ci: Claude öffnet PRs selbst (SIN-205, #42)
- ci: Freigabe an Commit binden (SIN-208, #39)

### Schneller

- vercel: Build bei reinen Test-Änderungen überspringen (SIN-254, #97)

### Dokumentation

- vercel: Deployments-Limit bewusst akzeptiert (SIN-264, #102)
- decisions: Index aktualisieren (SIN-240, #87)
- decisions: Index aktualisieren (SIN-240, #84)
- decisions: Index aktualisieren (SIN-240, #81)
- decisions: Index aktualisieren (SIN-240, #80)
- decisions: Index aktualisieren (SIN-240, #78)
- decisions: Index aktualisieren (SIN-240, #75)
- readme: Hinweis auf @claude (SIN-205, #41)
- agents: Draft-Regel an Auto-Merge anpassen (SIN-208, #38)
- readme: Abschnitt Pull Requests (SIN-207, #37)
- README aktualisieren (Stack, Phase A, AP-14)

### Tests

- e2e: Gesamtweg je veröffentlichtem Kurs bis Prüfungsmodus (SIN-269, #105)
- a11y: axe, Tastatur und Lighthouse über alle Routen (SIN-257, #94)
- e2e: Gesamtweg Start bis Prüfungsmodus (SIN-255, #92)

### Automatisierung

- autonomy: Agenten-Token aktivieren (SIN-234)
- worker: Bot-Starts erlauben (SIN-234)
- autonomy: Workflows aus SIN-227 aktivieren (SIN-223, #63)
- autonomy: Dispatcher, Planer und Gate aktivieren (SIN-223, #54)
- claude: Python 3.11 und 3.12 für Prüfungen bereitstellen (SIN-215, #46)
- claude: Tests vor dem Push erlauben (SIN-215, #45)
- pipeline: CI und Release nach Auto-Merge nachholen (SIN-213, #44)
- pipeline: Risiko-Gate, Auto-Merge und Reparatur-Schleife (SIN-207, #36)
- Claude als Ersatz-Agent einrichten (SIN-205, #34)

### Pflege

- deps: package-lock.json normal committen (SIN-236, #73)
- ap19: Bewertung pro Frage prüfen, Lint-Aufräumen (SIN-216, #60)
- Anthropic workspace headers + Claude-Abo Klarstellung (D-33)
