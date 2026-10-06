/**
 * Sparsam bauen (SIN-320). Reine Funktionen ohne Netz:
 *   - Größe je Issue (Label `groesse:klein|mittel|gross`), daraus Modell und Runden-Deckel,
 *   - Kleinkram desselben Bereichs zu einem Lauf bündeln,
 *   - Verbrauch (Tokens, Runden, Dauer, API-Gegenwert) aus der Execution-Datei von claude-code-action lesen,
 *     als Abschnitt für den PR-Steckbrief und als Linear-Kommentar rendern,
 *   - Wochensumme und „teuerste 3 Issues“ aus den Merkern in gemergten PRs.
 * Kriterien der Größen: docs/autonomy/groessen.md.
 */

export const SIZES = ["klein", "mittel", "gross"];
export const DEFAULT_SIZE = "mittel";
/** Modelle aus der Anthropic-Modellübersicht (Stand 06.10.2026), nie aus dem Gedächtnis ändern. */
export const MODEL_HAIKU = "claude-haiku-4-5-20251001";
export const MODEL_SONNET = "claude-sonnet-5-5";
/** Runden-Deckel (`--max-turns`) je Größe. */
export const MAX_TURNS = { klein: 30, mittel: 80, gross: 150 };
/** Höchstens so viele Kleinkram-Issues in einem Lauf. */
export const MAX_BUNDLE = 4;

const labelsOf = (issue) => (issue.labels?.nodes ?? []).map((l) => l.name.toLowerCase());

/** Größe aus dem Label `groesse:<x>`; ohne Label `mittel`. Bei mehreren Labels zählt das größte. */
export function sizeOf(issue) {
  const found = labelsOf(issue)
    .map((l) => l.match(/^gr(?:oe|ö)sse:(klein|mittel|gro(?:ss|ß))$/)?.[1]?.replace("ß", "ss"))
    .filter(Boolean);
  return SIZES.slice().reverse().find((s) => found.includes(s)) ?? DEFAULT_SIZE;
}

/** Größe eines (gebündelten) Laufs: die größte der Issues. */
export const runSize = (issues) => SIZES.slice().reverse().find((s) => issues.some((i) => sizeOf(i) === s)) ?? DEFAULT_SIZE;

/** Modell je Größe (Versuch 1 = erster Lauf). Haiku nur für klein; ein zweiter Versuch läuft immer mit Sonnet. */
export const modelFor = (size, attempt = 1) => (size === "klein" && attempt === 1 ? MODEL_HAIKU : MODEL_SONNET);

/** Runden-Deckel; der zweite Versuch nach Haiku bekommt den Deckel „mittel“. */
export const maxTurnsFor = (size, attempt = 1) => (size === "klein" && attempt > 1 ? MAX_TURNS.mittel : MAX_TURNS[size] ?? MAX_TURNS[DEFAULT_SIZE]);

/** Bereich für das Bündeln: Label `bereich:<x>`, sonst die Spur (frontend, content, backend). */
export function areaOf(issue, laneOf) {
  const l = labelsOf(issue).find((x) => x.startsWith("bereich:"));
  return l ? l.slice("bereich:".length) : laneOf(issue);
}

/**
 * Ein gewähltes Issue → ein Lauf. Ist es `klein`, kommen weitere `klein`-Issues desselben Bereichs aus `candidates`
 * (startbare Todo-Issues in Dispatcher-Reihenfolge, ohne schon gewählte) dazu, höchstens MAX_BUNDLE insgesamt.
 * @returns {{ lead: any, rest: any[] }[]} je Lauf das führende Issue und die gebündelten
 */
export function bundle(picked, candidates, laneOf) {
  const used = new Set(picked.map((i) => i.identifier));
  return picked.map((lead) => {
    if (sizeOf(lead) !== "klein") return { lead, rest: [] };
    const area = areaOf(lead, laneOf);
    const rest = [];
    for (const c of candidates) {
      if (rest.length >= MAX_BUNDLE - 1) break;
      if (used.has(c.identifier) || sizeOf(c) !== "klein" || areaOf(c, laneOf) !== area) continue;
      used.add(c.identifier);
      rest.push(c);
    }
    return { lead, rest };
  });
}

