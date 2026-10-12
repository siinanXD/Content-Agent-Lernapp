#!/usr/bin/env node
/**
 * Einsortieren (SIN-528, einmalig): alle offenen Issues eines Linear-Projekts in „v1 Grundgerüst“ oder „v2 Ideen“.
 *
 *   node scripts/autonomy/einsortieren.mjs --projekt Content-Agent-Lernapp [--fertig datei.md] [--apply] [--tabelle out.md]
 *
 * Ohne `--apply` ist es ein Trockenlauf: es wird nur die Tabelle ausgegeben, Linear bleibt unberührt.
 * v1: das Issue schließt eine Lücke der Fertig-Liste (Lern-App: Prüfungen aus readiness.mjs; Leitstand: `--fertig docs/FERTIG.md`
 * aus dem Leitstand-Repo, Kennungen und Schlagwörter der Liste) oder ist ein Fehler/Sicherheits-/Abnahme-/Mensch-Issue
 * oder `dringend`. Alles andere: „v2 Ideen“ plus Label `idee`.
 * Was schon einen Meilenstein v1/v2 hat, wird nicht umsortiert.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { CHECKS } from "./readiness.mjs";
import { LABEL_IDEE, MILESTONE_V1, MILESTONE_V2, addLabel, isIdea, linear, milestoneIdByName } from "./linear.mjs";

/** Immer Grundgerüst: Fehler, Sicherheit, Abnahme, Aufgaben für Menschen, dringend. */
export const V1_LABELS = ["bug", "security", "abnahme", "sinan", "needs-human", "dringend"];

/** Schlagwörter je Prüfung aus `CHECKS` (readiness.mjs): trifft eines Titel oder Beschreibung, schließt das Issue die Lücke. */
export const CHECK_KEYWORDS = {
  "content-module": [/\bmodul/i, /curriculum/i, /content-fabrik/i, /veröffentlich/i],
  "content-quote": [/bestehensquote/i, /goldset/i, /richter/i],
  "content-safety": [/sicherheits-stichprobe/i, /stichprobe/i],
  "lernen-e2e": [/\be2e\b/i, /lernpfad/i, /wiederholung/i, /prüfungsmodus/i, /\beinheit\b/i],
  "design-screens": [/\bscreen/i, /figma/i],
  "design-issues": [/design-paket/i],
  "design-figma": [/figma-abgleich/i, /figma-abdeckung/i, /layout-prüfer/i, /sichtprüfung/i],
  "qual-lighthouse": [/lighthouse/i, /leistungsbudget/i],
  "qual-axe": [/\baxe\b/i],
  "qual-wcag": [/wcag/i, /barrierefrei/i],
  "qual-offline": [/offline/i, /\bpwa\b/i, /service-worker/i],
  "betrieb-sentry": [/sentry/i],
  "betrieb-kosten": [/kosten/i, /api-kosten/i, /deckel/i],
  "betrieb-fabrik": [/content-fabrik/i, /fabrik/i],
  "recht-ki": [/ki-kennzeichnung/i],
  "recht-impressum": [/impressum/i],
  "recht-datenschutz": [/datenschutz/i],
  "recht-einwilligung": [/einwilligung/i],
  "recht-demo": [/demo-zugang/i, /bildungsträger/i],
};

const labelNames = (issue) => (issue.labels?.nodes ?? []).map((l) => l.name.toLowerCase());
const textOf = (issue) => `${issue.title ?? ""}\n${issue.description ?? ""}`;

