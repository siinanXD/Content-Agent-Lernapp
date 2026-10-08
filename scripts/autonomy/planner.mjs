#!/usr/bin/env node
/**
 * Planer (SIN-223, SIN-227), wöchentlich. Ersetzt den Frontend-Agent aus PRODUCT.md.
 *
 *   node scripts/autonomy/planner.mjs --context [--dry-run] [--out prompt.md]
 *       sammelt Definition fertig, offene Linear-Issues, Kennzahlen und die Produktreife-Tabelle, schreibt den Prompt
 *   node scripts/autonomy/planner.mjs --create plan.json [--dry-run]
 *       prüft den Plan (je Spur max. 3, 1 Design-Paket, Akzeptanzkriterien, Priorität), legt Linear-Issues als
 *       Todo an (Label je Spur, Design blockiert das Frontend-Issue). Ist die Produktreife grün, legt er
 *       das Issue „Produkt-Abnahme MAF Metall“ für Sinan an und plant bis zur Antwort nur Fehler und Content.
 *       Davor: Free-Tier-Prüfung (ab 80 % ein Linear-Issue, SIN-225) und Wochenbericht (limits.mjs).
 *
 * Phasen (SIN-244): Repo-Variable PHASE (`bauen` | `betrieb`), OBSERVE_DAYS (Standard 7), PHASE_SINCE (Beginn des Betriebs).
 *   In `betrieb` plant der Planer nur am Ende eines Beobachtungsfensters (höchstens 5 Issues, Label `wochenplan`);
 *   dazwischen nur Fehler/Sicherheit (backend, Label `bug`) und Content. Für Dry-Runs mit Fixtures überschreiben
 *   `--phase`, `--last-plan <ISO>`, `--since <ISO>`, `--observe-days <n>` und `--now <ISO>` die Umgebung.
 *
 * Content (SIN-226): Abdeckung je Curriculum-Map und Modul, Bestehensquote, Läufe, Regeln (content-metrics.mjs).
 * Kennzahlen ohne Zugang (Supabase, PostHog, Sentry, Kosten, Figma) stehen als „nicht verfügbar“ im Prompt.
 * Dry-Run: nur lesen, nichts in Linear anlegen.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { LANES, commentOnIssue, countIssues, fetchProjectIssues, fetchRecentlyDone, linear, linearTeamAndProject, stateIdByName } from "./linear.mjs";
import { linearQuota, renderLinearQuota } from "./diagnose.mjs";
import { readLimits, runLimitCheck } from "./limits.mjs";
import { collectPostHogMetrics } from "./posthog.mjs";
import { collectFabrikMetrics } from "./fabrik.mjs";
import { describeTableError, isSchemaCache, queueSinanTask } from "./table-error.mjs";
import { createSinanIssues, fetchSinanIssues } from "./sinan.mjs";
import { collectSentryMetrics } from "./sentry.mjs";
import { ServiceError, fetchJson, fetchJsonFull } from "./http.mjs";
import { collectContentMetrics, renderContentSection, ratedQuestions, fetchAll } from "./content-metrics.mjs";
import { DEFAULT_SIZE, SIZES } from "./sparen.mjs";
import { MAX_PLAN_ISSUES_BETRIEB, MIN_ACTIVE_USERS, PLAN_LABEL, lastPlanAt, phaseFromEnv, renderPhase } from "./phase.mjs";
import { DEFAULT_FILE_KEY, diffColorTokens } from "./figma.mjs";
import { dispatchRun, taskForCheck } from "./run-task.mjs";
import { RUN_LABEL, duplicateComment, isRunnable, rowFor, splitDuplicates, toRunOrder } from "./duplicates.mjs";
import {
  ABNAHME_TITLE,
  DEFAULT_GOLDSET_TARGET,
  abnahmeIssue,
  evaluateReadiness,
  expectedFrames,
  fetchFigmaFrames,
  figmaFileKey,
  inMaintenanceMode,
  renderReadiness,
} from "./readiness.mjs";

export const MAX_PER_LANE = 3;
export const MAX_DESIGN_PER_WEEK = 1;
/** Höchstens 3 je Spur (zusammen 9); dazu höchstens 1 Design-Paket. */
export const MAX_ISSUES_PER_WEEK = MAX_PER_LANE * LANES.length;
/** Pflichtabschnitte jedes Design-Pakets (SIN-306): Vorlagen-Recherche und Hinweis für Sinan. */
export const DESIGN_VORLAGEN_HEADING = "## Vorlagen geprüft";
export const DESIGN_VORLAGEN_BLOCK = [
  DESIGN_VORLAGEN_HEADING,
  "Quellen: Figma Community (User Flow, Journey Map, UI-Kits, Device Mockups, Präsentation) und GitHub. Je Treffer: Link, Lizenz/Nutzungsbedingungen und Begründung (übernommen oder verworfen); Ergebnis zusätzlich in `docs/decisions/<ISSUE-ID>-<kurz>.md`. Gibt es keinen Treffer, das ausdrücklich hier schreiben.",
  "",
  "## Hinweis für Sinan",
  "Agenten können Figma-Community-Dateien nicht selbst übernehmen. Wird ein Treffer gebraucht: Datei in der Community öffnen, auf „In Entwurf öffnen“ (Kopie anlegen) klicken und den Link der Kopie ins Issue schreiben.",
].join("\n");
export const PLAN_LANES =[...LANES, "design"];
/** Pflege-Modus: nur Fehler (Backend) und Content. */
export const MAINTENANCE_LANES = ["backend", "content"];
export const READINESS_FILE = "docs/product-readiness.json";