/** „SIN-1+SIN-2+SIN-3“: Eintrag für den Workflow (führendes Issue zuerst). */
export const bundleEntry = ({ lead, rest }) => [lead.identifier, ...rest.map((i) => i.identifier)].join("+");
export const parseEntry = (entry) => String(entry ?? "").split("+").map((s) => s.trim()).filter(Boolean);

/** Zusatz für den Prompt eines gebündelten Laufs. */
export function bundlePrompt(lead, rest) {
  if (!rest.length) return "";
  return [
    "",
    `Gebündelter Lauf (SIN-320): Du erledigst ${rest.length + 1} kleine Issues in einem PR. Zusätzlich zum Issue oben:`,
    ...rest.flatMap((i) => ["", `Linear-Issue ${i.identifier}: ${i.title}`, i.url ?? "", i.description ?? "(ohne Beschreibung)"]),
    "",
    `Ein Branch (claude/${lead.identifier.toLowerCase()}), ein PR. Der PR-Titel endet mit allen Kennungen: (${[lead, ...rest].map((i) => i.identifier).join(", ")}). Der Body beginnt mit je einer Zeile „Part of SIN-xxx“. Eine Entscheidungsdatei nur, wenn eine Entscheidung nötig war.`,
  ].join("\n");
}

// ---------- Verbrauch ----------

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

/**
 * Verbrauch aus der Execution-Datei (JSON-Array der Sitzung; der letzte `result`-Eintrag trägt
 * total_cost_usd, duration_ms, num_turns, usage). Fehlt etwas, bleibt es 0/null; nie ein Fehler.
 * @returns {{ input: number, output: number, cacheRead: number, cacheWrite: number, turns: number | null, durationMs: number | null, costUsd: number | null } | null}
 */
export function usageFromExecution(raw) {
  let entries;
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    entries = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  }
  const r = entries.filter((e) => e?.type === "result").pop();
  if (!r) return null;
  const u = r.usage ?? {};
  return {
    input: num(u.input_tokens),
    output: num(u.output_tokens),
    cacheRead: num(u.cache_read_input_tokens),
    cacheWrite: num(u.cache_creation_input_tokens),
    turns: r.num_turns ?? null,
    durationMs: r.duration_ms ?? null,
    costUsd: r.total_cost_usd ?? null,
  };
}

