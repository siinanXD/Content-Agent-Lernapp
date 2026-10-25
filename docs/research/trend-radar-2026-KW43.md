# Trend-Radar 2026-KW43

Abruf: 25. Okt. 2026. Vergleich mit [KW41](trend-radar-2026-KW41.md). Zahlen stehen so auf den geöffneten Seiten; sonst „nicht ermittelt“. GitHub zeigt kein Datum des letzten Commits: Spalte „Letzter Commit“ ist „nicht ermittelt, Repo trendet aktuell“.

## Neu oder deutlich verändert gegenüber KW41

- Design-Skills gegen KI-Optik sind jetzt eine eigene Kategorie: Hallmark (neu) neben Impeccable (86.777 Sterne, KW41: 78.089).
- Paperclip wächst weiter: 107.082 Sterne (KW41: 98.271).
- Sicherheits-/Sandbox-Thema neu: Cloudflare security-audit-skill, NVIDIA OpenShell.
- Figma: Agent GA (6.10.), Code layers/Specs/Make mit Payload-Backend (15.10.). Weave: keine Release-Note.
- Anthropic: Haiku 5.5, OpenTelemetry-Export, SDKs unter Apache 2.0 mit Breaking Changes (21.10.).

## 1. GitHub Trending (Abruf 25.10.2026)

