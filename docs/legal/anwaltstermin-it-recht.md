# Anwaltstermin IT-Recht: Vorbereitung (SIN-634)

Ziel: 1 Stunde Fachanwalt für IT-Recht, bevor der erste Vertrag mit einem Bildungsträger unterschrieben wird. Das Ergebnis kommt nach `docs/decisions/SIN-634-anwaltstermin-ergebnis.md` (Vorlage unten). Wir sind kein Anwalt; die Annahmen aus `docs/PRODUCT.md` (Abschnitt „Recht“) sind unbestätigt, bis der Termin stattgefunden hat.

## Zu klärende Fragen (in dieser Reihenfolge)

1. **FernUSG.** Wir verkaufen an Bildungsträger und Ausbilder, nicht an Lernende. Genügt das, damit keine ZFU-Zulassung nötig ist? Was ändert sich, wenn ein Bildungsträger die App an Lernende weitergibt und dafür Entgelt nimmt?
2. **EU-KI-Gesetz, Einstufung.** Die KI erzeugt nur Lerninhalte; Bewertung und Zulassung macht ein Mensch (Grundsatz in `AGENTS.md`). Fällt die App damit aus der Hochrisiko-Stufe für Bildung (Anhang III) heraus? Was gilt, wenn Ausbilder Ergebnisse als Entscheidungshilfe nutzen?
3. **EU-KI-Gesetz, Kennzeichnung.** Reicht die sichtbare Kennzeichnung „KI-erzeugt“ je Lerneinheit mit Quelle und Abrufdatum? Gilt die KI-Kompetenzpflicht (Art. 4) für uns als Anbieter, für den Bildungsträger als Betreiber oder für beide?
4. **Auftragsverarbeitung.** Wer ist Verantwortlicher, wer Auftragsverarbeiter: Bildungsträger oder wir? Brauchen wir selbst einen AVV-Mustervertrag für Bildungsträger? Reichen die Standard-AVV der Anbieter (siehe `avv-uebersicht.md`) samt Drittlandübermittlung bei Anthropic und OpenAI?
5. **Haftung.** Wie begrenzen wir die Haftung für fachlich falsche Lerninhalte (Prüfungsvorbereitung, Sicherheitsthemen) in den AGB?
6. **Urheberrecht.** Genügt „nur amtliche Quellen, Quellenangabe, Abrufdatum“ für Rahmenpläne und Verordnungen? Wo ist die Grenze zu IHK-Prüfungsaufgaben?
7. **Rechtsseiten.** Impressum und Datenschutzerklärung in `content/legal/` kurz prüfen lassen.

## Mitbringen

- `docs/PRODUCT.md`, Abschnitt „Recht: EU, Deutschland, NRW“
- `docs/legal/avv-uebersicht.md` (Anbieter, Zweck, Datenarten)
- `content/legal/datenschutz.md` und `content/legal/impressum.md`
- Eine Seite Produktbeschreibung: Wer nutzt die App, wer zahlt, welche Daten fließen, was die KI tut und was nicht

## Vorlage für das Ergebnis

Datei `docs/decisions/SIN-634-anwaltstermin-ergebnis.md`: Datum, Kanzlei (ohne Honorarangaben), je Frage 1 bis 7 die Antwort in 1 bis 3 Sätzen, daraus folgende Änderungen (Texte, AGB, Produktregeln) als eigene Issues. Danach in `checkliste-demo-zugang.md` den Punkt „1 Stunde Fachanwalt IT-Recht“ abhaken.
