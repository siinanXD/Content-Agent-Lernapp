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
