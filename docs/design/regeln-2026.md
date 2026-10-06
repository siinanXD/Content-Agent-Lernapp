# Design-Regeln 2026

**Freigegeben durch Sinan (2026-10-06).** Gilt für **alle** Apps (Lern-App, Leitstand, Werkzeuge); der Projekt-Starter übernimmt sie. Linear: [SIN-314](https://linear.app/sinan-kahraman/issue/SIN-314). Figma: Lern-App `0SWGDO2ioBD3MyXiAnrbRz`, Leitstand `7Ti9iVUjUjw3rh9WYhSu9K` (jeweils Seiten „Variante 2026“ und „Präsentation 2026“). Werte stehen in [`tokens.json`](tokens.json); sie ergänzen Stil E (SIN-243) und ersetzen ihn nicht.

## 1. Bento als Grundraster

- Eine **große Hauptkachel** mit **genau einer Aktion**, darunter Kacheln in unterschiedlicher Größe.
- Abstand zwischen Kacheln `--bento-gap` (12 px, Desktop `--bento-gap-wide` 16 px); Innenabstand `--bento-pad` (Hauptkachel `--space-32`, Leitstand `--bento-pad-tool`).
- Keine Karten in Karten. Handy: eine Spalte, Hauptkachel zuerst.

## 2. Ruhige Oberfläche

- Eine Hauptaktion pro Screen, kurze Texte (deutsch, konkret), viel Abstand.
- Keine Dekoration ohne Zweck: Jedes Element zeigt Inhalt, Zustand oder Handlung.

## 3. Typografie als Gestaltung

- Startseiten: große Schlagzeile statt Hero-Bild.
- Labels und Zahlen in **Geist Mono** (Token `mono-label`: 12/16, 500, Laufweite 0,06 em). Im Leitstand zusätzlich **Großbuchstaben** bei Labels.
- Text bleibt Geist; keine weitere Schriftart.

## 4. KI transparent

- Jede KI-Erklärung nennt **Quelle und Belege** und steht als Panel neben oder unter dem Inhalt („Warum?“). Sie ersetzt den Inhalt nie.
- Kennzeichnung: **„KI-erklärt · geprüft“**. „geprüft“ nur, wenn ein Mensch oder die Qualitäts-Schwelle den Inhalt freigegeben hat.
- Ohne amtliche Quelle keine Erklärung (AGENTS.md, Grundsatz).

## 5. Bewegung erklärt

- Bewegung zeigt eine Veränderung (Ring füllt sich, Kachel rückt nach), ist kurz (Richtwert ≤ 300 ms) und nie reine Zier.
- `prefers-reduced-motion: reduce` schaltet sie ab oder auf einen sofortigen Wechsel.
- Zuerst CSS. Die Bibliothek **Motion** (`motion/react`) nur, wo CSS nicht reicht; ein neues Paket braucht die Prüfung nach AGENTS.md (MIT/Apache, > 500 Sterne).

## 6. Zwei Ausprägungen

| | Lern-App | Leitstand / Werkzeuge |
| --- | --- | --- |
| Grund | hell, warm (Stil E) | dunkel |
| Rundung | 16–24 px (`--radius-lg`, `--radius-xl`) | 2 px (`--radius-tool`) |
| Flächen | Kacheln mit weicher Fläche | 1-px-Linien (`--bento-line`), keine Schatten, kein Leuchten |
| Fortschritt | Ring, Balken | Segmentbalken |
| Labels | Geist Mono | Geist Mono, Großbuchstaben |

Dunkle Farben des Leitstands kommen aus dessen Figma-Datei, nicht aus Schätzung.

## 7. Verboten

- 3D/WebGL-Spielereien
- Glas-Effekte (Unschärfe-Hintergründe)
- KI-Personalisierung ohne Einwilligung
- Fake-Zahlen (erfundene Kennzahlen, Platzhalter-Statistiken)

## 8. Barrierefreiheit (unverändert)

WCAG 2.2 AA, Kontrast ≥ 4,5:1, komplett per Tastatur bedienbar, sichtbarer Fokus, Ziele ≥ 44 px. Kein Test wird abgeschaltet, um etwas durchzubringen.