Quellen: [täglich](https://github.com/trending?since=daily), [wöchentlich](https://github.com/trending?since=weekly), [monatlich](https://github.com/trending?since=monthly), [TypeScript wöchentlich](https://github.com/trending/typescript?since=weekly).

| Fund | Was | Relevant für | Lizenz | Sterne (Gesamt; Zuwachs) | Letzter Commit | Kosten | Aufwand | Risiko |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | Design-Skill: 48 Themen, Lint im Browser auf „maschinengemachte“ Muster, Review mit frischem Kontext. Install `npx skills add nutlope/hallmark` | Release-Kit, Lern-App (SIN-243 Anti-Slop) | MIT | 32.645; 455 heute | nicht ermittelt | frei | klein: Lint-Regeln mit Stil E abgleichen | Niedrig; Themen dürfen keine Farben außerhalb Tokens setzen |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Design-Sprache/Skill gegen KI-Optik (KW41 bewertet) | wie oben | Apache 2.0 (KW41) | 86.777; 15.700 Monat | nicht ermittelt | frei | klein | Niedrig |
| [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | Skill: sechsphasiges Sicherheits-Audit mit schema-geprüften Funden | Pipeline, Review-Agent (SIN-297) | MIT | 45.487; 22.219 Monat | nicht ermittelt; nur 14 Commits | frei, Tokenverbrauch | mittel | Mittel (jung, Ausgabe prüfen) |
| [NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell) | Sandbox-Laufzeit für Agenten; Richtlinie für Dateien/Netz, Agent sieht keine echten Zugangsdaten | Worker-Sicherheit, Hermes (AP-10) | Apache 2.0 | 19.679; 10.495 Monat | nicht ermittelt | frei | hoch (Laufzeitwechsel) | Mittel; nur als Vorbild für Zugangsdaten-Trennung |
| [paperclipai/paperclip](https://github.com/paperclipai/paperclip) | Agenten-Verwaltung (KW41) | Leitstand (SIN-304) | MIT (KW41) | 107.082; 25.709 Monat | nicht ermittelt | frei | Muster: klein | Niedrig als Vorlage |
| [stablyai/orca](https://github.com/stablyai/orca) | Flotte von Coding-Agenten verwalten (Desktop, Mobil, Remote) | Agenten-Workflows | MIT (KW41) | 105.206; 9.828 Woche | nicht ermittelt | frei | klein | Niedrig |
| [thesysdev/openui](https://github.com/thesysdev/openui) | Generative UI: Modell streamt UI aus eigener Komponentenbibliothek (React u. a.). Seite nennt „bis 67 % weniger Token als JSON“ (Eigenangabe) | Lern-App, Leitstand | MIT | 13.700; 2.131 Woche | nicht ermittelt | frei | mittel | Mittel: kollidiert mit „keine neuen Komponenten ohne Figma“; nur Beobachtung |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | HTML zu Video (KW41) | Startseite | Apache 2.0 (KW41) | 71.702; 18.759 Monat | nicht ermittelt | frei | mittel | Mittel |
| [mksglu/context-mode](https://github.com/mksglu/context-mode) | Kontext sparen (KW41) | Worker-Kosten | nicht ermittelt | 32.163; 8.261 Monat | nicht ermittelt | frei | klein | Lizenz ungeprüft |
| [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight), [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Agenten-Gedächtnis | Worker (LEHREN.md deckt das schon ab) | nicht ermittelt | 53.537 / 102.927 | nicht ermittelt | frei | mittel | Mittel; kein Bedarf |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Referenz-MCP-Server (Fetch, Filesystem, Git, Memory, Time …) | Agenten-Workflows | Apache 2.0 neu, MIT alt | 91,5k | Releases leer, nicht ermittelt | frei | klein | Niedrig |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Verzeichnis offizieller Claude-Code-Plugins | Skills-Ökosystem | nicht ermittelt | 44.429; 7.817 Monat | nicht ermittelt | frei | klein | Niedrig |

Nur Beobachtung, kein Bezug: ruflo, opencode, ComfyUI, vllm, VoiceStudio, ghidra, rea, text-to-cad. Reine Dashboard-, Chart- oder Animations-Bibliotheken fehlen weiter in allen geöffneten Listen.

## 2. Figma (Abruf 25.10.2026)

Quelle: [Release Notes](https://www.figma.com/release-notes/?m=1).

| Datum | Neu | Folge |
| --- | --- | --- |
| 23.10. | Frame-Vorlagen iPhone Duo und iPhone 18 | Für Device Mockups nutzbar (Sinan) |
| 15.10. | Code layers (offene Beta, bis 4.11. frei), Specs (Beta), Make baut Payload-Backend, Code sources (geschlossen), Design-Library-Guidelines (Beta), Figma MCP +20 Partner | Guidelines könnten Stil E für den Figma-Agenten festhalten |
| 13.10. | Gemini 4 Argon in Make | – |
| 6.10. | Figma Agent GA, generative Plugins GA, eigene Skills auch Starter, verbraucht KI-Credits | Figma-Agent als Klick-Aufgabe testen |
| 30.9. | Riffs und Motion (offene Beta, Lottie-Export) | wie KW41 |

Nicht belegt: Weave (keine Release-Note), Shader. Community-Seiten für Plugins und Make-Vorlagen: HTTP 403.

## 3. Hugging Face (Abruf 25.10.2026)

Quellen: [Modelle](https://huggingface.co/models?sort=trending), [Spaces](https://huggingface.co/spaces?sort=trending). Lizenzen standen nicht auf den Listen: nicht ermittelt.

| Fund | Relevanz |
| --- | --- |
| Qwen/Qwen3.8-27B (18,4k Likes, 7,76M Downloads) | Offenes Modell, Pipeline bleibt bei Claude |
| Lightricks/LTX-2.5 (9,23k Likes), black-forest-labs/flux-3-image-klein-comfy (1,54k) | Bild/Video; kein Bedarf (Inhalte brauchen amtliche Quelle) |
| fishaudio/drama-3 (Sprache, 999 Likes) | Evtl. später Vorlesen; Lizenz ungeprüft |
| Embeddings, kleine Modelle | keines in den Top 15; embeddinggemma aus KW41 nicht mehr gelistet |

Mehrere trendende Einträge sind „Uncensored“-Varianten; nie verwenden.

## 4. Changelogs (Abruf 25.10.2026)

| Quelle | Neu | Folge |
| --- | --- | --- |
| [Claude Plattform](https://platform.claude.com/docs/en/release-notes/overview) (100.000 von 133.497 Zeichen gelesen) | 21.10. API-Version `2026-10-21`, SDKs unter Apache 2.0 mit Breaking Changes; 14.10. OpenTelemetry-Export (Beta); 7.10. Haiku 5.5, Sonnet-5.5-Cache-Lesen 0,10 USD/MTok; 9.10. Dynamic Workflows für Managed Agents (Beta); 30.9. Sonnet 4.5 endet 30.11. | Vor SDK-Update Breaking Changes lesen; Cache-Preis senkt Worker-Kosten; Sonnet-4.5-Nutzung prüfen |
| [OpenAI](https://developers.openai.com/api/docs/changelog) | 20.10. 12-Stunden-Prompt-Cache (Schreiben 2,5-fach); 22.10. Decisions API GA; 16.10. gehostete Sandboxes mit Skills für Dokumente | Kein Bedarf (Claude festgelegt) |
| [Vercel](https://vercel.com/changelog) | 23.10. CLI Spend Management, Vercel Connect mit Stripe-Keys je Agent; 22.10. Deploy ohne Konto per CLI; Jahr auf der Seite nicht angegeben | Spend Management: Kostenwächter, Abrechnung nur Sinan |
| [Supabase](https://supabase.com/changelog) (letzte 1.933 Zeichen ungelesen) | 23.10. Knowledge Base (Beta); 12.10. TLS-1.2-Chiffren werden abgeschaltet (Breaking); 6.10. Scoped Tokens GA | TLS-Änderung: ob Clients betroffen sind, nicht ermittelt |

## Top 5

1. **Hallmark + Impeccable** als Lint gegen KI-Optik, passend zu Anti-Slop (Skill-Test, kein Code).
2. **Cloudflare security-audit-skill** als Muster für den Review-Agenten.
3. **OpenShell** als Vorbild: Agent sieht nie echte Zugangsdaten.
4. **Claude API 2026-10-21 / OTel / Cache-Preis**: SDK-Breaking-Changes und Sonnet-4.5-Ende prüfen.
5. **Paperclip** weiter als Vorbild für Leitstand-Budgets (KW41).

## Nicht gefunden oder nicht erreichbar

- Figma Community Plugins und Make-Vorlagen: HTTP 403. Weave und Shader: keine Belege.
- Letzter Commit je Repo; Lizenzen von context-mode, hindsight, claude-mem, claude-plugins-official: nicht ermittelt.
- GitHub-Themen nextjs, react, design-systems, dashboards, devtools nicht einzeln abgerufen; Awesome-Listen und MCP-Verzeichnisse außer modelcontextprotocol/servers nicht abgerufen.
- Claude-Release-Notes: letzte 33.497 Zeichen ungelesen.