/** Abschnitt `## <Überschrift>` aus einem Markdown-Dokument (ohne die Überschrift). */
export function extractSection(markdown, heading) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = markdown.match(new RegExp(`^## ${esc}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  return m ? m[1].trim() : "";
}

/** Abschnitt „Definition fertig“ aus PRODUCT.md. */
export const extractDefinition = (markdown) => extractSection(markdown, "Definition fertig");

/** Kennzahl eines optionalen Dienstes, der nicht antwortet (SIN-263): kein Abbruch, der Prompt zeigt „nicht messbar“. */
export const notMeasurable = (e) => `nicht messbar (${e.message})`;

async function supabaseCount(path, headers, base, http) {
  const { res } = await fetchJsonFull("Supabase", `${base}/rest/v1/${path}`, { headers: { ...headers, Prefer: "count=exact", Range: "0-0" } }, http);
  return Number(res.headers.get("content-range")?.split("/")[1]);
}

/** Kennzahl kosten_pro_lauf aus Zeilen von pipeline_run_costs (neueste zuerst, SIN-258). */
export function summarizeRunCosts(rows, capEur = 20) {
  if (!rows.length) return "keine Läufe im Ledger";
  const eur = rows.map((r) => Number(r.cost_eur ?? 0));
  const avg = eur.reduce((a, b) => a + b, 0) / eur.length;
  const stopped = rows.filter((r) => r.stopped).length;
  return `Ø ${avg.toFixed(2)} € je Lauf, letzter ${eur[0].toFixed(2)} €, höchster ${Math.max(...eur).toFixed(2)} € (Deckel ${capEur} €, ${rows.length} Läufe, ${stopped} gestoppt)`;
}

/** @param {{ fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>, delays?: number[], log?: (l: string) => void }} [http] */
export async function collectMetrics(env = process.env, http = {}) {
  const m = {
    einheiten: "nicht verfügbar",
    fragen_bewertet: "nicht verfügbar",
    bestehensquote: "nicht verfügbar",
    bestehensquote_pct: "nicht verfügbar",
    kosten_pro_lauf: "nicht verfügbar",
    posthog: "nicht verfügbar",
    sentry: "nicht verfügbar",
    sentry_kritisch: "nicht verfügbar",
    content_fabrik: "nicht verfügbar",
    content_fabrik_status: "nicht verfügbar",
    content_fabrik_ueberfaellig_tage: "nicht verfügbar",
  };
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
    try {
      m.einheiten = await supabaseCount("units?select=id", h, env.SUPABASE_URL, http);
    } catch (e) {
      m.einheiten = notMeasurable(e);
    }
    // SIN-402: Nur Bewertungen für existierende Fragen zählen (wie in collectContentMetrics).
    try {
      const questions = await fetchAll(env.SUPABASE_URL, "questions", "select=course_id,unit_id,id&order=course_id,unit_id,id", h);
      const evaluations = await fetchAll(env.SUPABASE_URL, "question_quality_latest", "select=course_id,unit_id,question_id,passed&order=course_id,unit_id,question_id", h);
      const { bewertet } = ratedQuestions(questions, evaluations);
      const passedCount = bewertet.filter((e) => e.passed).length;
      m.fragen_bewertet = bewertet.length;
      m.bestehensquote = bewertet.length ? `${Math.round((passedCount / bewertet.length) * 100)} %` : "keine Bewertungen";
      if (bewertet.length) m.bestehensquote_pct = Math.round((passedCount / bewertet.length) * 100);
    } catch (e) {
      m.fragen_bewertet = notMeasurable(e);
      m.bestehensquote = notMeasurable(e);
    }
    // Kosten separat mit Retry-Logik
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${env.SUPABASE_URL}/rest/v1/pipeline_run_costs?select=cost_eur,stopped&order=created_at.desc&limit=20`;
      try {
        m.kosten_pro_lauf = summarizeRunCosts(await fetchJson("Supabase", url, { headers: h }, http));
      } catch (e) {
        if (isSchemaCache(e)) {
          const sleep = http.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
          await sleep(500);
          try {
            m.kosten_pro_lauf = summarizeRunCosts(await fetchJson("Supabase", url, { headers: h }, http));
          } catch (retryError) {
            m.kosten_pro_lauf = describeTableError("pipeline_run_costs", "20261006020000", retryError);
            queueSinanTask(http, "pipeline_run_costs", "20261006020000", retryError);
          }
        } else {
          m.kosten_pro_lauf = describeTableError("pipeline_run_costs", "20261006020000", e);
          queueSinanTask(http, "pipeline_run_costs", "20261006020000", e);
        }
      }
    }
  }
  Object.assign(m, await collectSentryMetrics(env, http.fetchImpl, http));
  Object.assign(m, await collectFabrikMetrics(env, http));
  Object.assign(m, await collectPostHogMetrics(env, http.fetchImpl, http));
  m.figma_abgleich = await figmaTokenMetric(env, http.fetchImpl);
  return m;
}

