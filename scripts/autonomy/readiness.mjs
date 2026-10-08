/**
 * Produktreife-Prüfung „fertig mit einem Modul“ (SIN-227, Checkliste in docs/PRODUCT.md).
 * Reine Funktionen; nur `fetchFigmaFrames` spricht mit dem Netz.
 *
 * Jede Prüfung ist `ok`, `offen` oder `nicht verfügbar`. Was der Planer nicht messen kann, gilt nur als
 * `ok`, wenn es in docs/product-readiness.json mit Datum und Beleg bestätigt ist (Feld `bestaetigt`).
 * Ohne Messung und ohne Bestätigung bleibt es `nicht verfügbar` und blockiert die Abnahme.
 */

export const ABNAHME_TITLE = "Produkt-Abnahme MAF Metall";
export const DEFAULT_GOLDSET_TARGET = 0.9;

/** @typedef {"ok" | "offen" | "nicht verfügbar"} Status */

/** Stufen je Punkt (SIN-292): „gebaut“ ist nicht „gelaufen“. Nur `erfüllt` zählt für die Abnahme. */
export const STUFE = {
  FEHLT: "fehlt",
  GEBAUT: "gebaut, nicht gelaufen",
  UNTER_ZIEL: "gelaufen, Ergebnis unter Ziel",
  ERFUELLT: "erfüllt",
};

/** Prüfungen je Bereich. `auto` misst, sonst zählt die Bestätigung. */
export const CHECKS = [
  { id: "content-module", area: "Content", label: "Alle Module von MAF Metall veröffentlicht" },
  { id: "content-quote", area: "Content", label: "Bestehensquote ≥ Goldset-Zielwert", auto: "quote" },
  { id: "content-safety", area: "Content", label: "Sicherheits-Stichproben erledigt" },
  { id: "lernen-e2e", area: "Lernen", label: "Start → Lernpfad → Einheit → Ergebnis → Wiederholung (1/3/7 Tage) → Prüfungsmodus, E2E grün" },
  { id: "design-screens", area: "Design", label: "Alle Screens aus Figma umgesetzt" },
  { id: "design-issues", area: "Design", label: "Keine offenen design-Issues", auto: "designIssues" },
  { id: "design-figma", area: "Design", label: "Figma-Abgleich ohne Abweichung", auto: "figma" },
  { id: "qual-lighthouse", area: "Qualität", label: "Lighthouse ≥ 90 in allen Kategorien" },
  { id: "qual-axe", area: "Qualität", label: "axe ohne Fehler" },
  { id: "qual-wcag", area: "Qualität", label: "WCAG 2.2 AA" },
  { id: "qual-offline", area: "Qualität", label: "Offline nutzbar" },
  { id: "betrieb-sentry", area: "Betrieb", label: "Sentry ohne offene kritische Fehler seit 7 Tagen", auto: "sentry" },
  { id: "betrieb-kosten", area: "Betrieb", label: "Kosten pro Kurslauf gemessen und unter Deckel" },
  { id: "betrieb-fabrik", area: "Betrieb", label: "Content-Fabrik läuft", auto: "fabrik" },
  { id: "recht-ki", area: "Recht/Vertrieb", label: "KI-Kennzeichnung" },
  { id: "recht-impressum", area: "Recht/Vertrieb", label: "Impressum" },
  { id: "recht-datenschutz", area: "Recht/Vertrieb", label: "Datenschutzerklärung" },
  { id: "recht-einwilligung", area: "Recht/Vertrieb", label: "Einwilligung für Nutzungsdaten" },
  { id: "recht-demo", area: "Recht/Vertrieb", label: "Demo-Zugang für Bildungsträger" },
];

const NA = "nicht verfügbar";
const hasDesignLabel = (i) => (i.labels?.nodes ?? []).some((l) => l.name.toLowerCase() === "design");

