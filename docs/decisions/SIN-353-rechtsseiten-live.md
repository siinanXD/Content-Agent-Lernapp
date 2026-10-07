---
name: SIN-353-rechtsseiten-live
description: Prüfung der Rechtsseiten (KI-Hinweis, Impressum, Datenschutz) am Code
metadata:
  type: project
---

## Entscheidung

Die Rechtsseiten sind am Code des Branches geprüft (Stand 2026-10-07) und in der Produktreife-Tabelle eingetragen. Annahme: Der Netzzugriff war im Lauf gesperrt, es gab keinen Abruf gegen die laufende App. Ein Abgleich gegen die laufende App ist nach dem Merge offen.

## Befund (am Code)

- Build erfolgreich, 557 Tests grün, darunter `e2e/rechtsseiten-reachable.spec.ts` (Erreichbarkeit, axe-core).
- `/ki-hinweis`: vollständig, kein Platzhalter.
- `/impressum`: 7 Platzhalter offen, Inhalt folgt in SIN-340.
- `/datenschutz`: 5 Platzhalter offen, Inhalt folgt in SIN-341.

Die konkreten Platzhalter stehen nur im Quelltext der Seiten, nicht hier. Der Beleg enthält keine Personendaten.

## Warum

Die Produktreife-Checkliste in PRODUCT.md (Recht/Vertrieb) verlangt KI-Kennzeichnung, Impressum und Datenschutzerklärung. Gebaut sind alle drei; Impressum und Datenschutz warten auf Inhalte von Sinan.