/** Abgleich Code ↔ Figma (SIN-239): Token-Farben aus docs/design/tokens.json gegen die Figma-Datei. */
export async function figmaTokenMetric(env = process.env, fetchImpl = fetch) {
  if (!env.FIGMA_ACCESS_TOKEN) return "nicht verfügbar";
  try {
    const tokens = JSON.parse(readFileSync("docs/design/tokens.json", "utf8"));
    const diff = await diffColorTokens(tokens, tokens.meta?.figmaFileKey ?? DEFAULT_FILE_KEY, env, fetchImpl);
    return diff.length ? `Abweichung, Token-Farben ohne Figma-Entsprechung: ${diff.join(", ")}` : "keine Abweichung";
  } catch (e) {
    return notMeasurable(e);
  }
}

/** Produktreife-Zeilen aus Kennzahlen, offenen Issues, Bestätigungsdatei und (mit Token) Figma. */
export async function assessReadiness({ metrics, issues, env = process.env, read = readFileSync }) {
  const file = existsSync(READINESS_FILE) ? JSON.parse(read(READINESS_FILE, "utf8")) : {};
  const figmaMd = existsSync("docs/design/FIGMA.md") ? read("docs/design/FIGMA.md", "utf8") : "";
  const rows = evaluateReadiness({
    metrics,
    issues,
    confirmations: file.bestaetigt ?? {},
    built: file.gebaut ?? {},
    ran: file.gelaufen ?? {},
    goldsetTarget: file.goldsetTarget ?? DEFAULT_GOLDSET_TARGET,
    figma: await fetchFigmaFrames(figmaFileKey(figmaMd), env),
    expected: expectedFrames(figmaMd),
  });
  return { rows, abnahme: file.abnahme ?? null, built: file.gebaut ?? {} };
}

