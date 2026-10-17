# SIN-797: Content-Fabrik läuft durch, bis die Content-Punkte der Fertig-Liste stehen

- Linear: SIN-797 (Sinan, 17.10.2026), Vorgänger SIN-469, SIN-645, SIN-450
- Code: `runAllowed`, `contentPunkteOffen` in `src/lib/generate/content-grow.ts`; `lastRunPaused` in `src/lib/generate/factory-status.ts`; `scripts/content-grow.ts`; `.github/workflows/content-grow.yml`

## Entscheidung

- Solange `docs/FERTIG.md` eine unabgehakte Zeile zu Industriekaufmann oder Industriemechaniker hat, entfallen Tages- und Wochengrenze. Takt: alle 2 h (Cron `47 */2 * * *`), `concurrency` verhindert parallele Läufe.
- Es bleiben: 20 € je Lauf (Stopp 19 €), Richter, Content-Guard, Quellenpflicht. Der Teilbatch-Check (`partGate`) rechnet im Durchlauf ohne Wochensumme.
- Meldet die Anthropic-API Limit oder leeres Guthaben (`isApiLimitError`), endet der Lauf als „pausiert“ (Exit 0, SIN-450) und legt ein `sinan`-Issue „API-Guthaben aufladen“ an. Der nächste geplante Lauf liest den jüngsten Eintrag in `content_factory_runs` und überspringt; nur `workflow_dispatch` startet wieder.
- Sind alle Content-Punkte abgehakt, gilt der alte Takt: geplant nur Mo/Mi/Fr (der 2-h-Cron überspringt andere Tage), höchstens ein Lauf je Tag, Wochendeckel `WEEK_CAP_EUR`.

## Annahmen

- Der „Push an Sinan“ ist die Linear-Benachrichtigung zum neuen `sinan`-Issue; ein eigener Push-Dienst existiert im Repo nicht und wird nicht neu angelegt.
- „Content-Punkt“ = unabgehakte Zeile mit Industriekaufmann oder Industriemechaniker; die Wochengrenze im Code ist 40 € (SIN-645), nicht 60 €.
- `LINEAR_API_KEY` ist als Secret vorhanden (der Linear-Kommentar-Schritt nutzt es schon); fehlt er, bleibt die Pause trotzdem wirksam, nur das Issue entfällt (Warnung im Log).

## Warum

Sinan hat etwa 76 € Guthaben freigegeben und will den Content schnell; das Guthaben ist die einzige Grenze, der Lauf-Deckel schützt vor Ausreißern.
