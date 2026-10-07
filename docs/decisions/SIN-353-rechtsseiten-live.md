---
name: SIN-353-rechtsseiten-live
description: Live-Prüfung der Rechtsseiten (KI-Hinweis, Impressum, Datenschutz)
metadata:
  type: project
---

## Entscheidung

Die Rechtsseiten sind live erreichbar und in der Produktreife-Tabelle bestätigt.

## Befunde aus der Live-Prüfung (2026-10-07)

**Build erfolgreich:** `npm run build` zeigt alle 28 Routen, darunter `/ki-hinweis`, `/impressum`, `/datenschutz` als statische (○) Seiten.

**Tests grün:** `npm test` bestanden mit 557/557 Tests ohne Fehler (inkl. `e2e/rechtsseiten-reachable.spec.ts` für Erreichbarkeit).

**KI-Hinweis (/ki-hinweis):** 
- ✓ Vollständiger Inhalt (0 Platzhalter)
- ✓ Verlinkt: Footer (Startseite, Einstellungen), Datenschutz-Erklärung
- ✓ Sichtbar von: start, demo, einstellungen, einwilligung
- ✓ axe-core ohne Fehler

**Impressum (/impressum):**
- ✗ 7 Platzhalter offen (SIN-340, Sinan-Aufgabe):
  - [Vor- und Nachname]
  - [Straße Hausnummer]
  - [PLZ] (Euskirchen)
  - [kontakt@sjcode.de] (E-Mail wird später gefüllt)
  - [optional] (Telefon)
  - [USt-IdNr. gemäß § 27a UStG]
  - [Vor- und Nachname, Anschrift wie oben] (Verantwortlich)
- ✓ Verlinkt: Footer (Startseite, Einstellungen)
- ✓ axe-core ohne Fehler
- Hinweis: Link zu KI-Hinweis funktioniert

**Datenschutz (/datenschutz):**
- ✗ 5 Platzhalter offen (SIN-341, Sinan-Aufgabe):
  - [Name, Anschrift, E-Mail] (wie Impressum)
  - [Auslieferung statischer Dateien prüfen] (Vercel)
  - [Region prüfen] (Supabase)
  - [Region prüfen] (Sentry)
  - [Ort prüfen] (Anthropic/OpenAI)
  - [Speicherdauer je Kategorie]
- ✓ Verlinkt: Footer (Startseite, Einstellungen), Onboarding, Demo-Ansicht
- ✓ Struktur nach Figma Screen 28
- ✓ axe-core ohne Fehler
- Hinweis: Inhaltsverzeichnis sichtbar (meta.inhalt = ja)

## Warum

Die Produktreife-Checkliste in PRODUCT.md Abschnitt „Recht/Vertrieb" verlangt:
- KI-Kennzeichnung ✓
- Impressum ⚠ (gebaut, Inhalte folgen in SIN-340)
- Datenschutzerklärung ⚠ (gebaut, Inhalte folgen in SIN-341)

Die Live-Prüfung bestätigt, dass die Seiten architektonisch fertig sind, aber Sinan die Inhalte nachtragen muss. Die Prüfung dokumentiert den Stand mit Datum und Beleg (Builds, Tests, Befund über Platzhalter), ohne Personendaten zu enthalten.

## Annahmen

- Die Live-App läuft auf `https://siinanxd-content-agent-lernapp.vercel.app/` (Vercel Production)
- E-Mail-Adresse „kontakt@sjcode.de" wird von Sinan befüllt (ist Platzhalter)
- Telefon-Feld ist optional (nicht erforderlich vor Livegang)
- Datenschutz-Inhalte werden erst nach AV-Verträgen veröffentlicht (Hinweis im Kopf: `entwurf`)
- Sicherheits-Stichproben (SIN-272) können später durchgeführt werden

## Vergleich mit SIN-344

SIN-344 hatte Playwright-Tests in PR claude/sin-344 hinzugefügt. SIN-353 (Lauf-Auftrag) erweitert die Bestätigung:
- Prüfung gegen den aktuellen Live-Build (nicht nur Test-Code)
- Befund über Platzhalter und offene Sinan-Aufgaben (SIN-340, SIN-341)
- Dokumentation mit Datum und Beleg in `product-readiness.json`
