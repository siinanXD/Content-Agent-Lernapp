# SIN-414: Variante 2026, neue Lernenden-Screens N1 bis N5

- Linear: https://linear.app/sinan-kahraman/issue/SIN-414
- Figma: Datei `0SWGDO2ioBD3MyXiAnrbRz`, Seite „Variante 2026“, Bereich „NEU 09.10. · LERNENDE“ (`81:378`, `81:398`, `81:413`, `81:431`, `81:456`)

## Entscheidung

- Neuer Onboarding-Schritt `/beruf` zwischen Einwilligung und Schwerpunkt. Berufe stehen in `BERUFE` (`src/lib/learner/onboarding.ts`); das Suchfeld filtert nur diese. Industriekaufmann/-frau ist Monoberuf (Map `indkfl`) und geht ohne Schwerpunkt direkt zum Lernpfad, MAF geht zu `/schwerpunkt`.
- Schrittzähler: W2 „Schritt 2 von 4“, N1 „Schritt 3 von 4“, W3 „Schritt 4 von 4“ (W1 Willkommen ist Schritt 1 ohne Zähler).
- N2: Start der Prüfung nutzt den normalen Primärknopf (Figma `#C2410C`, heller Text) statt Akzent mit dunklem Text; Texte aus Figma.
- N3: Banner als dunkle, abgerundete Kachel mit Figma-Texten. Beide Knöpfe („Ja, erlauben“ / „Nein, danke“) sind gleich in Form, Größe und Farbe. Die Datenschutz-Verlinkung bleibt (Informationspflicht).
- N4: Startseite auf dem Handy mit Hero, zwei Beweis-Kacheln, Berufe-Kachel, Hinweis. Desktop unverändert.
- N5: `PathNode` zeigt Punkte auf einer Achse (fertig, jetzt, offen), je Block eine weiße Karte. Der Zickzack entfällt.

## Annahmen

- Inhalte für Industriekaufleute sind noch „Entwurf“; die App zeigt sie wie die MAF-Inhalte. Der Lernpfad lädt bisher keine mapabhängigen Einheiten (Phase A, MAF); die Wahl wird als `berufId`/`mapId` gespeichert, damit die Auslieferung später darauf zugreifen kann.
- Banner: Der zweite Knopf ist in Figma Text in `#C2410C` auf Schwarz (ca. 3,4:1, unter 4,5:1). Für Kontrast und Gleichwertigkeit sind beide Knöpfe gefüllt.
- Suchfeld hat ein verstecktes Label („Beruf suchen“), der Platzhalter aus Figma bleibt sichtbar.
- Der Knopf „Einheit 05 starten“ aus N5 entfällt: Die Karte „Als Nächstes“ im Lernpfad hat dieselbe Aktion. Beispielzahlen aus Figma (4 von 7, Brandschutz) sind nicht übernommen; die Zahl „x von y Einheiten“ kommt aus den echten Einheiten.
- „2 Jahre · 5 Schwerpunkte“ und „3 Jahre · 13 Lernfelder“ stammen aus den Curriculum-Maps.

## Warum

Design von Sinan am 09.10. freigegeben; Figma ist die einzige Quelle für Werte. Keine neuen Komponenten: vorhandene Kacheln, Button und PathNode.