export function buildPlannerPrompt(
  /** @type {{ definition: string, issues: unknown[], metrics: object, readiness?: string, content?: string, maintenance?: boolean, phase?: import("./phase.mjs").PhaseState | null }} */
  { definition, issues, recentDone = [], metrics, readiness = "", content = "", maintenance = false, phase = null, maxIssues = null, bugsOnly = false },
) {
  const betrieb = phase?.phase === "betrieb";
  return [
    "Du bist der Planer für die Content-Agent-Lernapp (Regeln: AGENTS.md).",
    "Ziel: ein fertiges Produkt mit einem Modul (MAF Metall komplett), kein MVP. Vergleiche den Ist-Stand mit der Definition fertig und der Produktreife-Tabelle.",
    betrieb && phase.due
      ? `Plane getrennt nach drei Spuren, zusammen höchstens ${MAX_PLAN_ISSUES_BETRIEB} neue Linear-Issues, sortiert nach Wirkung (je Spur höchstens ${MAX_PER_LANE}):`
      : `Plane getrennt nach drei Spuren, je Spur höchstens ${MAX_PER_LANE} neue Linear-Issues (zusammen höchstens ${MAX_ISSUES_PER_WEEK}):`,
    "- frontend: Lern-Erlebnis, Screens, Motivation (Serie, Tagesziel, Wiederholung), Barrierefreiheit, Offline. Kennzahlen: Lighthouse, axe, PostHog-Abbrüche, Figma-Abgleich.",
    "- content: Abdeckung, Qualität, neue Berufe (nur mit amtlicher Quelle).",
    "- backend: Pipeline, Datenmodell, Kosten, Stabilität, Sentry-Fehler, Skalierung.",
    "",
    "Content-Regeln (SIN-226):",
    "- Content-Lücken füllt die Content-Fabrik (AP-23) selbst. Lege dafür KEINE Issues an, außer die Fabrik hängt (2 Läufe ohne neues Modul).",
    "- Bestehensquote eines Moduls unter 70 %: Issue „Prompt/Didaktik für Modul X verbessern“.",
    "- Alle Maps über 90 % abgedeckt: Issue „Curriculum-Map für nächsten Beruf anlegen“ (amtliche Quelle nötig), höchstens 1 neuer Beruf pro Monat.",
    "- Lern-Schleife (AP-12): ab 50 aktiven Lernenden je Kurs die 5 schwächsten Einheiten als Issue.",
    "- Nutze die Vorschläge im Abschnitt „Content“; ohne Vorschlag kein Content-Issue.",
    "",
    "Keine Duplikate zu offenen Issues und zu den in den letzten 14 Tagen erledigten (Abschnitt unten). Ein Treffer wird nicht neu angelegt, sondern als Kommentar am alten Issue vermerkt. Pro Issue: ein Arbeitspaket, ein PR. Kein Inhalt ohne amtliche Quelle, keine Personendaten.",
    "",
    "Gebaut ist nicht gelaufen (SIN-292): Die Produktreife-Tabelle hat die Spalte Stufe (fehlt, gebaut nicht gelaufen, gelaufen unter Ziel, erfüllt).",
    "- fehlt: Bau-Issue ist richtig.",
    "- gebaut, nicht gelaufen: KEIN Bau-Issue. Plane einen Lauf-Auftrag (Workflow mit echten Secrets starten, Ergebnis mit Beleg in docs/product-readiness.json eintragen). Setze `check` auf die Kennung des Punkts. Gibt es dafür eine Aufgabe in `run-task.yml` (SIN-302: Offline, Kosten, Lighthouse), startet das Skript den Workflow selbst (höchstens 1 Lauf je Aufgabe und Tag) und legt kein Issue an.",
    "- gelaufen, Ergebnis unter Ziel: Verbesserung des Ergebnisses planen, nicht das Werkzeug neu bauen.",
    "- erfüllt: nichts planen.",
    "",
    "Größe (SIN-320): Setze je Eintrag `size` = `klein`, `mittel` oder `gross` nach docs/autonomy/groessen.md (klein: 1–2 Dateien, kein neues Verhalten; mittel: ein Arbeitspaket; gross: mehr als ein PR). Große Aufträge teilst du selbst in mittlere oder kleine Einträge (Blocker-Reihenfolge), ein Eintrag mit `size: gross` wird verworfen. Kleinkram desselben Bereichs (Doku, Index, Labels) bekommt dasselbe `area` (ein kurzes Wort), der Dispatcher bündelt ihn zu einem Lauf.",
    "",
    "Figma zuerst (SIN-239):",
    "- Ohne Design-Issue: Änderungen, die nur vorhandene Figma-Komponenten und Tokens nutzen (Zustände, Texte, Abstände, Varianten bestehender Screens, Fehler-/Leer-/Ladezustände nach Screen 17). Dann `needsDesign: false`.",
    "- Design nötig (`needsDesign: true`): neue Screens, neue Komponenten, neue Farben/Tokens, geänderte Navigation. Setze `blockedBy` auf den Titel eines Design-Eintrags im Plan (oder eine offene Kennung wie SIN-123).",
    `- Bündle alle Design-Arbeiten zu höchstens ${MAX_DESIGN_PER_WEEK} Design-Paket pro Woche (\`lane: "design"\`, Label \`design\`, Backlog bis Sinan die Sitzung macht, kein Dispatcher-Lauf).`,
    `- Vorlagen (SIN-306): Jedes Design-Paket enthält den Abschnitt „${DESIGN_VORLAGEN_HEADING.slice(3)}“ (Figma Community und GitHub nach User Flow, Journey Map, UI-Kits, Device Mockups, Präsentation durchsucht; je Treffer Link, Lizenz und Begründung) und den Hinweis für Sinan, dass Community-Dateien nur per Klick kopiert werden können. Das Skript hängt beide Abschnitte an, falls sie in der Beschreibung fehlen.`,
    "- Agenten erfinden keine Komponenten im Code. Weicht der Code von Figma ab (Kennzahl `figma_abgleich`), plane die Abweichung als Issue.",
    ...(betrieb ? betriebPrompt(phase) : []),
    ...(maxIssues != null
      ? ["", `**Nachfüllen (SIN-253):** Die Schlange ist fast leer. Plane höchstens ${maxIssues} neue startbare Issues (Design-Pakete zählen nicht), wichtigstes zuerst, drei Spuren abwechselnd, nach der Produktreife-Tabelle.`]
      : []),
    ...(bugsOnly ? ["", "**Nur Bugs:** Ein Free-Tier-Kontingent liegt über 80 %. Keine neuen Feature-Issues, nur Fehler (Spur backend)."] : []),
    ...(maintenance
      ? [
          "",
          "**Pflege-Modus:** Die Produktreife ist grün, die Abnahme durch Sinan steht aus. Plane NUR Fehler (backend) und Content. Keine frontend- oder design-Einträge.",
        ]
      : []),
    "",
    "## Definition fertig (docs/PRODUCT.md)",
    definition || "(Abschnitt fehlt)",
    "",
    "## Produktreife MAF Metall (docs/PRODUCT.md)",
    readiness || "(nicht geprüft)",
    "",
    "## In den letzten 14 Tagen erledigt (nicht neu planen)",
    ...(recentDone.length ? recentDone.map((i) => `- ${i.identifier} ${i.title}`) : ["(keine)"]),
    "",
    "## Content (Abdeckung je Beruf/Modul)",
    content || "(nicht geprüft)",
    "",
    "## Offene Linear-Issues",
    ...(issues.length ? issues.map((i) => `- ${i.identifier} [${i.state.name}, Prio ${i.priority}] ${i.title}`) : ["(keine)"]),
    "",
    "## Kennzahlen",
    ...Object.entries(metrics).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Ausgabe",
    'Schreibe nur die Datei plan.json im Repo-Wurzelverzeichnis: [{"lane": "frontend|content|backend|design", "title": "...", "description": "...", "acceptance": ["..."], "priority": 1-4, "size": "klein|mittel", "area": "optional, nur für klein", "needsDesign": false, "blockedBy": "Titel oder SIN-123", "check": "Kennung aus der Produktreife-Tabelle, falls der Eintrag einen Punkt betrifft"}].',
    "`needsDesign` und `blockedBy` nur bei Frontend-Issues, die ein Design-Paket brauchen (siehe oben). Priorität wie in Linear: 1 dringend, 2 hoch, 3 mittel, 4 niedrig. Danach nichts weiter tun.",
  ].join("\n");
}

