# SIN-485 — Video-Agent: KI-Werbeclips über die Higgsfield-API, Deckel 5 € pro Produkt

**Links:** [Higgsfield-Docs](https://docs.higgsfield.ai), SIN-480 (Konto und Key), SIN-483 (Tutorial-Video, Tabelle `werbemittel`), `scripts/autonomy/werbeclip.mjs`, `docs/autonomy/higgsfield.json`, `supabase/migrations/20261019010000_sin485_werbeclips.sql`

## Entscheidung

1. **Ein Zugang:** Higgsfield-API, Key `HIGGSFIELD_API_KEY` (nur Umgebung, nie im Repo).
2. **Zwei Stufen:** 3 Entwürfe (5 s) mit einem günstigen Modell, danach der beste Entwurf einmal final (8 s) mit Seedance. Der Entwurf liefert die Referenz für die Endstufe.
3. **Prompt** aus Produktdaten (Name, Nutzen, Zielgruppe Bildungsträger); fest: keine Personen, keine Logos oder Marken, kein Text im Bild.
4. **Deckel 5 € pro Produkt und Lauf:** `assertWithinProductCap` vor jedem bezahlten Aufruf; die Endstufe bleibt dabei immer bezahlbar (Entwurf wird nur gestartet, wenn danach noch Platz für den Final-Clip ist). Kosten stehen in `werbemittel.kosten_eur`.
5. **Kennzeichnung:** Feld `ki_kennzeichnung` („Mit KI erstellt“) in der Tabelle; die Einblendung im Clip kommt über das Revideo-Overlay aus SIN-483 und ist noch nicht angebunden.
6. **Status** immer `wartet_auf_freigabe`; nichts wird veröffentlicht.
7. **Migration:** `art` erlaubt zusätzlich `werbeclip` (Check-Constraint ersetzt, daher Risiko `high`), plus Spalten `kosten_eur`, `modell`, `ki_kennzeichnung`.

## Annahmen

- **Docs nicht gelesen.** Im Worker war der Abruf von docs.higgsfield.ai nicht möglich. Deshalb sind Modell-IDs, Endpunkte, Preise je Sekunde und Nutzungsrechte für Werbung in `docs/autonomy/higgsfield.json` bewusst `null`. Der Trockenlauf nennt die Lücken; `lauf` verweigert jeden bezahlten Aufruf, bis sie belegt sind. Belege (Link, Datum, Preis je Sekunde, Rechte je Modell) gehören danach in diese Datei.
- Der HTTP-Aufruf der API ist nicht angebunden (Schema unbelegt). Ein Folge-Issue bindet ihn an, sobald die Docs gelesen sind.
- Sekunden (3 × 5 + 8) und Anzahl der Entwürfe sind eigene Annahmen, über die Konfig änderbar.
- Wechselkurs wie `src/lib/quality/cost-guard.ts` (20 / 21,5 EUR je USD).
- Akzeptanz „echter Lauf unter 5 €“ ist ungeprüft, solange keine Preise belegt sind.

## Warum

Die Prüfung vor dem Aufruf und der Trockenlauf sind ohne Key testbar; geratene Preise würden den Deckel wertlos machen.
