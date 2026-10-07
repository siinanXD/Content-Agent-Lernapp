# SIN-321 — Skills-Test: Superpowers, Caveman, Impeccable prüfen und eine Woche messen

- **Links:** Linear [SIN-321](https://linear.app/sinan-kahraman/issue/SIN-321/skills-test-superpowers-caveman-und-impeccable-prufen-und-eine-woche); Messung [SIN-320](SIN-320-sparsam-bauen.md); Skill-Aufbau `docs/skills/README.md`; Kandidaten (Repos laut Social-Post, **ungeprüft**): Superpowers `obra/superpowers`, Caveman `JuliusBrussee/caveman`, Impeccable `pbakaus/impeccable`, Addy-Osmani-Skills `addyosmani/agent-skills`. Die Repo-Namen stammen aus dem Gedächtnis des Agenten und sind vor der Prüfung zu bestätigen.
- **Entscheidung:**
  1. **Status: Prüfbericht offen.** Im Lauf war kein Netzzugriff möglich (Websuche, WebFetch, GitHub-API wurden nicht freigegeben). Deshalb stehen hier **keine** Werte zu Sternen, Lizenz, letztem Commit, Token-Größe oder SKILL.md-Inhalt. Es wird nichts installiert und nichts geladen, bis die Prüfung vorliegt.
  2. **Werkzeug:** `scripts/autonomy/skill-pruefung.mjs <owner/repo> [Pfad/SKILL.md]` liest Lizenz, Sterne, letzten Push per GitHub-API und gibt eine Tabellenzeile aus. Es schätzt die Tokens (4 Zeichen je Token) und markiert Muster in der SKILL.md (Netz, Geheimnisse, versteckte Kommentare, Ausführen, „Regeln ignorieren“). Treffer sind Hinweise; die SKILL.md wird trotzdem **von Hand ganz gelesen**. Kein Skill wird ausgeführt. Die Regel aus AGENTS.md (MIT/Apache, jünger als 6 Monate, mehr als 500 Sterne) steckt in `repoBewerten`.
  3. **Vorgesehene Zuordnung (nach bestandener Prüfung):** Superpowers → nur Backend-Worker; Caveman → alle Worker; Impeccable **oder** Addy-Osmani-Skills (nur einer, der mit weniger Tokens und ohne Kollision mit `docs/design/regeln-2026.md`) → Frontend-Worker. Understand Anything / Graphify / Archify: einmaliger Lauf für Landkarte und Architektur-Graph, nicht installiert lassen. Nicht übernehmen: UI UX Pro Max (kollidiert mit Design-Regeln), Ponytail (unklar), Awesome-Listen (nur Quelle).
  4. **Wochentest (nach bestandener Prüfung):** Skill-Dateien versioniert unter `docs/skills/extern/<name>/` (Quelle, Commit-Hash, Lizenz im Kopf), nur vom passenden Worker-Typ gelesen. Messgrößen gegen die Woche davor: Tokens je gemergtem PR (Merker `<!-- usage -->` aus SIN-320), Reparatur-Runden je PR (Labels `repair:1..3`), Anteil grüner Erst-Builds, Bildvergleich-Abweichungen (`visual.yml`). Ergebnis im Tages-Update; Skills ohne messbaren Nutzen fliegen per PR wieder raus.
- **Annahmen:**
  1. Vor SIN-320 gibt es keine Messwerte; die „Woche davor“ ist darum nur aus Reparatur-Labels und Build-Ergebnissen ableitbar, Tokens je PR gibt es erst ab SIN-320.
  2. Der Social-Post ist KI-generiert; Namen, Sterne und Funktionen darin gelten als unbelegt.
  3. Der Prüflauf braucht Netz. Er kann in einem Workflow mit GitHub-Zugriff oder lokal laufen; `GITHUB_TOKEN` nur lesend genügt.
- **Offen bis „Fertig“:** (a) Prüfbericht je Kandidat hier eintragen (Tabelle unten), (b) 7 Tage Test, (c) Entscheidung behalten/entfernen je Skill. Das Issue bleibt bis dahin offen.
- **Warum:** Erfundene Prüfwerte wären schlimmer als keine; der Loop soll fremden Anweisungen nur nach Lesen der Quelle vertrauen. Das Skript macht die Prüfung wiederholbar und sperrt keine Abläufe.

## Prüfbericht (offen)

| Repo | Lizenz | Sterne | Letzter Push | Größe | Befunde | Regel |
| --- | --- | --- | --- | --- | --- | --- |
| obra/superpowers | nicht geprüft | – | – | – | – | – |
| JuliusBrussee/caveman | nicht geprüft | – | – | – | – | – |
| pbakaus/impeccable | nicht geprüft | – | – | – | – | – |
| addyosmani/agent-skills | nicht geprüft | – | – | – | – | – |
