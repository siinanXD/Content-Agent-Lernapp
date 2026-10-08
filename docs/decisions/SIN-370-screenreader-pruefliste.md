# SIN-370 Screenreader-Prüfliste und Code-Befunde

- Links: [WCAG 2.2 4.1.3 Statusmeldungen](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [ARIA live regions (MDN)](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/ARIA_Live_Regions), [Prüfliste](../quality/screenreader-pruefliste.md)
- Entscheidung: Manuelle Prüfliste je Kernroute in `docs/quality/`; behebbare Befunde im selben PR (`main`-Landmark, dauerhafte Live-Region für die Antwort-Rückmeldung, Fokus auf die neue Frage, kein doppeltes „RICHTIG“).
- Annahmen: Der Vorlesetext ist aus dem Code abgeleitet, nicht mit echtem Reader gemessen (kein Reader in der CI). Die manuelle Prüfung übernimmt Sinan als Issue mit Label `sinan`. Keine neuen Bibliotheken, Komponenten oder Farben.
- Warum: Eine Live-Region, die erst mit ihrem Inhalt eingefügt wird, wird von Readern unzuverlässig angesagt; eine vorhandene leere Region ist der robuste Weg.
