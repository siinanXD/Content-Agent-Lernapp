# Figma Design-System — Content-Agent-Lernapp

**Freigegeben durch Sinan (2026-10-02, „passt erstmal“).** Verbindliche Quelle für AP-08+.

## Datei

| Feld | Wert |
| --- | --- |
| Name | Content-Agent-Lernapp Design |
| URL | https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz |
| File key | `0SWGDO2ioBD3MyXiAnrbRz` |
| Linear | [SIN-185](https://linear.app/sinan-kahraman/issue/SIN-185/ap-07-figma-design-system-und-5-screens) |
| Status | **Approved** (Done) |

## Screens (390×844)

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
| 16 | `16 Einstellungen` | 21:331 | `/einstellungen` (+ `/impressum`, `/datenschutz`, `/ki-hinweis`, `/quellen` als Gerüst „Text folgt“) |
| 17 | `17 Zustände` | 21:409 | Komponente `StateView` |

## Tokens

Spiegel im Repo: [`tokens.json`](./tokens.json) → CSS-Variablen in `src/app/globals.css`.

### Farben (Light; kein Dark-Mode-Default)

| Token | Hex | Kontrast-Notiz |
| --- | --- | --- |
| `--color-bg-canvas` | `#EAF0F4` | Atmosphäre (kühles Mist) |
| `--color-bg-surface` | `#F7FAFC` | Flächen |
| `--color-bg-hero` | `#0A3D4A` | Hero / Markenfläche |
| `--color-text-primary` | `#12202A` | auf Canvas/Surface ≥ 12:1 |
| `--color-text-secondary` | `#3D5260` | auf Canvas ≥ 4.7:1 |
| `--color-text-on-brand` | `#F4F8FA` | auf Hero/Primary ≥ 8:1 |
| `--color-brand-primary` | `#0B5F6E` | CTA, Fokus |
| `--color-brand-accent` | `#A67C00` | Hervorhebung (Messing, nicht Terracotta) |
| `--color-border-subtle` | `#C5D2DA` | Rahmen |
| `--color-feedback-success` | `#1A6B45` | Erfolg |
| `--color-feedback-danger` | `#A33B2A` | Fehler |
| `--color-focus-ring` | `#0B5F6E` | Fokusring |

WCAG 2.2 AA: Fließtext und UI-Labels ≥ **4,5:1**. Geprüft gegen Primary-Text auf Canvas und On-Brand auf Hero.

### Typografie

| Rolle | Familie | Hinweis |
| --- | --- | --- |
| Display / UI-Headings | **Space Grotesk** | Expressiv, nicht Inter/Roboto/Arial |
| Body / Labels | **IBM Plex Sans** | Lesbarkeit für Lerntext |

### Spacing / Radius

`--space-4` … `--space-64` (4–64 px). Radius: `--radius-sm` 6, `--radius-md` 10, `--radius-lg` 14 (keine `rounded-full` Pills).

## Design-Entscheidungen

1. **Marke zuerst:** Start-Hero trägt „Content-Agent-Lernapp“ als Hero-Signal, nicht nur Nav.
2. **Visuelle Richtung:** tiefes Teal + Messing-Akzent + kühles Mist — bewusst ohne Lila-auf-Weiß, Cream/Terracotta, Broadsheet, Dark-Mode-Default, Glow, Multi-Layer-Shadows, Emojis.
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
