# SIN-511: `freigegeben` bleibt, wenn nur main in den PR gemergt wird

- Issue: https://linear.app/sinan-kahraman/issue/SIN-511
- Verwandt: SIN-223 (Risiko-Regeln), SIN-438 / PR #245 (Anlass)
- Doku: GitHub REST „Compare two commits“ (`basehead` mit drei Punkten = ab Merge-Basis)

## Entscheidung

- `pr-gate` liest die geänderten Dateien aus `compareCommitsWithBasehead` (`<Basis-SHA>...<Kopf-SHA>`), nicht mehr aus `pulls.listFiles`. Neue High-Gründe kommen nur aus diesem Diff.
- `risk.mjs` bekommt `newReasons(approvedKeys, current)`. Entfällt die Freigabe, steht der konkrete Grund (Datei + Regel) im Steckbrief-Hinweis und in einem eigenen Kommentar.
- Test: gleiche PR-Dateien nach einem Merge aus main lassen die Freigabe gültig; eine neue High-Datei entzieht sie und wird benannt.

## Annahmen

- Die genaue Ursache in PR #245 ließ sich ohne Gate-Logs nicht belegen. Annahme: abweichende Dateiliste oder Patches nach dem Merge (Konflikt in `docs/autonomy/LEHREN.md`) erzeugten andere Schlüssel. Der Diff ab Basis-SHA und der Kommentar mit dem Grund machen das beim nächsten Fall sichtbar.
- `newReasons` ist in `pr-gate` optional geladen (Modul kommt aus main); vor dem Merge fällt der Hinweis auf „keine Angabe“ zurück.

## Warum

Die Zusage in AGENTS.md („Freigabe bleibt bei Folge-Commits“) soll auch bei Merges aus main gelten, und Sinan soll bei einem Entzug sofort den Grund sehen.
