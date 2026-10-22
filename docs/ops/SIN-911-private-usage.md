# Private Verbrauchsmessung (SIN-911)

`verbrauch.mjs` speichert strukturierte Marker ausschließlich im privaten
Linear-Auftrag. Es braucht `LINEAR_API_KEY`, `GITHUB_REPOSITORY`, die Laufkennung
und Issue-Kennungen (Worker-Argument, Reparatur-PR-Titel oder Branch).
Fehlt der private Zugang, wird nur eine neutrale Warnung ausgegeben; nie ein
öffentlicher Fallback. Ohne gespeicherte Daten ist die Messung unvollständig.

Der Wochenleser lädt private Kommentare einschließlich Folgeseiten und zählt
jede Laufkennung pro Repository einmal. Historische PR-Marker werden noch
gelesen, aber nicht neu veröffentlicht. Der private Datensatz gewinnt bei
gleicher Laufkennung. Scheitert der private Abruf, wird keine vollständige
Wochensumme behauptet. Bestehende Telegram-Updates dürfen die private Fassung
enthalten; öffentliche Digest-Kommentare und Logs verwenden die neutrale Fassung.

Vor Aktivierung Reparaturzugang zu Linear und eine echte Worker-/Reparaturprobe
belegen. Ein Unit-Test mit simuliertem Netz ersetzt diesen Nachweis nicht.
Keine Modell-, Preis-, Budget- oder GitHub-Rechteänderung. Beim Zurücksetzen
dieses Patches würde die bisherige öffentliche Ausgabe wiederkehren: deshalb
keinen automatischen Revert ohne erneute Datenschutzprüfung.

Die historischen PR-Marker erst nach privater Migration entfernen. Andere
Produzenten (Content-Berichte, Status-Seite, bestehende Logs/Artefakte) bleiben
gesondert zu inventarisieren und zu bereinigen; dieser Patch behauptet keine
vollständige Anonymisierung aller Repository-Ausgaben.