/** Zusatz zum Prompt für die Phase Betrieb (SIN-244). */
function betriebPrompt(phase) {
  if (!phase.due) {
    return [
      "",
      `**Phase Betrieb, Beobachtungsfenster läuft (${renderPhase(phase)}):** Keine neuen Feature-Issues. Plane NUR Fehler (Sentry, backend), Sicherheit und Content. Keine frontend- oder design-Einträge. Sammle die Befunde, sie fließen in den Wochenplan.`,
    ];
  }
  return [
    "",
    `**Phase Betrieb, Planungstag (Fenster ${phase.observeDays} Tage zu Ende):** Werte das Fenster aus: Nutzungsdaten (PostHog, learning_progress), Abbrüche, Fehlerquoten (Sentry), Kosten, Feedback (Figma-/GitHub-Kommentare, Support). Beginne den Bericht mit den Befunden, dann höchstens ${MAX_PLAN_ISSUES_BETRIEB} Issues, sortiert nach Wirkung (wichtigstes zuerst).`,
    `Unter etwa ${MIN_ACTIVE_USERS} aktiven Nutzern: nur eindeutige Signale umsetzen (PRODUCT.md, Lern-Schleife). Fehlt die Zahl aktiver Nutzer („nicht verfügbar“), gilt das als unter ${MIN_ACTIVE_USERS}.`,
  ];
}

/**
 * Prüft den Plan des Modells. Wirft bei ungültigen Einträgen, kürzt je Spur auf MAX_PER_LANE
 * (Design: MAX_DESIGN_PER_WEEK). Im Pflege-Modus bleiben nur MAINTENANCE_LANES.
 * @returns {{ lane: string, title: string, priority: number, description: string, labels: string[], needsDesign?: boolean, blockedBy?: string }[]}
 */
