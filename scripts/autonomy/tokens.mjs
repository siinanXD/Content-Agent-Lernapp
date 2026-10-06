/**
 * Token-Ablauf (SIN-294): liest die Tabelle in docs/autonomy/tokens.md (Name, Ort, Ablauf, Rechte; keine Werte).
 * Reine Funktionen ohne Netz.
 */
export const TOKEN_WARN_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `TT.MM.JJJJ` (oder `JJJJ-MM-TT`) als Date (Ende des Tages, UTC), sonst null. */
export function parseExpiry(text) {
  const s = String(text ?? "").trim();
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [y, m, d] = de ? [de[3], de[2], de[1]] : iso ? [iso[1], iso[2], iso[3]] : [];
  if (!y) return null;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 23, 59, 59));
  return date.getUTCMonth() === Number(m) - 1 ? date : null;
}

/** Zeilen der Markdown-Tabelle → [{ name, ort, ablauf, rechte }]. Kopf, Trenner und kaputte Zeilen entfallen. */
export function parseTokens(md) {
  const rows = [];
  for (const line of String(md ?? "").split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.length < 4 || /^-+$/.test(cells[0]) || cells[0].toLowerCase() === "name") continue;
    rows.push({ name: cells[0], ort: cells[1], ablauf: cells[2], rechte: cells.slice(3).join(" | ") });
  }
  return rows;
}

/** Tage bis zum Ablauf (aufgerundet; 0 = läuft heute ab, negativ = abgelaufen), oder null bei unbekanntem Datum. */
export function daysLeft(token, now = new Date()) {
  const exp = parseExpiry(token.ablauf);
  if (!exp) return null;
  const diff = exp.getTime() - now.getTime();
  return diff >= 0 ? Math.floor(diff / DAY_MS) : -Math.ceil(-diff / DAY_MS);
}

/** „läuft in 87 Tagen ab“ usw. */
export function describeExpiry(token, now = new Date()) {
  const n = daysLeft(token, now);
  if (n == null) return "Ablauf unbekannt";
  if (n < 0) return `seit ${-n} ${-n === 1 ? "Tag" : "Tagen"} abgelaufen`;
  if (n === 0) return "läuft heute ab";
  return `läuft in ${n} ${n === 1 ? "Tag" : "Tagen"} ab`;
}

/** Tokens, die abgelaufen sind oder in höchstens `warnDays` Tagen ablaufen, früheste zuerst. */
export function expiringSoon(tokens = [], now = new Date(), warnDays = TOKEN_WARN_DAYS) {
  return tokens
    .map((t) => ({ t, n: daysLeft(t, now) }))
    .filter((x) => x.n != null && x.n <= warnDays)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.t);
}

/** Abschnitt für die Status-Seite. */
export function renderTokens(tokens, now = new Date()) {
  if (!tokens?.length) return "Token-Liste nicht lesbar (docs/autonomy/tokens.md).";
  const soon = new Set(expiringSoon(tokens, now));
  return tokens.map((t) => `- ${soon.has(t) ? "⚠️ " : ""}${t.name}: ${describeExpiry(t, now)} (${t.ablauf})`).join("\n");
}
