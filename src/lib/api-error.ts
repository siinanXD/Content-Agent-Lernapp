/**
 * SIN-445: API-Fehlertexte (OpenAI, Anthropic) einzeilig machen. Beide liefern JSON mit `error.type`,
 * `error.code`, `error.param` und `error.message`, OpenAI eingerückt über mehrere Zeilen. In GitHub-Anmerkungen
 * zählt nur eine Zeile, darum Code und Meldung zusammenziehen. Schlüssel werden maskiert, nie ausgegeben.
 */
export function compactApiError(body: string, max = 400): string {
  const raw = String(body ?? "").trim();
  let out = raw.replace(/\s+/g, " ");
  try {
    const parsed = JSON.parse(raw) as { error?: { type?: string; code?: string | null; param?: string | null; message?: string } };
    const e = parsed?.error;
    if (e && typeof e === "object" && (e.message || e.type || e.code)) {
      const kind = [e.type, e.code].filter(Boolean).join("/");
      const param = e.param ? ` (param ${e.param})` : "";
      out = `${kind || "error"}${param}: ${String(e.message ?? "").replace(/\s+/g, " ")}`.trim();
    }
  } catch {
    /* kein JSON: zusammengezogener Text bleibt */
  }
  return out
    .replace(/(sk-[a-z]*-?)[A-Za-z0-9_*-]{8,}/g, "$1…")
    .replace(/(Bearer\s+)\S+/gi, "$1…")
    .slice(0, max);
}