export function validatePlan(plan, existingTitles = [], /** @type {{ maintenance?: boolean, phase?: import("./phase.mjs").PhaseState | null, maxIssues?: number | null, bugsOnly?: boolean, readiness?: any[], built?: Record<string, any> }} */ { maintenance = false, phase = null, maxIssues = null, bugsOnly = false, readiness = [], built = {} } = {}) {
  const betrieb = phase?.phase === "betrieb";
  // Betrieb: im Beobachtungsfenster nur Fehler und Content, am Fensterende der Wochenplan.
  const observing = betrieb && !phase.due;
  const planning = betrieb && phase.due;
  if (!Array.isArray(plan)) throw new Error("Plan muss eine Liste sein");
  const taken = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  const planTitles = new Set(plan.map((p) => String(p?.title ?? "").trim().toLowerCase()));
  const count = {};
  const out = [];
  for (const [i, entry] of plan.entries()) {
    // Gebaut, nie gelaufen: Lauf-Auftrag statt Bau-Issue (SIN-292).
    const row = rowFor(entry, readiness);
    const p = isRunnable(row) ? toRunOrder(entry, row, built) : entry;
    if (!p?.title || typeof p.title !== "string") throw new Error(`Eintrag ${i}: title fehlt`);
    if (!PLAN_LANES.includes(p.lane)) throw new Error(`Eintrag ${i}: lane muss ${PLAN_LANES.join(", ")} sein`);
    if (!Array.isArray(p.acceptance) || p.acceptance.length === 0) throw new Error(`Eintrag ${i}: Akzeptanzkriterien fehlen`);
    if (![1, 2, 3, 4].includes(p.priority)) throw new Error(`Eintrag ${i}: priority muss 1 bis 4 sein`);
    const size = SIZES.includes(p.size) ? p.size : DEFAULT_SIZE;
    if (size === "gross" && p.lane !== "design") {
      console.log(`Eintrag verworfen (zu gross, vor dem Start teilen, SIN-320): ${p.title}`);
      continue;
    }
    const area = size === "klein" && typeof p.area === "string" && /^[a-z0-9-]{2,30}$/i.test(p.area.trim()) ? p.area.trim().toLowerCase() : "";
    const blockedBy = typeof p.blockedBy === "string" ? p.blockedBy.trim() : "";
    if (p.needsDesign) {
      if (p.lane !== "frontend") throw new Error(`Eintrag ${i}: needsDesign nur für frontend`);
      const known = /^SIN-\d+$/.test(blockedBy) || planTitles.has(blockedBy.toLowerCase());
      if (!known) throw new Error(`Eintrag ${i}: needsDesign braucht blockedBy (Design-Eintrag im Plan oder SIN-Kennung)`);
    }
    if (taken.has(p.title.trim().toLowerCase())) continue;
    if ((maintenance || observing) && !MAINTENANCE_LANES.includes(p.lane)) continue;
    if (bugsOnly && p.lane !== "backend") continue; // Free-Tier über 80 %: nur Bugs (SIN-225, SIN-253)
    const cap = p.lane === "design" ? MAX_DESIGN_PER_WEEK : MAX_PER_LANE;
    if ((count[p.lane] = (count[p.lane] ?? 0) + 1) > cap) continue;
    out.push({
      lane: p.lane,
      title: p.title.trim(),
      priority: p.priority,
      labels: [
        ...(p.lane === "design" ? ["design", "frontend"] : [p.lane, "claude"]),
        ...((observing || bugsOnly) && p.lane === "backend" ? ["bug"] : []),
        ...(planning ? [PLAN_LABEL] : []),
        ...(p.runOrder ? [RUN_LABEL] : []),
        ...(p.lane === "design" ? [] : [`groesse:${size}`, ...(area ? [`bereich:${area}`] : [])]),
      ],
      ...(p.lane === "frontend" ? { needsDesign: Boolean(p.needsDesign) } : {}),
      ...(p.needsDesign ? { blockedBy } : {}),
      description: `${p.description ?? ""}${
        p.lane === "design" && !String(p.description ?? "").includes(DESIGN_VORLAGEN_HEADING) ? `\n\n${DESIGN_VORLAGEN_BLOCK}` : ""
      }${
        p.lane === "design" ? "\n\nWird in einer Claude-Sitzung mit Figma-Connector erledigt (nicht vom Dispatcher). Danach Frame zur Freigabe in docs/design/." : ""
      }\n\n## Akzeptanzkriterien\n${p.acceptance.map((a) => `- [ ] ${a}`).join("\n")}`.trim(),
    });
  }
  // Wochenplan: höchstens 5 insgesamt, wichtigste zuerst (Priorität, bei Gleichstand Planreihenfolge).
  // Fällt ein Design-Eintrag weg, fällt das Frontend-Issue, das darauf wartet, mit weg.
  let result = out;
  if (planning) {
    const kept = [...out].sort((a, b) => a.priority - b.priority).slice(0, MAX_PLAN_ISSUES_BETRIEB);
    const titles = new Set(kept.map((r) => r.title.toLowerCase()));
    result = kept.filter((r) => !r.blockedBy || !planTitles.has(r.blockedBy.toLowerCase()) || titles.has(r.blockedBy.toLowerCase()));
  }
  // Nachfüllen (SIN-253): nur so viele, dass wieder 5–8 startbar sind; Design-Einträge zählen nicht (nicht startbar).
  if (maxIssues != null) {
    const kept = [...result].sort((a, b) => a.priority - b.priority).slice(0, Math.max(0, maxIssues));
    const titles = new Set(kept.map((r) => r.title.toLowerCase()));
    result = kept.filter((r) => !r.blockedBy || !planTitles.has(r.blockedBy.toLowerCase()) || titles.has(r.blockedBy.toLowerCase()));
  }
  // Design zuerst, damit es beim Anlegen schon existiert, wenn das Frontend-Issue darauf wartet.
  return result.sort((a, b) => Number(b.lane === "design") - Number(a.lane === "design"));
}

/**
 * „Gebaut, nicht gelaufen“ mit passender Aufgabe (SIN-302): Der Planer startet den Lauf-Workflow statt ein Issue anzulegen.
 * Läuft die Aufgabe heute schon (Tagesdeckel) oder fehlt das Token, entsteht trotzdem kein Issue.
 * @returns {Promise<{ rest: any[], started: { task: string, started: boolean, grund?: string }[] }>}
 */
