# Trend-Radar 2026-KW41

Abruf: 7. Okt. 2026. Erster Lauf. Schwerpunkt: Figma Weave und Riffs, GitHub-Trends zu Orchestrierung, Dashboards, Motion. Zahlen stehen so auf den geöffneten Seiten; sonst „nicht ermittelt“. Das Datum des letzten Commits zeigen die GitHub-Seiten nicht (nur Commit-Anzahl): Spalte „Letzter Commit“ ist deshalb meist „nicht ermittelt, Repo trendet aktuell“.

## 1. Figma: Riffs und Weave

| Quelle | Abruf | Befund |
| --- | --- | --- |
| [Figma Release Notes](https://www.figma.com/release-notes/?m=1) | 7.10.2026 | 6.10. Figma Agent GA (Chat, generative Plugins, eigene Skills auch Starter). 30.9. Riffs in der Community, Motion mit eigenen Stilen, Audio, Text-Animation, Lottie-Export. 17.9. Figma-Node: jeden Frame mit einem Weave-Workflow verbinden. 25.9. Auto Layout mit vertikalem Umbruch. |
| [Figma Weave in Figma](https://help.figma.com/hc/en-us/articles/40779260614935-Use-Weave-tools-in-Figma) | 7.10.2026 | Weave-Tools sind KI-Apps auf Designinhalten (Mockups, Stil übertragen, Hintergrund ersetzen, Vektor-Illustration aus Text). Plan Professional, Organization oder Enterprise, Bearbeitungsrecht. Eigene Tools lassen sich in der Community veröffentlichen. Verbrauch: Figma-KI-Credits (Zahl nicht auf der Seite). |
| [Figma MCP: Tools](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) | 7.10.2026 | Weave-Tools: `weave_list_tools`, `weave_get_tool_inputs`, `weave_run_tool`, `weave_get_tool_run_output`, `weave_upload_asset`, `weave_cancel_tool_run`. Bezahltes eigenes Weave-Konto nötig, Verbrauch in Weave-Credits, Agent zeigt Kosten und fragt vor jedem Lauf. 1 bis 10 Läufe je Aufruf. |
| [Weave-Hilfe zu MCP](https://help.weavy.ai/en/articles/16202764-running-weave-tools-from-external-agents-mcp) | 7.10.2026 | HTTP 403, nicht erreichbar. |

**Riffs** sind laut Release Notes Beiträge (Frames, Animationen, Prototypen) auf dem Community-Profil. Das ist ein Schaufenster, kein Werkzeug für die Pipeline. Nützlich als Inspirationsquelle (Motion-Tests), nicht als Vorlage zum Übernehmen.

**Frage: Kann die Pipeline Weave direkt nutzen?** Teilweise, aber nicht empfohlen.
- `weave_list_tools` steht in der Doku. `weave_run_model` steht **nicht** in der geöffneten Doku-Liste (nur `weave_run_tool`); es kam nur in einer Suchzusammenfassung vor. Als nicht belegt behandeln.
- Die Werkzeuge laufen über den Figma-MCP-Server und brauchen ein bezahltes Weave-Konto, Credits und eine Kostenfreigabe je Lauf. Ob das ohne Mensch (Headless, CI, Token statt Anmeldung) geht, steht nicht in der Doku: nicht ermittelt.
- Das kollidiert mit AGENTS.md (Abrechnung nicht anfassen, neue kostenpflichtige Dienste = `risk:high`). Annahme: Weave bleibt Sache von Sinan (Klick-Aufgabe), nicht Teil der Pipeline.

| Zweck | Weave/Riffs/Motion hilft? |
| --- | --- |
| (a) Startseite mit Wow-Effekt (SIN-243) | Ja, als Skizze: Figma Motion (Lottie-Export, Text-Animation) für Prototypen. Umsetzung im Code mit Tokens (Stil E). |
| (b) Leitstand-Design (SIN-304) | Wenig. Auto Layout mit Umbruch hilft bei Kachelrastern. Weave bringt hier nichts. |
| (c) Lernbilder, SVG oder Illustration | Weave „Vektor-Illustration aus Text“ möglich, aber Kosten/Credits unklar. Für Lernbilder bleibt SVG im Code (prüfbar, barrierefrei, ohne Personendaten) erste Wahl. Illustration nur handverlesen. |
| (d) Agenten-Workflows | Nein direkt. Ideen kommen eher aus Abschnitt 2. |

## 2. GitHub-Trends (Monat, Woche, Tag)

Quellen, alle am 7.10.2026 geöffnet: [monatlich](https://github.com/trending?since=monthly), [wöchentlich](https://github.com/trending?since=weekly), [täglich](https://github.com/trending?since=daily), [TypeScript monatlich](https://github.com/trending/typescript?since=monthly), [JavaScript monatlich](https://github.com/trending/javascript?since=monthly). Beobachtung: Skills-Repos (ECC, mattpocock/skills, agent-skills, impeccable) und Agenten-Orchestrierung dominieren. Reine Dashboard-, Chart- oder Scroll-Bibliotheken fehlen in allen Trending-Listen. Next.js steht mit 1.885 Sternen im Monat nur am Rand.

| Fund | Was | Relevant für | Lizenz | Sterne (Monat) | Letzter Commit | Kosten | Aufwand | Risiko |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [paperclipai/paperclip](https://github.com/paperclipai/paperclip) | Orchestrierung für Agenten: Tickets, Budgets je Agent, Freigaben, Routinen, Skill-Studio | Leitstand (SIN-304): Vorbild für Budget- und Freigabe-Ansichten; Pipeline | MIT | 98.271 (+18.199) | nicht ermittelt, trendet aktuell | frei; braucht Node 24, Postgres | Muster abschauen: klein. Einsatz: hoch | Niedrig als Vorlage; als Ersatz für Dispatcher zu groß |
| [mvschwarz/openrig](https://github.com/mvschwarz/openrig) | Agenten-Teams (Claude Code, Codex) als YAML-Topologie, Chatroom, Graph-Ansicht im Terminal | Agenten-Workflows | Apache 2.0 | 5.639 (+3.327 Woche) | nicht ermittelt | frei | mittel | Mittel (tmux, jung) |
| [stablyai/orca](https://github.com/stablyai/orca) | Desktop-App, parallele Agenten in Git-Worktrees, Linear-Anbindung | Agenten-Workflows (Vergleich mehrerer Läufe) | MIT | 86.868 (+24.330) | nicht ermittelt | frei | klein (Sinan lokal) | Niedrig |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Design-Skill mit 24 Befehlen und 60 lokalen Regeln gegen KI-Optik (Schrift, Verläufe, Abstand) | Release-Kit (SIN-243), Anti-Slop-Regeln | Apache 2.0 | 78.089 (+11.864) | nicht ermittelt | frei | klein bis mittel: Regeln mit `docs/design/regeln-2026.md` abgleichen | Niedrig; Skill darf keine Farben außerhalb Tokens setzen |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | HTML wird zu deterministischem MP4 (Chrome + FFmpeg), GSAP/Lottie/Three.js, Agent-Skills | Startseite: kurze Demo-Videos; Lern-Clips | Apache 2.0 | 58.273 (+13.590) | nicht ermittelt | frei; FFmpeg, Node 22 | mittel | Mittel (Videogröße vs. Leistungsbudget) |
| [tt-a1i/archify](https://github.com/tt-a1i/archify) | Agent-Skill: Diagramme als eigenständige interaktive HTML-Datei aus typisiertem JSON | Leitstand-Doku, Pipeline-Schaubild | MIT | 79.003 (+28.776) | nicht ermittelt | frei | klein | Niedrig; Ausgabe nicht in die App einbetten ohne Token-Prüfung |
| [amineyarman/Kinesis.js](https://github.com/amineyarman/kinesis.js) | Motion per CSS-Eigenschaften (Tilt, Parallax, Scroll), 14 KB, ohne Abhängigkeiten, beachtet `prefers-reduced-motion` | Startseite (SIN-243) | MIT | 238 (Gesamt) | 6.10.2026 laut [Themenseite](https://github.com/topics/scroll-animation?o=desc&s=updated) | frei | klein | **Ausnahme nötig:** unter 500 Sterne. Nur nach Test von Fokus/Tastatur und Budget |
| [mksglu/context-mode](https://github.com/mksglu/context-mode) | Kontext-Sparen für Coding-Agenten (Werkzeugausgabe in Sandbox) | Worker-Kosten (SIN-298 und Sparen) | nicht ermittelt | 25.591 (+5.188) | nicht ermittelt | frei | klein | Mittel, Lizenz ungeprüft |

Nicht aufgenommen, weil kein Bezug: gods-eye-view, ghidra, AnyPS5, open-code-review.

## 3. Hugging Face (Abruf 7.10.2026)

Quellen: [Modelle](https://huggingface.co/models?sort=trending), [Spaces](https://huggingface.co/spaces?sort=trending).

| Fund | Relevanz | Hinweis |
| --- | --- | --- |
| google/embeddinggemma-2 (0,7 Mrd., 795 Likes) | Kleines Embedding-Modell, für Quellensuche in der Pipeline denkbar | Lizenz auf der Seite nicht ermittelt. Erst Entscheidungsdatei, kein Wechsel jetzt. |
| Qwen/Qwen3.8-27B (17,2k Likes) | Offenes Modell | Für die Pipeline unnötig (Claude und OpenAI festgelegt). |
| Lightricks/LTX-2.5, Wan2.2 14B Fast | Bild-zu-Video | Nur Inspiration; kein Bedarf, Inhalte brauchen amtliche Quelle. |

## 4. Changelogs (Abruf 7.10.2026)

| Quelle | Neu | Folge fürs Projekt |
| --- | --- | --- |
| [Claude Plattform](https://platform.claude.com/docs/en/release-notes/overview) | Sonnet 5.5 (28.9., `claude-sonnet-5-5`), Opus 5.5 (22.9., 4/20 USD je MTok), Fable 5.1 (1.9.). `tool_choice` `any`/`tool` liefert 400 bei den neuen Modellen. Compaction on demand (Beta). Sonnet 4.5 endet am 30.11.2026. Seite zu 100.000 von 117.259 Zeichen gelesen. | Prüfen, ob Pipeline `tool_choice` erzwingt oder Sonnet 4.5 nutzt (vor 30.11.). Kein Handeln ohne Issue. |
| [Vercel](https://vercel.com/changelog) | AI Gateway: Fallback bei Konfidenz, neue Modelle; Speed Insights ohne FID ab 1.11. | Kein Bedarf. Speed-Insights-Änderung prüfen, falls genutzt: nicht ermittelt. |
| [Supabase](https://supabase.com/changelog) | Scoped Personal Access Tokens (GA), OrioleDB Beta, Logs werden nutzungsbasiert. | Scoped Tokens passen zu „wenig Rechte“; Zugangsdaten gehören Sinan. |
| OpenAI | nicht abgerufen (keine Seite geöffnet) | Nächster Lauf. |

## Top 5

1. **Paperclip** als Vorbild für den Leitstand (Budgets, Freigaben, Routinen).
2. **Impeccable** gegen KI-Optik, passend zu Anti-Slop-Regeln und SIN-243.
3. **Orca / OpenRig** für parallele Agentenläufe und Vergleich.
4. **HyperFrames** für kurze Demo-Videos auf der Startseite (Budget prüfen).
5. **Kinesis.js** für leichte, barrierearme Motion (Ausnahme: unter 500 Sterne).

Weave: Sinan probiert es von Hand aus; nicht in die Pipeline.

## Nicht gefunden oder nicht erreichbar

- Weave-Hilfeseite zu MCP: 403.
- `weave_run_model`: in der Figma-Doku nicht gelistet, nur in einer Suchzusammenfassung.
- Figma Make (Vorlagen), Community-Dateien und -Plugins mit Wachstum, Shader: nicht geöffnet.
- Letzter Commit je Repo: von GitHub-Seiten nicht lesbar, nicht ermittelt. Lizenz context-mode nicht ermittelt.
- Dashboards mit Live-Graphen und Scroll-Bibliotheken: kein Treffer in den Trending-Listen; GSAP-Seite 404, nicht geprüft.
- Sterne-Zuwachs der letzten 30 Tage nur für Repos in der Monatsliste.
- OpenAI-Changelog, Awesome-Listen, MCP-Server-Verzeichnisse: nicht abgerufen.