/** Punkte der Fertig-Liste (Markdown, nummerierte Zeilen): Kennungen und Schlagwörter (Wörter ab 7 Buchstaben). */
export function parseFertigListe(md) {
  return [...String(md).matchAll(/^\s*\d+\.\s+(.+)$/gm)].map((m) => ({
    text: m[1],
    ids: [...m[1].matchAll(/SIN-\d+/g)].map((x) => x[0]),
    words: [...new Set((m[1].replace(/\(?https?:\/\/\S+/g, "").match(/[A-Za-zÄÖÜäöüß-]{7,}/g) ?? []).map((w) => w.toLowerCase()))],
  }));
}

/**
 * Entscheidung für ein Issue: `{ ziel: "v1" | "v2", grund }`. Reine Funktion.
 * @param {any} issue
 * @param {{ fertig?: ReturnType<typeof parseFertigListe> }} [opt] Fertig-Liste des Projekts; ohne sie gelten die Prüfungen aus readiness.mjs
 */
export function einsortieren(issue, { fertig } = {}) {
  const labels = labelNames(issue);
  const hit = labels.find((l) => V1_LABELS.includes(l));
  if (hit) return { ziel: "v1", grund: `Label ${hit}` };
  if (issue.priority === 1) return { ziel: "v1", grund: "Priorität dringend" };
  const text = textOf(issue);
  if (fertig) {
    const own = fertig.find((p) => p.ids.includes(issue.identifier));
    if (own) return { ziel: "v1", grund: `Fertig-Liste: ${own.text.slice(0, 40)}` };
    // Titel muss mindestens zwei Schlagwörter eines Punktes enthalten (ein Wort trifft zu leicht).
    const title = (issue.title ?? "").toLowerCase();
    const near = fertig.find((p) => p.words.filter((w) => title.includes(w)).length >= 2);
    if (near) return { ziel: "v1", grund: `Fertig-Liste: ${near.text.slice(0, 40)}` };
    return { ziel: "v2", grund: "keine Lücke der Fertig-Liste" };
  }
  const check = CHECKS.find((c) => (CHECK_KEYWORDS[c.id] ?? []).some((re) => re.test(issue.title ?? "")) );
  if (check) return { ziel: "v1", grund: `Prüfung ${check.id}` };
  const inBody = CHECKS.find((c) => (CHECK_KEYWORDS[c.id] ?? []).some((re) => re.test(text)) && labels.some((l) => ["content", "frontend"].includes(l)) && issue.priority > 0 && issue.priority <= 2);
  if (inBody) return { ziel: "v1", grund: `Prüfung ${inBody.id} (Beschreibung, Priorität hoch)` };
  return { ziel: "v2", grund: "keine Lücke der Fertig-Liste" };
}

/** Tabelle für den PR (Markdown). */
export function renderTabelle(rows) {
  const lines = ["| Issue | Titel | Ziel | Grund |", "| --- | --- | --- | --- |"];
  for (const r of rows) lines.push(`| ${r.issue.identifier} | ${String(r.issue.title).replace(/\|/g, "/").slice(0, 80)} | ${r.ziel === "v1" ? MILESTONE_V1 : `${MILESTONE_V2} (+ idee)`} | ${r.grund} |`);
  const v1 = rows.filter((r) => r.ziel === "v1").length;
  lines.push("", `v1: ${v1}, v2: ${rows.length - v1}, übersprungen (schon einsortiert): ${rows.skipped ?? 0}`);
  return lines.join("\n");
}

async function fetchOpen(project, call = linear) {
  const data = await call(
    `query($project: String!) {
       issues(first: 250, filter: { project: { name: { eq: $project } }, state: { type: { in: ["backlog", "unstarted", "started"] } } }) {
         nodes { id identifier title description priority team { id } labels { nodes { name } } projectMilestone { name } project { id } }
       }
     }`,
    { project },
  );
  return data.issues.nodes;
}

export async function main(argv, call = linear) {
  const arg = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : "");
  const project = arg("--projekt");
  if (!project) throw new Error("--projekt fehlt");
  const apply = argv.includes("--apply");
  const fertig = arg("--fertig") ? parseFertigListe(readFileSync(arg("--fertig"), "utf8")) : undefined;
  const open = await fetchOpen(project, call);
  // Schon einsortiert (Meilenstein v1/v2 gesetzt) bleibt, damit ein zweiter Lauf nichts umwirft.
  const todo = open.filter((i) => !/^v[12]\b/i.test(i.projectMilestone?.name ?? ""));
  const rows = todo.map((issue) => ({ issue, ...einsortieren(issue, { fertig }) }));
  rows.skipped = open.length - todo.length;
  const table = renderTabelle(rows);
  console.log(`${apply ? "" : "[Trockenlauf] "}Projekt ${project}\n${table}`);
  if (arg("--tabelle")) writeFileSync(arg("--tabelle"), `${table}\n`);
  if (!apply) return rows;
  const ids = {};
  for (const r of rows) {
    const name = r.ziel === "v1" ? MILESTONE_V1 : MILESTONE_V2;
    ids[name] ??= await milestoneIdByName(r.issue.project?.id, name, call);
    if (!ids[name]) throw new Error(`Meilenstein „${name}“ im Projekt ${project} nicht gefunden`);
    await call(`mutation($id: String!, $m: String!) { issueUpdate(id: $id, input: { projectMilestoneId: $m }) { success } }`, { id: r.issue.id, m: ids[name] });
    if (r.ziel === "v2" && !isIdea(r.issue)) await addLabel(r.issue, LABEL_IDEE, call);
    console.log(`${r.issue.identifier} → ${name}`);
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