export async function startRuns(plan, rows, { dry = false, dispatch = dispatchRun } = {}) {
  const rest = [];
  const started = [];
  for (const entry of plan) {
    const task = isRunnable(rowFor(entry, rows)) ? taskForCheck(entry.check) : undefined;
    if (!task) {
      rest.push(entry);
      continue;
    }
    started.push({ task, ...(dry ? { started: false, grund: "Trockenlauf" } : await dispatch(task)) });
  }
  return { rest, started };
}

async function labelId(teamId, name, cache, call) {
  if (cache.has(name)) return cache.get(name);
  const found = await call(`query($t: ID!, $n: String!) { issueLabels(filter: { team: { id: { eq: $t } }, name: { eqIgnoreCase: $n } }) { nodes { id } } }`, { t: teamId, n: name });
  let id = found.issueLabels.nodes[0]?.id;
  if (!id) {
    const made = await call(`mutation($i: IssueLabelCreateInput!) { issueLabelCreate(input: $i) { issueLabel { id } } }`, { i: { teamId, name } });
    id = made.issueLabelCreate.issueLabel.id;
  }
  cache.set(name, id);
  return id;
}

/** Legt die Issues an; `blockedBy` (Titel aus dem Plan oder SIN-Kennung) wird als „blockiert durch“ verknüpft. */
export async function createIssues(items, existing = [], call = linear) {
  const { teamId, projectId } = await linearTeamAndProject(call);
  const stateId = await stateIdByName(teamId, "Todo", call);
  const labels = new Map();
  const created = new Map(); // Titel (klein) → Issue-ID
  for (const it of items) {
    const labelIds = await Promise.all((it.labels ?? []).map((n) => labelId(teamId, n, labels, call)));
    const data = await call(
      `mutation($i: IssueCreateInput!) { issueCreate(input: $i) { issue { id identifier url } } }`,
      { i: { teamId, projectId, stateId, title: it.title, description: it.description, priority: it.priority, labelIds } },
    );
    const issue = data.issueCreate.issue;
    created.set(it.title.toLowerCase(), issue.id);
    console.log(`Angelegt: ${issue.identifier} ${issue.url}`);
    if (it.blockedBy) {
      const blockerId = created.get(it.blockedBy.toLowerCase()) ?? existing.find((e) => e.identifier === it.blockedBy)?.id;
      if (!blockerId) throw new Error(`${issue.identifier}: Blocker „${it.blockedBy}“ nicht gefunden`);
      await call(
        `mutation($i: IssueRelationCreateInput!) { issueRelationCreate(input: $i) { success } }`,
        { i: { issueId: blockerId, relatedIssueId: issue.id, type: "blocks" } },
      );
    }
  }
}

/** Grenzen des Nachfüll-Anstoßes (SIN-253) aus PLAN_MAX_ISSUES und PLAN_BUGS_ONLY; ohne Wert: Wochenplan-Regeln. */
export function refillLimits(env = process.env) {
  const n = Number.parseInt(env.PLAN_MAX_ISSUES ?? "", 10);
  return { maxIssues: Number.isFinite(n) && n >= 0 ? n : null, bugsOnly: env.PLAN_BUGS_ONLY === "true" };
}

/** Phase aus Umgebung und Linear; die Dry-Run-Schalter überschreiben beides (Fixtures). */
async function resolvePhase(argv, issues) {
  const arg = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const now = arg("--now") ? new Date(arg("--now")) : new Date();
  const lastPlan = arg("--last-plan") ?? (issues ? await lastPlanAt(linear) : null);
  const env = { ...process.env, ...(arg("--phase") && { PHASE: arg("--phase") }), ...(arg("--since") && { PHASE_SINCE: arg("--since") }), ...(arg("--observe-days") && { OBSERVE_DAYS: arg("--observe-days") }) };
  return phaseFromEnv(env, { lastPlan, now });
}

/** Linear ist die einzige Pflichtquelle (SIN-263): ohne sie bricht der Planer sauber ab, die Folgeschritte laufen nicht (Ausgabe `linear_ok=false`). */
export function abortLinearDown(e, env = process.env, log = console.log) {
  log(`::warning::Planer abgebrochen: ${e.message}. Nichts angelegt; die 2-h-Sperre wird nicht gesetzt, der Wächter stößt beim nächsten Takt erneut an.`);
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, "linear_ok=false\n");
}

