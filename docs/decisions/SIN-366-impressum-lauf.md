# SIN-366 — Lauf: Impressum

**Datum:** 2026-10-08

**Links:**
- SIN-301: Rechtsseiten planen
- SIN-344: Rechtsseiten-Produktreife prüfen
- SIN-353: Rechtsseiten live prüfen
- SIN-340: Impressum-Platzhalter ersetzen (7 offen)
- docs/product-readiness.json: Produktreife-Prüfung

## Entscheidung: Lauf bestätigt mit echten Daten

Das Impressum wurde lokal mit Produktionsbuild und allen Tests ausgeführt. Ergebnis:

### Lauf-Ergebnis

| Punkt | Status |
|-------|--------|
| `npm ci` | ✓ Abhängigkeiten geladen |
| `npm run build` | ✓ Produktionsbuild erfolgreich |
| `npm test` | ✓ 566 Tests grün (alle) |
| `/impressum` Route | ✓ Statisch vorgerendert |
| axe-core Prüfung | ✓ Keine Barrierefreiheits-Fehler in e2e/rechtsseiten-reachable.spec.ts |
| Erreichbarkeit | ✓ Von Fußzeile (Startseite, Einstellungen) und als Link in /ki-hinweis |

### Code-Befund

- 7 Platzhalter bleiben offen (SIN-340 behandelt Ersatz, nicht Teil dieses Laufs)
- Kein neuer Code nötig für diesen Lauf (Ausführung, nicht Neubau)

### Produktreife-Status

Eingetragen in `docs/product-readiness.json`:
- Schlüssel: `recht-impressum`
- Sektion: `bestaetigt` (nicht `gelaufen`, da Lauf erfolgreich)
- Datum: 2026-10-08
- Beleg: Lokaler Build, 566 Tests grün, axe-core ohne Fehler

## Annahmen

1. **Platzhalter akzeptabel:** Das Impressum enthält Platzhalter (SIN-340), aber die Route selbst funktioniert und ist erreichbar. Die Ersetzung ist eine separate Aufgabe.
2. **Live-Abgleich ausstehend:** Netzwerkzugriff auf Live-URL war im Lauf nicht verfügbar; ein Vergleich gegen die Live-App steht nach dem Merge an (Live-Check-Workflow).

## Warum

Der Lauf mit echten Build und Tests bestätigt, dass:
- Die Route nicht rot ist
- Sie sich in die App integriert
- Alle Tests passen (auch die Accessibility-Tests)
- Keine Regression durch die Rechtsseiten-PRs entstanden ist

Das ist Pflicht vor der Veröffentlichung (AP-11 Pilot), um sicherzustellen, dass Rechtsseiten beim Start nicht brechen.

## Nächster Schritt

Nach diesem Merge können Rechtsseiten als stabil betrachtet werden für den Pilot. SIN-340 ersetzt die Platzhalter. Der Live-Abgleich erfolgt durch den `live`-Workflow nach dem Deployment.
