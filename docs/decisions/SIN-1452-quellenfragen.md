# SIN-1452: Quellenfragen und Startkarte

- Der Wächter `pruefeVeroeffentlichung` (`src/lib/review/content-guard.ts`) lehnt Fragen ab, deren Text nach der Quelle fragt („laut Quelle“, „die Quelle ist“). Regel `quellenfrage`, Prüfung `verbotsliste`.
- Die Karte „Als Nächstes“ zeigt den ersten Satz der Erklärung ohne Links statt der ersten Frage.
- Annahme: Die Zählung (Einheiten mit nur einer Frage, reine Quellenfragen) braucht Lesezugriff auf die Datenbank. Dieser Lauf hatte keinen; die Zahlen stehen aus.
- Altfragen: Es gibt noch keine automatische Neuerzeugung. Der vorhandene Weg (`scripts/ap15-regen-dropped.ts`) kostet Claude-Aufrufe je Einheit; Umfang erst nach der Zählung, bei Kosten zuerst Label `entscheidung`.