export async function main(argv) {
  const dry = argv.includes("--dry-run");
  const arg = (name) => argv[argv.indexOf(name) + 1];
  let issues = null;
  try {
    issues = process.env.LINEAR_API_KEY ? await fetchProjectIssues(linear) : null;
  } catch (e) {
    if (!(e instanceof ServiceError)) throw e;
    abortLinearDown(e);
    return;
  }

  // Linear-Kontingent (SIN-291): ab 95 % der Issue-Grenze legt der Planer nichts an und meldet es; der Wächter legt das Hinweis-Issue an.
  const linearLimit = readLimits().limits?.linear_issues?.limit; // null = unbegrenzt (SIN-360)
  const quota = issues ? linearQuota(await countIssues(linear).catch(() => null), linearLimit) : linearQuota(null, linearLimit);
  if (quota.level === "stop" && (argv.includes("--context") || argv.includes("--create"))) {
    console.log(`::warning::${renderLinearQuota(quota)}. Der Planer legt keine neuen Issues an, bis aufgeräumt ist.`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "linear_ok=false\n");
    return;
  }

  if (argv.includes("--context")) {
    const sinanTasks = [];
    const metrics = await collectMetrics(process.env, { sinanTasks });
    if (sinanTasks.length && issues) {
      // Ursache nur durch Sinan behebbar (SIN-359): Aufgabe mit Label sinan anlegen, Doppelte überspringt createSinanIssues.
      await createSinanIssues(sinanTasks, await fetchSinanIssues(), linear).catch((e) => console.log(`::warning::Sinan-Aufgabe nicht angelegt: ${e.message}`));
    }
    const { rows, abnahme } = await assessReadiness({ metrics, issues });
    const sourceIssues = (issues ?? []).filter((i) => /quellen-monitor/i.test(i.title));
    const content = renderContentSection(await collectContentMetrics(), {
      sourceIssues,
      fabrik: { detail: metrics.content_fabrik, ueberfaelligTage: Number(metrics.content_fabrik_ueberfaellig_tage) || null },
    });
    const definition = extractSection(readFileSync("docs/PRODUCT.md", "utf8"), "Definition fertig");
    const phase = await resolvePhase(argv, issues);
    const recentDone = issues ? await fetchRecentlyDone(linear).catch(() => []) : [];
    const prompt = buildPlannerPrompt({
      phase,
      recentDone,
      ...refillLimits(process.env),
      definition,
      issues: issues ?? [],
      metrics,
      readiness: renderReadiness(rows),
      content,
      maintenance: inMaintenanceMode(rows, abnahme),
    });
    if (argv.includes("--out")) writeFileSync(arg("--out"), prompt);
    else console.log(prompt);
    return;
  }

  if (argv.includes("--create")) {
    const plan = JSON.parse(readFileSync(arg("--create"), "utf8"));
    const existingTitles = (issues ?? []).map((i) => i.title);
    console.log(`${await runLimitCheck({ dry, existingTitles })}\n`);
    const { rows, abnahme, built } = await assessReadiness({ metrics: await collectMetrics(), issues });
    const maintenance = inMaintenanceMode(rows, abnahme);
    const phase = await resolvePhase(argv, issues);
    console.log(`${renderPhase(phase)}\n`);
    // Duplikat-Schutz (SIN-292): offene und in 14 Tagen erledigte Issues; Treffer werden Kommentare statt Issues.
    const recentDone = issues ? await fetchRecentlyDone(linear).catch(() => []) : [];
    const { fresh, duplicates } = splitDuplicates(plan, [...(issues ?? []), ...recentDone], { built, readiness: rows });
    for (const d of duplicates) {
      console.log(`${dry ? "[dry-run] " : ""}Duplikat: „${d.entry.title}“ → Kommentar an ${d.issue.identifier} (${d.grund})`);
      if (!dry) await commentOnIssue(d.issue.id, duplicateComment(d.entry, d.grund));
    }
    const { rest, started } = await startRuns(fresh, rows, { dry });
    for (const r of started) console.log(`${r.started ? "Lauf gestartet" : "Lauf nicht gestartet"}: ${r.task}${r.grund ? ` (${r.grund})` : ""}`);
    const items = validatePlan(rest, [...existingTitles, ...recentDone.map((i) => i.title)], { maintenance, phase, readiness: rows, built, ...refillLimits(process.env) });
    if (maintenance && !existingTitles.includes(ABNAHME_TITLE)) items.push({ ...abnahmeIssue(rows), lane: "abnahme" });
    console.log(`Produktreife\n\n${renderReadiness(rows)}\n\n${maintenance ? "Pflege-Modus: nur Fehler und Content.\n" : ""}`);
    if (dry) {
      for (const it of items) console.log(`[dry-run] ${it.lane} P${it.priority} ${it.title}${it.lane === "frontend" ? (it.needsDesign ? " [Design nötig]" : " [ohne Design]") : ""}${it.blockedBy ? ` (blockiert durch: ${it.blockedBy})` : ""}`);
      return;
    }
    await createIssues(items, issues ?? []);
    return;
  }
  throw new Error("Aufruf: --context oder --create plan.json");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
