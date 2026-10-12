# SIN-484 — Marketing-Agent: Werbetexte pro Kurs, nur mit Freigabe

**Links:** [SIN-484](https://linear.app/sinan-kahraman/issue/SIN-484), `.github/workflows/marketing.yml`, `scripts/autonomy/marketing.mjs`, `supabase/migrations/20261019020000_sin484_werbemittel_texte.sql`, [SIN-483](SIN-483-video-agent.md) (Tabelle `werbemittel`), [Anthropic-Preise](https://platform.claude.com/docs/en/about-claude/pricing). Fertige Lösung für diese Prüfung gibt es nicht; Eigenbau, klein und ohne neue Pakete.

## Entscheidung

1. **3 Varianten je Lauf:** LinkedIn, Website-Kurztext, E-Mail an Bildungsträger, in einer Antwort als JSON.
2. **Zahlen nur aus der Datenbank:** `courses` (Status `published`), `units` (Anzahl, Minuten), `sources`, `questions`. Der Prompt nennt nur diese Zahlen, die Prüfung verwirft jede andere Zahl im Text.
3. **Prüfung nach dem Schreiben** (`pruefeText`): „mit KI erstellt“ nötig, Bildungsträger/Ausbilder genannt, keine Garantien, keine IHK-Aufgaben/-Logos, keine Zulassungsbehauptung, keine direkte Ansprache Lernender. Durchgefallene Texte werden verworfen; bestehen nicht alle 3, wird nichts gespeichert.
4. **Modell:** `claude-haiku-5-5` zuerst, bei verworfenem Text einmal `claude-sonnet-5-5`. Deckel 1 € pro Lauf (Standardpreise, 0,92 €/USD).
5. **Ablage:** `werbemittel`, Status immer `wartet_auf_freigabe`; die Migration erweitert nur `art` und fügt Textspalten hinzu. Freigabe und Veröffentlichung folgen im Leitstand, hier wird nichts veröffentlicht.
6. **Auslöser:** vorerst von Hand (`workflow_dispatch`).

## Annahmen

- **Modellwahl:** Der Bericht `ab-haiku-sonnet-2026-10-12.json` enthält nur „bestanden“, keine Werte je Modell. Darum gilt Haiku als günstigstes Modell, die Textprüfung entscheidet über die Eskalation auf Sonnet. Nach Auswertung des Vergleichs anpassen.
- Haiku-5.5-Standardpreis 0,10 $ / 0,50 $ je 1 Mio. Token ist der doppelte Batch-Preis (SIN-398), nicht gegen die Preisseite geprüft.
- Automatischer Auslöser bei Status „veröffentlicht“ folgt, sobald klar ist, wie Doppelungen (ein Satz Texte je Kurs) vermieden werden. Die Freigabe geschieht bis dahin direkt in der Tabelle `werbemittel`.
- „Echte Zahlen“ für den MAF-Kurs: Ein Lauf braucht die Produktiv-Datenbank und `ANTHROPIC_API_KEY`; im Worker nicht ausführbar, der Lauf ist nach dem Merge von Hand zu starten (Workflow `marketing`, Stichwort `MAF`). Der Test deckt die Zahlenprüfung mit Datenbankzeilen ab.
- Verbotsmuster sind Regex und fangen nicht jede Umschreibung; Sinans Freigabe bleibt die letzte Instanz.

## Warum

Werbung für Bildungsträger muss ehrlich bleiben (FernUSG, keine Prüfungsversprechen); eine feste Prüfung nach dem Modell ist verlässlicher als nur eine Prompt-Regel.