/** Frame-Namen aus der Tabelle „Screens“ in docs/design/FIGMA.md (`01 Start` …). */
export function expectedFrames(figmaMd) {
  return [...String(figmaMd).matchAll(/^\|\s*\d+\s*\|\s*`([^`]+)`/gm)].map((m) => m[1]);
}

export function figmaFileKey(figmaMd) {
  return String(figmaMd).match(/File key\s*\|\s*`([^`]+)`/)?.[1] ?? null;
}

/** Vergleich Soll (FIGMA.md) und Ist (Figma-Datei) nach Frame-Namen. */
export function diffFrames(expected, actual) {
  const have = new Set(actual);
  return { missing: expected.filter((n) => !have.has(n)) };
}

/**
 * Frames der Datei per Figma-REST-API (nur lesen). Ohne Token: `null` → „nicht verfügbar“.
 * @returns {Promise<{ frames: string[] } | { error: string } | null>}
 */
export async function fetchFigmaFrames(fileKey, env = process.env, fetchImpl = fetch) {
  if (!env.FIGMA_ACCESS_TOKEN || !fileKey) return null;
  try {
    const res = await fetchImpl(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
      headers: { "X-Figma-Token": env.FIGMA_ACCESS_TOKEN },
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const doc = (await res.json()).document;
    const frames = (doc?.children ?? []).flatMap((page) => (page.children ?? []).filter((n) => n.type === "FRAME").map((n) => n.name));
    return { frames };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * `built`: je Punkt das fertige Werkzeug `{ datum, beleg, issues?, lauf? }`; `ran`: echter Lauf mit Ergebnis unter Ziel
 * `{ datum, beleg, ergebnis }` (erfüllte Punkte stehen unter `confirmations`).
 * @param {{ metrics: Record<string, any>, issues: any[] | null, confirmations?: Record<string, { datum?: string, beleg?: string }>,
 *   built?: Record<string, { datum?: string, beleg?: string }>, ran?: Record<string, { datum?: string, beleg?: string, ergebnis?: string }>,
 *   goldsetTarget?: number, figma?: { frames: string[] } | { error: string } | null, expected?: string[] }} ctx
 * `issues: null` = Linear nicht erreichbar.
 * @returns {{ id: string, area: string, label: string, status: Status, detail: string, stufe: string }[]}
 */
export function evaluateReadiness({ metrics, issues, confirmations = {}, built = {}, ran = {}, goldsetTarget = DEFAULT_GOLDSET_TARGET, figma = null, expected = [] }) {
  const auto = {
    quote() {
      const pct = Number(metrics.bestehensquote_pct);
      if (!Number.isFinite(pct)) return [NA, String(metrics.bestehensquote ?? "keine Messung")];
      const target = Math.round(goldsetTarget * 100);
      return [pct >= target ? "ok" : "offen", `${pct} % (Ziel ≥ ${target} %)`];
    },
    designIssues() {
      if (!issues) return [NA, "Linear nicht erreichbar"];
      const open = issues.filter(hasDesignLabel);
      return [open.length ? "offen" : "ok", open.length ? open.map((i) => i.identifier).join(", ") : "keine"];
    },
    figma() {
      if (!figma) return [NA, "FIGMA_ACCESS_TOKEN fehlt"];
      if ("error" in figma) return [NA, `Figma-Fehler: ${figma.error}`];
      const { missing } = diffFrames(expected, figma.frames);
      return missing.length ? ["offen", `fehlt in Figma: ${missing.join(", ")}`] : ["ok", `${expected.length} Frames gefunden (Namensabgleich)`];
    },
    sentry() {
      const n = Number(metrics.sentry_kritisch);
      if (!Number.isFinite(n)) return [NA, String(metrics.sentry ?? "kein Sentry-Zugang")];
      return [n === 0 ? "ok" : "offen", `${n} offene kritische Fehler (7 Tage)`];
    },
    fabrik() {
      const s = metrics.content_fabrik_status;
      if (s !== "läuft" && s !== "hängt" && s !== "steht") return [NA, String(metrics.content_fabrik ?? "kein Supabase-Zugang")];
      return [s === "läuft" ? "ok" : "offen", `${s}: ${metrics.content_fabrik}`];
    },
  };
  const done = (c) => Boolean(c?.datum && c?.beleg);
  const stufeOf = (id, status) => {
    if (status === "ok") return STUFE.ERFUELLT;
    if (status === "offen" || done(ran[id])) return STUFE.UNTER_ZIEL;
    return done(built[id]) ? STUFE.GEBAUT : STUFE.FEHLT;
  };
  return CHECKS.map(({ id, area, label, auto: kind }) => {
    let row;
    if (kind) {
      const [status, detail] = auto[kind]();
      row = { id, area, label, status, detail };
    } else if (done(confirmations[id])) {
      row = { id, area, label, status: "ok", detail: `bestätigt ${confirmations[id].datum}: ${confirmations[id].beleg}` };
    } else if (done(ran[id])) {
      row = { id, area, label, status: "offen", detail: `gelaufen ${ran[id].datum}: ${ran[id].ergebnis ?? "unter Ziel"} (${ran[id].beleg})` };
    } else {
      row = { id, area, label, status: NA, detail: "nicht gemessen, keine Bestätigung in docs/product-readiness.json" };
    }
    return { ...row, stufe: stufeOf(id, row.status) };
  });
}

/** Kennung im Issue-Text, damit der Duplikat-Schutz den Produktreife-Punkt wiederfindet (SIN-292). */
export const checkMarker = (id) => `Produktreife-Punkt: ${id}`;

export const isAllGreen = (rows) => rows.length > 0 && rows.every((r) => r.status === "ok");

/** Markdown-Tabelle für den Planer-Bericht. */
export function renderReadiness(rows) {
  const cell = (s) => String(s).replaceAll("|", "\\|");
  const green = rows.filter((r) => r.status === "ok").length;
  return [
    `Erfüllt: ${green} von ${rows.length}`,
    "",
    "| Bereich | Prüfung | Status | Stufe | Beleg |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((r) => `| ${r.area} | ${cell(r.label)} | ${r.status} | ${r.stufe ?? ""} | ${cell(r.detail)} |`),
  ].join("\n");
}

/**
 * Pflege-Modus: alles grün und Sinan hat auf die Abnahme noch nicht geantwortet
 * (`abnahme.antwort` in docs/product-readiness.json). Dann plant der Planer nur Fehler und Content.
 */
export function inMaintenanceMode(rows, abnahme) {
  return isAllGreen(rows) && !abnahme?.antwort;
}

/** Das einzelne Abnahme-Issue für Sinan. Kein Label `claude`: der Dispatcher überspringt `abnahme`. */
export function abnahmeIssue(rows) {
  return {
    title: ABNAHME_TITLE,
    priority: 2,
    labels: ["abnahme"],
    description: [
      "Die Produktreife-Prüfung (docs/PRODUCT.md, „Produktreife“) ist vollständig grün. Bitte Abnahme durch Sinan.",
      "",
      "Risiko: `risk:high` (Grundsatz-Entscheidung). Dieses Issue ist für einen Menschen; der Dispatcher gibt es nicht an Claude.",
      "",
      renderReadiness(rows),
      "",
      "## Akzeptanzkriterien",
      "- [ ] Sinan hat das Produkt geprüft und die Abnahme beantwortet (Kommentar)",
      '- [ ] Antwort in `docs/product-readiness.json` unter `abnahme.antwort` eingetragen ("freigegeben" oder "abgelehnt"); danach endet der Pflege-Modus des Planers',
    ].join("\n"),
  };
}
