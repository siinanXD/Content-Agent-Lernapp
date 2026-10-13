# SIN-520 — Werbeclip: Higgsfield-API-Aufruf, Status, Download, Einblendung „KI“

**Links:** [SIN-485](docs/decisions/SIN-485-werbeclips-higgsfield.md), SIN-483 (Revideo), SIN-480 (Konto/Key), [Higgsfield-Docs](https://docs.higgsfield.ai), `scripts/autonomy/werbeclip.mjs`, `.github/workflows/werbeclip.yml`, `docs/autonomy/higgsfield.json`

## Entscheidung

1. `werbeclip.mjs lauf` ruft `POST basisUrl/modell` mit `parameter` der Stufe plus `prompt` (Header `Authorization: Key <ID>:<SECRET>`, `Idempotency-Key` je Clip und Lauf), fragt `status_url` ab bis `completed`, lädt `video.url` herunter. `failed`/`nsfw` werfen `ClipFehler` (laut FAQ nicht berechnet, Kosten werden nicht gezählt).
2. Deckel: `assertWithinProductCap` vor jedem Aufruf (unverändert aus SIN-485). `kosten_eur` = Listenpreis-Summe der tatsächlich gestarteten Clips.
3. Einblendung „Mit KI erstellt“: `render.mjs --werbeclip <clip> <aus>` nutzt dieselbe Revideo-Szene (Variable `werbeclip`), dauerhaft unten rechts, Farben aus Tokens. Kein neues Design-Element, nur der bestehende Hinweis-Text.
4. Ablage über `registrieren` aus `video.mjs` (Bucket `werbemittel`), Zeile mit `wartet_auf_freigabe`.
5. Neuer Workflow `werbeclip.yml`: nur `workflow_dispatch` mit Eingabe `freigabe: ja` (bezahlter Lauf). Der erste echte Lauf geschieht erst nach Sinans Freigabe.

## Annahmen

- **Secret-Namen:** `HIGGSFIELD_KEY_ID` und `HIGGSFIELD_KEY_SECRET` (aus der Header-Form abgeleitet; SIN-480 war im Worker nicht einsehbar). Fehlen sie, bricht der Workflow ab, ohne aufzurufen. Dafür liegt ein `sinan`-Issue vor.
- **Polling:** Die Docs-Seite war im Worker nicht abrufbar. Annahme: Abstand 2, 3, 5, 8, 10, 15, 20, dann 30 s, Abbruch nach 15 min. Status-Werte `queued`/`in_progress`/`completed`/`failed`/`nsfw` und `video.url` stammen aus dem Issue. Bei Abweichung die Konstanten `BACKOFF_SEKUNDEN` und `MAX_WARTEN_SEKUNDEN` anpassen.
- Seedance ist Text-zu-Video: der beste Entwurf wird gewählt (Bewertung bleibt leer, also der erste), aber nicht als Bildreferenz mitgeschickt, weil kein Referenzfeld belegt ist.
- Die Ablage-Pfade liegen unter `lern-app-werbeclip/`.
- Tests mit gemocktem `fetch`; ein echter Lauf wurde nicht gemacht. Kosten danach mit open.higgsfield.ai/analytics abgleichen.

## Warum

Injizierbares `fetch` und `warte` machen Erzeugen, Statusschleife und Fehler ohne Key testbar; der bezahlte Pfad hängt hinter einer ausdrücklichen Freigabe-Eingabe.
