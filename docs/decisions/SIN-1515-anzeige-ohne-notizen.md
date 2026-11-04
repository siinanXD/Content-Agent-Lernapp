# SIN-1515 Anzeige ohne interne Notizen

Entscheidung: Die Lerner-Anzeige filtert Prüfhinweise (`PRUEFHINWEIS_MUSTER`, jetzt mit "vor Publikation"), Platzhalter und Kennungen. Die Daten bleiben unverändert, deshalb keine Migration und keine Sicherung nötig.
Annahme: Die Zählung betroffener Einheiten und Fragen braucht Lesezugriff auf Supabase. Den hatte dieser Lauf nicht; sie steht im PR als offen. Das Warum-Feld sagt nur "KI-erklärt", weil kein Mensch geprüft hat.
