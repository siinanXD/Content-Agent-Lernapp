# SIN-537: Worker lesen aktuelle Doku (Context7 + WebFetch)

- Links: Linear SIN-537, https://github.com/upstash/context7, `.github/workflows/claude.yml`, `.github/workflows/worker.yml`
- Entscheidung: Context7 als Remote-MCP-Server (`https://mcp.context7.com/mcp`, Typ http) per `--mcp-config` in `claude.yml` und im Worker-Schritt von `worker.yml` (dort läuft der Dispatcher-Lauf). `--allowedTools` um `mcp__context7__*` und `WebFetch` erweitert, kein WebSearch, keine weiteren Rechte. AGENTS.md nennt die Reihenfolge Context7 → WebFetch.
- Geprüft: nichts live. Lizenz, Sterne und letzter Commit von Context7 wurden im Lauf nicht abgerufen (WebFetch war nicht freigegeben).
- Angenommen, ungeprüft: Context7 ist MIT-lizenziert, hat mehr als 500 Sterne und einen Commit jünger als 6 Monate. Beim Review gegen https://github.com/upstash/context7 abgleichen; trifft eine Annahme nicht zu, Entscheidung neu fassen.
- Angenommen: Ohne API-Key gilt ein Rate-Limit; deshalb zunächst kein Secret `CONTEXT7_API_KEY` und keine `sinan`-Aufgabe. Wird das Limit zum Problem, Key nachziehen.
- Offen: Das Leitstand-Repo muss gleich eingerichtet werden, liegt aber außerhalb dieses Repos (Folgeaufgabe).
- Warum: Die Regel „Docs lesen, nie aus dem Gedächtnis“ war ohne Doku-Zugriff nicht erfüllbar (SIN-485).
