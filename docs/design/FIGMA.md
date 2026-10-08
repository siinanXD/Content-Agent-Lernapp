# Figma Design-System — Content-Agent-Lernapp

**Freigegeben durch Sinan (2026-10-02, „passt erstmal“).** Verbindliche Quelle für AP-08+.

> Seit 2026-10-06 gelten zusätzlich die [Design-Regeln 2026](regeln-2026.md) (SIN-314) für alle Apps.

## Datei

| Feld | Wert |
| --- | --- |
| Name | Content-Agent-Lernapp Design |
| URL | https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz |
| File key | `0SWGDO2ioBD3MyXiAnrbRz` |
| Linear | [SIN-185](https://linear.app/sinan-kahraman/issue/SIN-185/ap-07-figma-design-system-und-5-screens) |
| Status | **Approved** (Done) |

## Variante 2026 (verbindlich ab 08.10.2026, SIN-375)

**Freigegeben durch Sinan am 08.10.2026.** Für neue Frontend-Arbeit gilt die Seite **„Variante 2026“** (`52:369`). Die alte Seite „Screens“ heißt jetzt **„Archiv Stil E“** (`0:1`). Sie bleibt nur als Referenz erhalten. Regeln: [regeln-2026.md](regeln-2026.md).

| Screen | Figma | Route |
| --- | --- | --- |
| A1 Lernpfad | 52:377 | `/lernpfad` |
| A2 Einheit mit „Warum?“ | 53:369 | `/einheit/[unitId]` |
| A3 Startseite (Desktop) | 53:412 | `/` |
| W1 Willkommen | 56:369 | `/willkommen` |
| W2 Einwilligung | 56:381 | `/einwilligung` |
| W3 Schwerpunkt | 56:401 | `/schwerpunkt` |
| W4 Einheit · Erklärung | 56:426 | `/einheit/[unitId]` |
| W5 Ergebnis | 57:369 | `/ergebnis` |
| W6 Wiederholung | 57:394 | `/wiederholung` |
| W7 Prüfung läuft | 57:424 | `/pruefung` |
| W8 Prüfungsergebnis | 58:369 | `/pruefung/ergebnis` |
| W9 Profil | 58:405 | `/profil` |
| W10 Zustände | 58:456 | Komponente `StateView` |
| W11 Gruppenübersicht (Desktop) | 58:470 | `/ausbilder` |
| W12 Kurs erzeugen | 74:377 | `/start` |
| W13 Einstellungen | 74:398 | `/einstellungen` |
| W14 Anmelden | 74:452 | `/anmelden` |
| W15 Demo anfragen | 74:468 | `/demo` |
| W16 Rechtstext-Vorlage | 75:377 | `/impressum`, `/datenschutz`, `/ki-hinweis` |
| W17 Quellen | 75:396 | `/quellen` (Quellen-Einträge im Design sind Platzhalter, Inhalt kommt aus den Daten) |
| W18 Gruppenübersicht (mobil) | 75:418 | `/ausbilder` |
| W19 Frage · Lückentext | 76:377 | `/einheit/[unitId]` |
| W20 Frage · Zuordnen | 76:399 | `/einheit/[unitId]` |
| W21 Frage · Reihenfolge | 76:426 | `/einheit/[unitId]` |
| W22 Frage · Offen (Musterlösung) | 76:455 | `/einheit/[unitId]` |
| W23a/b Feedback richtig/falsch | 76:473, 76:503 | `/einheit/[unitId]` |
| G1 Gruppe anlegen | 67:369 | `/ausbilder/gruppe/neu` (SIN-356) |
| G2 Teilnehmende einladen | 67:400 | SIN-356 |
| G3 Gruppe beitreten (Azubi) | 67:419 | SIN-356 |
| G4 Leere Gruppenübersicht | 67:452 | SIN-356 |

Komponenten 2026: `Bento/Kachel` (72:399, Ton = Hauptkachel · Kachel · Hinweis) und `Bento/Label` (72:385). Neue Variablen: `radius/xl` (24), `bg/hint`, `text/hint`, `bg/avatar`, `text/muted-on-dark`, `text/soft-on-dark`, `track/on-dark`, `bento/gap` (12), `bento/pad` (24).

Nutzerwege (FigJam): Board `Qru6d3ves8YPyjJUzwsp8a` („Nutzerwege & Journey Map“) mit Screen-Nummern je Schritt.

Pipeline-Ablauf (FigJam, für alle Projekte): Board `hFbCzMGNVpkoUAwJ9JXg8W` („Agenten-Pipeline: Ablauf“), Stand 08.10.2026.

## Screens Stil E (Archiv, 390×844)

| # | Frame | Inhalt |
| --- | --- | --- |
| 1 | `01 Start` | Hero mit Marke, Schlagwort-Eingabe, Lernvariante, CTA „Kurs erzeugen“ |
| 2 | `02 Lernpfad` | Heutiges Ziel + Karte der Einheiten (erledigt / heute / offen) |
| 3 | `03 Einheit` | Erklärung mit Quelle, dann Multiple-Choice-Fragen |
| 4 | `04 Ergebnis` | Punkte, Serie, „Morgen dran“, Weiter / Zum Lernpfad |
| 5 | `05 Profil` | Fortschritt % bis Prüfung, Meta, A11y-Hinweis |

Deutsche Copy, Pilotkontext **Maschinen- und Anlagenführer (MAF)**, Quellenhinweise AO/RLP (keine IHK-Aufgabentexte).

## Komponenten

| Komponente | Varianten / Nutzen |
| --- | --- |
| `Button` | Primary, Secondary, Ghost |
| `Input` | Label + Feld (Schlagwort) |
| `Progress` | Track + Fill + Prozentlabel |
| `OptionChoice` | Default, Selected, Correct, Wrong |

Seite `Components` hält die Master-Komponenten; Screens nutzen Instanzen.

### Design-Paket 1 (SIN-230)

> Stand Code: nach Issue-Text gebaut, **nicht gegen Figma abgeglichen** (Token im Agent-Lauf nicht verfügbar, siehe D-48).

| Komponente | Figma | Code | Varianten |
| --- | --- | --- | --- |
| `AnswerFeedback` | 16:153 | `src/components/ui/answer-feedback.tsx` | Richtig, Falsch: Icon, Titel, richtige Antwort, Erklärung, Quelle, Weiter-Button |
| `PathNode` | 19:265 | `src/components/ui/path-node.tsx` | Erledigt, Heute, Offen, Gesperrt |
| `StatChip` | 19:279 | `src/components/ui/stat-chip.tsx` | Serie, Punkte, Wiederholung |
| `DailyGoal` | 19:280 | `src/components/ui/daily-goal.tsx` | Ziel + Fortschritt |
| `BottomNav` | 12:73 | `src/components/learner/bottom-nav.tsx` | Icons, aktive Markierung oben |
| Zustände | Screen 17 (21:409) | `src/components/ui/state-view.tsx` | Laden, Leer, Fehler, Offline |

### Weitere Screens (SIN-230)

| # | Frame | Figma | Route |
| --- | --- | --- | --- |
| 2 | `02 Lernpfad` (Modultitel-Fix) | – | `/lernpfad` |
| 2b | `02b Lernpfad · Karte` | 19:287 | `/lernpfad` (ersetzt die Liste) |
| 3b/3c | `03b/03c Einheit · Feedback richtig/falsch` | 16:154, 16:204 | `/einheit/[unitId]` |
| 14 | `14 Einheit geschafft` | 16:265 | `/ergebnis` |
| 0 | `00 Onboarding · Willkommen` | 20:312 | `/willkommen` |
| 0b | `00b Einwilligung mit KI-Hinweis` | 20:343 | `/einwilligung` |
| 15 | `15 Schwerpunkt wählen` | 20:356 | `/schwerpunkt` |
| 16 | `16 Einstellungen` | 21:331 | `/einstellungen` (+ `/quellen` als Gerüst „Text folgt“; `/impressum`, `/datenschutz`, `/ki-hinweis` siehe Screens 27–29, SIN-301) |
| 17 | `17 Zustände (Laden · Leer · Fehler · Offline)` | 21:409 | Komponente `StateView` |
| 18 | `18 Startseite · Bildungsträger` | Seite „Screens“ | `/` (SIN-277; alter Screen 01 jetzt `/start`) |
| 19 | `19 Gruppenübersicht · Ausbilder` | Seite „Screens“ | `/ausbilder` |
| 20 | `20 Demo-Zugang anfragen · Anmelden` | Seite „Screens“ | `/demo`, `/anmelden` |
| 21 | `21 Prüfung · Ergebnis` | Seite „Screens“ | `/pruefung/ergebnis` |

## Tokens

Spiegel im Repo: [`tokens.json`](./tokens.json) → CSS-Variablen in `src/app/globals.css`.

### Farben (Light; kein Dark-Mode-Default)

| Token | Hex | Kontrast-Notiz |
| --- | --- | --- |
| `--color-bg-canvas` | `#FAFAF9` | Seitenhintergrund |
| `--color-bg-surface` | `#FFFFFF` | Flächen, Pillen |
| `--color-bg-hero` | `#1C1917` | Hero, NextUpCard, Knoten „Heute“ |
| `--color-text-primary` | `#1C1917` | auf Canvas/Surface ≈ 17:1 |
| `--color-text-secondary` | `#57534E` | auf Canvas ≈ 7:1 |
| `--color-text-on-brand` | `#FAFAF9` | auf Hero ≈ 17:1, auf Primary ≈ 5,2:1 |
| `--color-brand-primary` | `#C2410C` | CTA, Fortschritt, Fokus; weißer Text erlaubt |
| `--color-brand-accent` | `#EA580C` | Ring um „Heute“, Icons; **kein weißer Text** (3,6:1) |
| `--color-border-subtle` | `#E7E5E4` | Rahmen, Ring-Track |
| `--color-feedback-success` | `#15803D` | Erfolg |
| `--color-feedback-danger` | `#B91C1C` | Fehler |
| `--color-focus-ring` | `#C2410C` | Fokusring |

WCAG 2.2 AA: Fließtext und UI-Labels ≥ **4,5:1**. Weißer Text nur auf `brand/primary`, auf `brand/accent` dunkler Text.
Quelle Stil E: Figma-Collection „Color“. Die Variablen-API war im Agent-Lauf nicht lesbar (403); die Werte sind gegen die Füllungen der Knoten 19:287, 19:265 und 20:312 abgeglichen (SIN-245).

### Typografie

| Rolle | Familie | Hinweis |
| --- | --- | --- |
| Text, Überschriften, Labels | **Geist** | `next/font/google`, `--font-display` = `--font-body` |
| Kennungen, Zahlen („M0 · 03“, „2/4“, „1.840“) | **Geist Mono** | `--font-mono` |

Keine weitere Schriftart.

### Spacing / Radius

`--space-4` … `--space-64` (4–64 px). Radius: `--radius-sm` 6, `--radius-md` 10, `--radius-lg` 16. Pillen (`StatChip`) und Knoten sind rund (`rounded-full`).

### Stil-E-Komponenten (SIN-245)

| Komponente | Code | Beschreibung |
| --- | --- | --- |
| `ProgressRing` | `src/components/ui/progress-ring.tsx` | 76 px, Track `border/subtle`, Fortschritt `brand/primary`, Wert „2/4“ in Geist Mono |
| `NextUpCard` | `src/components/ui/next-up-card.tsx` | Dunkle Karte `hero`, Radius 16: „Als Nächstes · M0 · 03“, Titel, Frage-Vorschau, Knopf „Einheit starten“ |
| `StatChip` | `src/components/ui/stat-chip.tsx` | Pille (weiß, Rahmen), Icon + Wert in Geist Mono |
| `PathNode` | `src/components/ui/path-node.tsx` | 64 px; „Heute“ schwarz mit orangem Ring, „Erledigt“ grün, „Offen“/„Gesperrt“ weiß |
| Screen `02b Lernpfad · Karte` | `src/app/lernpfad/page.tsx` | Kopfzeile mit Ring, darunter Pillen und NextUpCard |

`DailyGoal` entfällt (Ring + NextUpCard ersetzen es).

## Design-Entscheidungen

1. **Marke zuerst:** Start-Hero trägt „Content-Agent-Lernapp“ als Hero-Signal, nicht nur Nav.
2. **Visuelle Richtung (Stil E, Sinan 05.10.):** Orange / Weiß / Schwarz mit Geist — bewusst ohne Lila-auf-Weiß, Teal/Messing-Altfarben, Dark-Mode-Default, Glow, Multi-Layer-Shadows, Emojis. Anti-Slop-Regeln: `AGENTS.md`.
3. **Eine Hero-Komposition** auf Start; keine Cards im Hero.
4. **Auto Layout** überall; Komponenten vor Screens.
5. **Code-Spiegel** hält Tokens für AP-08 bereit, bevor Figma freigegeben ist — Implementierung wartet auf Sinan.

## Freigabe-Checkliste (Sinan)

- [x] Visuelle Richtung (Teal / Typo / Atmosphere) OK
- [x] 5 Screens inhaltlich und strukturell OK
- [x] Kontrast und Lesbarkeit auf Mobil OK
- [x] Komponenten-Set ausreichend für AP-08
- [x] Freigabe-Kommentar in Figma oder Linear SIN-185 ("passt erstmal", 2026-10-02)

Nach Freigabe: SIN-185 auf Done; AP-08 liest diese Datei + Figma als verbindliche Quelle.