const fmtInt = (n) => new Intl.NumberFormat("de-DE").format(Math.round(n));
const fmtDur = (ms) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} Min ${s % 60} s` : `${s} s`;
};
const fmtUsd = (x) => `${x.toFixed(2)} $`;

/** Eine Zeile Klartext: „Worker (claude-haiku…): 12 Runden, 3 Min 2 s, Eingabe 1.200 · Ausgabe 800 · Cache 5.000 gelesen / 900 geschrieben, API-Gegenwert 0,45 $“. */
export function usageLine(u, label = "Lauf", model = "") {
  if (!u) return `${label}: Verbrauch nicht lesbar`;
  const parts = [
    u.turns != null ? `${u.turns} Runden` : null,
    u.durationMs != null ? fmtDur(u.durationMs) : null,
    `Eingabe ${fmtInt(u.input)} · Ausgabe ${fmtInt(u.output)} · Cache ${fmtInt(u.cacheRead)} gelesen / ${fmtInt(u.cacheWrite)} geschrieben`,
    u.costUsd != null ? `API-Gegenwert ${fmtUsd(u.costUsd).replace(".", ",")}` : null,
  ].filter(Boolean);
  return `${label}${model ? ` (${model})` : ""}: ${parts.join(", ")}`;
}

export const USAGE_HEAD = "## Verbrauch";
const MARK_RE = /<!-- usage: (\{.*?\}) -->/g;

/** Maschinenlesbarer Merker (für Wochensumme); `run` macht ihn je Lauf eindeutig. */
export function usageMark(u, { label, model, run, issues = [] }) {
  const slim = u ? { in: u.input, out: u.output, cr: u.cacheRead, cw: u.cacheWrite, turns: u.turns, ms: u.durationMs, usd: u.costUsd } : {};
  return `<!-- usage: ${JSON.stringify({ label, model, run: run ?? null, issues, ...slim })} -->`;
}

/** Hängt eine Verbrauchszeile (mit Merker) an den PR-Text; derselbe Lauf (`run`) wird nie doppelt eingetragen. */
export function appendUsage(body, u, meta) {
  const text = String(body ?? "");
  if (meta.run && text.includes(`"run":"${meta.run}"`)) return text;
  const entry = `- ${usageLine(u, meta.label, meta.model)} ${usageMark(u, meta)}`;
  if (text.includes(USAGE_HEAD)) return `${text.trimEnd()}\n${entry}\n`;
  return `${text.trimEnd()}\n\n${USAGE_HEAD}\n${entry}\n`;
}

/** Alle Merker eines PR-Textes. */
export function parseUsageMarks(body) {
  const out = [];
  for (const m of String(body ?? "").matchAll(MARK_RE)) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      /* kaputter Merker zählt nicht */
    }
  }
  return out;
}

/** Summe über Merker. */
export function sumUsage(marks) {
  return marks.reduce(
    (s, m) => ({
      tokens: s.tokens + num(m.in) + num(m.out) + num(m.cr) + num(m.cw),
      outputTokens: s.outputTokens + num(m.out),
      turns: s.turns + num(m.turns),
      usd: s.usd + num(m.usd),
    }),
    { tokens: 0, outputTokens: 0, turns: 0, usd: 0 },
  );
}

/** Linear-Kommentar nach einem Lauf. */
export function usageComment(identifier, lines) {
  return [`Verbrauch für ${identifier} (SIN-320):`, ...lines.map((l) => `- ${l}`)].join("\n");
}

/**
 * Wochensumme für das Tages-Update.
 * @param {{ title: string, body?: string | null }[]} prs gemergte PRs der Woche
 * @returns {null | { prs: number, withUsage: number, total: ReturnType<typeof sumUsage>, perPr: { tokens: number, usd: number }, top: { id: string, usd: number, tokens: number }[] }}
 */
export function weekUsage(prs) {
  const rows = prs
    .map((p) => ({ id: String(p.title).match(/SIN-\d+/g)?.at(-1) ?? p.title, marks: parseUsageMarks(p.body) }))
    .filter((r) => r.marks.length);
  if (!rows.length) return null;
  const sums = rows.map((r) => ({ id: r.id, ...sumUsage(r.marks) }));
  const total = sumUsage(rows.flatMap((r) => r.marks));
  return {
    prs: prs.length,
    withUsage: rows.length,
    total,
    perPr: { tokens: total.tokens / rows.length, usd: total.usd / rows.length },
    top: sums.sort((a, b) => b.usd - a.usd || b.tokens - a.tokens).slice(0, 3).map((s) => ({ id: s.id, usd: s.usd, tokens: s.tokens })),
  };
}

/** Zeilen für das Tages-Update (leer, wenn nichts gemessen wurde). */
export function renderWeekUsage(w) {
  if (!w) return ["- Verbrauch (7 Tage): noch keine Messwerte"];
  const usd = (x) => x.toFixed(2).replace(".", ",");
  return [
    `- Verbrauch (7 Tage): ${fmtInt(w.total.tokens)} Tokens, ${fmtInt(w.total.turns)} Runden, API-Gegenwert ${usd(w.total.usd)} $ (${w.withUsage} von ${w.prs} PRs gemessen)`,
    `- Pro gemergtem PR: ${fmtInt(w.perPr.tokens)} Tokens, ${usd(w.perPr.usd)} $`,
    `- Teuerste 3: ${w.top.map((t) => `${t.id} ${usd(t.usd)} $`).join(", ")}`,
  ];
}
