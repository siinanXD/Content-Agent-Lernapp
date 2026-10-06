---
name: web-design-guidelines
description: Checkliste für Frontend-Änderungen (WCAG 2.2 AA, Formulare, Fokus, Abstände, Zustände, Stil E). Vor jedem Frontend-PR laden und gegen die Screenshots prüfen.
---

# Web-Design-Guidelines (SIN-275)

Eigene Kurzliste aus WCAG 2.2 AA und AGENTS.md („Anti-Slop“). Figma bleibt die einzige Quelle für Werte; hier steht nur, was geprüft wird.

## Ablauf vor dem PR

1. `npm run build`, dann `node scripts/autonomy/screenshots.mjs <Route>...` (z. B. `/lernpfad /einheit/unit-03`). Es entstehen Handy- (390 px) und Desktop-Bilder in `screenshots/` plus `screenshots/report.md`.
2. Bilder ansehen (Read-Tool) und jede Zeile unten abhaken.
3. Klickpfad aus dem Issue einmal durchspielen: Seite öffnet, keine Konsolenfehler (das Skript meldet sie im Bericht).
4. Vergleich mit Figma: `node scripts/autonomy/figma.mjs --node <ID>`. Fehlt der Token: im PR „Figma nicht verfügbar“ schreiben.
5. Abweichungen beheben oder im PR unter „Ausprobieren“ benennen. Fehlt etwas in Figma: Linear-Issue mit Label `design`, nichts erfinden.

## Prüfliste

**Layout und Abstände**
- Kein horizontales Scrollen bei 390 px; nichts abgeschnitten oder überlappend.
- Abstände aus Tokens/Figma, gleichmäßig; keine Karten in Karten; eine Hero-Komposition je Screen.

**Farben und Schrift (Stil E)**
- Farben nur als `var(--color-*)`, nie Hex im Code. Weißer Text nur auf `brand/primary`.
- Kontrast ≥ 4,5:1 (Text), ≥ 3:1 (Bedienelemente, Rahmen).
- Nur Geist und Geist Mono. Keine Emojis, Verläufe, Glow, Mehrfach-Schatten, kein Dark-Mode-Default.

**Bedienung und Fokus**
- Alles per Tastatur erreichbar, Reihenfolge logisch, sichtbarer Fokus (nie `outline: none` ohne Ersatz).
- Ziele ≥ 44 × 44 px. Der Fokus wird nicht von festen Leisten verdeckt (WCAG 2.4.11).
- Links sind Links (`<a>`), Aktionen sind Buttons (`<button>`).

**Formulare**
- Jedes Feld hat ein sichtbares `<label>`; ein Platzhalter ersetzt es nicht.
- Fehler stehen am Feld, nennen die Lösung und sind per Text (nicht nur Farbe) erkennbar; `aria-describedby`/`aria-invalid` gesetzt.
- Richtiges `type`/`autocomplete`; bereits eingegebene Daten nicht erneut verlangen.

**Zustände**
- Laden, leer, Fehler, Erfolg vorhanden und nach Screen 17 gestaltet; kein leerer weißer Bildschirm.
- Deaktiviert, Hover, Fokus, Aktiv unterscheidbar.

**Inhalt und Semantik**
- Eine `h1`, Überschriften ohne Sprünge, Landmarks (`main`, `nav`). Bilder mit `alt` (dekorativ: `alt=""`).
- Texte deutsch, kurz, konkret; keine Platzhalter („Lorem“, „Text folgt“), keine erfundenen Zahlen.
- `prefers-reduced-motion` beachten; keine Inhalte nur per Hover.
