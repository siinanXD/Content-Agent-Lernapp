/** Reine Funktionen für den Belege-Prüfer der Lern-App (SIN-846). Kein Netz. */

const BELEG_WORT = /zählung|zaehlung|run-link|trockenlauf|beleg/i;
const PROBE = /\[probe:(zaehlung|run):([a-z_][a-z0-9_]*|[\w.-]+\.ya?ml)(?::(\d+))?\]/i;
const ZEILE = /^(\s*[-*]\s+\[)([ xX])(\]\s+)(.+?)\s*$/;
const normalisiere = (s: string) => s.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export type Haken = { text: string; erledigt: boolean };
export type Probe = { art: "zaehlung"; tabelle: string; min: number } | { art: "run"; workflow: string };

export function leseHaken(beschreibung: string | null | undefined): Haken[] {
  return String(beschreibung ?? "").split("\n").flatMap((zeile) => {
    const m = ZEILE.exec(zeile);
    return m ? [{ text: m[4]!, erledigt: m[2]!.toLowerCase() !== " " }] : [];
  });
}

export const istBelegHaken = (text: string) => BELEG_WORT.test(text);

export function nurBelege(beschreibung: string | null | undefined): boolean {
  const offen = leseHaken(beschreibung).filter((h) => !h.erledigt);
  return offen.length > 0 && offen.every((h) => istBelegHaken(h.text));
}

export function leseProbe(text: string): Probe | null {
  const m = PROBE.exec(text);
  if (!m) return null;
  if (m[1]!.toLowerCase() === "zaehlung") {
    return /^[a-z_][a-z0-9_]*$/.test(m[2]!) ? { art: "zaehlung", tabelle: m[2]!, min: Number(m[3] ?? 1) } : null;
  }
  return /\.ya?ml$/i.test(m[2]!) ? { art: "run", workflow: m[2]! } : null;
}

export function bewerte(probe: Probe, messwert: number | string): { belegt: boolean; beleg: string } {
  if (probe.art === "zaehlung") {
    const n = Number(messwert);
    return { belegt: Number.isFinite(n) && n >= probe.min, beleg: `Zählung ${probe.tabelle}: ${messwert} (Minimum ${probe.min})` };
  }
  return { belegt: messwert === "success", beleg: `Run ${probe.workflow}: ${messwert}` };
}

export type OffenerPr = { title?: string | null; body?: string | null; head?: string | null };

/**
 * Nennt ein offener PR die Issue-ID (Titel, Text oder Branch)? Dann bleibt das Issue beim PR:
 * der Prüfer darf es nicht auf Done setzen, bevor der PR gemergt ist (Leitstand-Regel, SIN-846).
 * `SIN-7` trifft nicht `SIN-70`; Branches sind klein geschrieben (`claude/sin-7-…`).
 */
export function hatOffenenPr(identifier: string, prs: OffenerPr[]): boolean {
  const id = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${id}($|[^0-9])`, "i");
  return prs.some((pr) => [pr.title, pr.body, pr.head].some((feld) => re.test(feld ?? "")));
}

/** Pflicht-Variablen vor dem ersten Lauf; fehlt eine, darf „0 Kandidaten“ nicht grün wirken. */
export function fehlendeVariablen(env: Record<string, string | undefined>, pflicht = ["LINEAR_API_KEY", "GH_TOKEN", "SUPABASE_PRUEFER_URL"]): string[] {
  return pflicht.filter((name) => !env[name]?.trim());
}

export function setzeHaken(beschreibung: string, belegte: string[]): string {
  const ziel = new Set(belegte.map(normalisiere));
  return beschreibung.split("\n").map((zeile) => {
    const m = ZEILE.exec(zeile);
    return m && ziel.has(normalisiere(m[4]!)) ? `${m[1]}x${m[3]}${m[4]}` : zeile;
  }).join("\n");
}
