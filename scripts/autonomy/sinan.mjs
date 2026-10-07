#!/usr/bin/env node
/**
 * Aufgaben für Sinan als eigene Linear-Issues (SIN-310).
 *
 *   node scripts/autonomy/sinan.mjs sync [--dry-run]     fehlende Standard-Aufgaben anlegen, erledigte schließen
 *   node scripts/autonomy/sinan.mjs list                 offene Aufgaben anzeigen
 *   node scripts/autonomy/sinan.mjs create --titel T --wo W --link URL --minuten 10 --schritt "1" --schritt "2" --pruefung P [--faellig JJJJ-MM-TT]
 *
 * Label `sinan` (nie `claude`): der Dispatcher nimmt solche Issues nie (`HUMAN_LABELS`). Die Beschreibung hat einen festen
 * Block (`wo`, `link`, `minuten`, `schritte`, `pruefung`). Ein Maschinen-Merker `<!-- sinan: {"check":…} -->` sagt, woran
 * der Loop selbst erkennt, dass es erledigt ist; ohne Merker schließt Sinan das Issue selbst.
 * Bauen, Parsen und Prüfen sind reine Funktionen; nur `fetchSinanIssues`, `createSinanIssues`, `syncSinan` und `main` sprechen mit Linear.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PROJECT_NAME, comment, linear, linearTeamAndProject, setState, stateIdByName } from "./linear.mjs";
import { parseExpiry, parseTokens } from "./tokens.mjs";

export const SINAN_LABEL = "sinan";
const MARK_RE = /<!-- sinan: (\{.*?\}) -->/s;

/** @typedef {{ titel: string, wo: string, link: string, minuten: number, schritte: string[], pruefung: string, faellig?: string, check?: object }} SinanTask */

const trim = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Beschreibung im festen Block. */
export function buildSinanBody(/** @type {SinanTask} */ t) {
  const lines = [
    `**wo:** ${t.wo}`,
    `**link:** ${t.link}`,
    `**minuten:** ${t.minuten}`,
    "**schritte:**",
    ...t.schritte.map((s, i) => `${i + 1}. ${s}`),
    `**pruefung:** ${t.pruefung}`,
  ];
  if (t.check) lines.push("", `<!-- sinan: ${JSON.stringify({ check: t.check })} -->`);
  return lines.join("\n");
}

/** Liest `link`, `minuten` und den Prüf-Merker aus einer Beschreibung; fehlt etwas, bleibt es leer. */
export function parseSinanBody(body) {
  const text = String(body ?? "");
  const field = (name) => text.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, "mi"))?.[1]?.trim() ?? null;
  const minuten = Number.parseInt(field("minuten") ?? "", 10);
  let check = null;
  try {
    check = text.match(MARK_RE) ? (JSON.parse(text.match(MARK_RE)[1]).check ?? null) : null;
  } catch {
    check = null;
  }
  return { link: field("link"), minuten: Number.isFinite(minuten) ? minuten : null, check };
}

/** Offene Punkte (`- [ ]`) und abgehakte (`- [x]`) der Rechts-Checkliste. */
export function legalState(md) {
  const items = [...String(md ?? "").matchAll(/^- \[([ xX])\] (.+)$/gm)].map((m) => ({ done: m[1] !== " ", text: m[2].trim() }));
  return items;
}

/**
 * Ist die Aufgabe erledigt? Reine Funktion über schon gelesene Dateien.
 * check: `{ type: "legal", items: [Textanfang, …] }` (alle abgehakt), `{ type: "tokens", names: [...], after }`
 * (jeder Ablauf in tokens.md liegt nach dem Datum `after`), `{ type: "file-lacks", file, text }` (Text steht nicht mehr in der Datei).
 * @returns {{ done: boolean, grund?: string }}
 */
export function evaluateCheck(check, ctx) {
  if (!check?.type) return { done: false };
  if (check.type === "legal") {
    const items = legalState(ctx.files?.["docs/legal/checkliste-demo-zugang.md"]);
    const open = check.items.filter((prefix) => {
      const hit = items.find((i) => i.text.startsWith(prefix));
      return !hit || !hit.done;
    });
    return open.length ? { done: false } : { done: true, grund: "alle Punkte in docs/legal/checkliste-demo-zugang.md sind abgehakt" };
  }
  if (check.type === "tokens") {
    // Erneuert heißt: der Ablauf liegt nach `after` (dem alten Ablauf plus Puffer), nicht „läuft noch lange“.
    const tokens = parseTokens(ctx.files?.["docs/autonomy/tokens.md"]);
    const limit = parseExpiry(check.after);
    const stale = check.names.filter((name) => {
      const t = tokens.find((x) => x.name === name);
      const exp = t ? parseExpiry(t.ablauf) : null;
      return !exp || !limit || exp <= limit;
    });
    return stale.length ? { done: false } : { done: true, grund: `Ablauf in docs/autonomy/tokens.md erneuert (nach ${check.after})` };
  }
  if (check.type === "file-lacks") {
    const text = ctx.files?.[check.file];
    return text != null && !text.includes(check.text) ? { done: true, grund: `Hinweis „${trim(check.text, 40)}“ steht nicht mehr in ${check.file}` } : { done: false };
  }
  return { done: false };
}

/** Dateien, die die Prüfungen brauchen. Nicht lesbar → fehlt (die Prüfung sagt dann „nicht erledigt“). */
export const CHECK_FILES = ["docs/legal/checkliste-demo-zugang.md", "docs/autonomy/tokens.md", "docs/ops/BACKUP.md"];

export function readCheckFiles(read = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8")) {
  const files = {};
  for (const f of CHECK_FILES) {
    try {
      files[f] = read(f);
    } catch {
      /* fehlt */
    }
  }
  return files;
}

/** Standard-Aufgaben aus offenen Anweisungen in PR-Texten und Docs (SIN-310). */
export const SEED = /** @type {SinanTask[]} */ ([
  {
    titel: "Erreichbarkeits-Job bei cron-job.org einrichten",
    wo: "cron-job.org (Konto von Sinan)",
    link: "https://console.cron-job.org/jobs",
    minuten: 10,
    schritte: [
      "Neuer Cronjob: URL `https://content-agent-ashen-nu.vercel.app/api/health`, Methode GET.",
      "Takt alle 5 Minuten, Zeitlimit 30 s, Erfolg = HTTP 2xx.",
      "Benachrichtigung „bei Fehlschlag“ und „bei Wiederherstellung“ per E-Mail einschalten, Schwelle 1 Fehler.",
      "Speichern und einmal „Test run“ drücken: Antwort muss 200 sein.",
    ],
    pruefung: "Der Loop sieht den Job nicht. Du schließt das Issue nach dem Testlauf selbst.",
  },
  {
    titel: "Wiederherstellung der Sicherung einmal testen",
    wo: "Terminal mit Supabase-Schlüsseln (Supabase-Branch, nicht Production)",
    link: "https://github.com/siinanXD/Content-Agent-Lernapp/blob/main/docs/ops/BACKUP.md",
    minuten: 30,
    schritte: [
      "Einen Supabase-Branch als Ziel anlegen (nicht Production) und dessen Schlüssel in die Umgebung setzen.",
      "`node --import tsx scripts/backup.ts restore --latest --dry-run`, danach `node --import tsx scripts/backup.ts restore --latest`.",
      "`node scripts/verify-supabase-schema.mjs` mit den Ziel-Schlüsseln ausführen.",
      "In `docs/ops/BACKUP.md` unter „Teststand“ Datum, Ziel, Zeilenzahlen und Ergebnis in die Tabelle eintragen und den Hinweis „Offen: einmaliger Restore …“ entfernen.",
    ],
    pruefung: "Der Loop schließt das Issue, sobald „Offen: einmaliger Restore“ nicht mehr in docs/ops/BACKUP.md steht.",
    check: { type: "file-lacks", file: "docs/ops/BACKUP.md", text: "**Offen: einmaliger Restore" },
  },
  {
    titel: "Sicherheits-Stichprobe prüfen (13 Einheiten)",
    wo: "Repo, Datei docs/ops/AP15-SAFETY-SAMPLE.md",
    link: "https://github.com/siinanXD/Content-Agent-Lernapp/blob/main/docs/ops/AP15-SAFETY-SAMPLE.md",
    minuten: 45,
    schritte: [
      "Die Liste öffnen: 13 von 133 Einheiten mit Sicherheitsbezug (10 %).",
      "Jede Einheit in der App oder in der JSON-Datei `docs/ops/ap15-runs/2026-10-03T12-39-35-140Z-safety-sample.json` gegen die Quelle lesen.",
      "Falsche oder gefährliche Aussagen als Kommentar an dieses Issue schreiben (Einheit-ID und Satz).",
    ],
    pruefung: "Der Loop sieht das Ergebnis nicht. Du schließt das Issue selbst; bei Funden legt der Loop Korrektur-Issues an.",
  },
  {
    titel: "AV-Verträge abschließen (7 Anbieter)",
    wo: "Dashboards der Anbieter",
    link: "https://github.com/siinanXD/Content-Agent-Lernapp/blob/main/docs/legal/checkliste-demo-zugang.md",
    minuten: 60,
    schritte: [
      "Je Anbieter den Auftragsverarbeitungsvertrag (DPA) im Konto annehmen oder anfordern: Vercel, Supabase, Sentry, PostHog, Langfuse, Anthropic, OpenAI.",
      "Das Ergebnis jeweils in `docs/legal/checkliste-demo-zugang.md` abhaken (`- [x]`) und im selben Commit speichern.",
    ],
    pruefung: "Der Loop schließt das Issue, sobald alle 7 „AV-Vertrag …“-Punkte in der Checkliste abgehakt sind.",
    check: { type: "legal", items: ["AV-Vertrag Vercel", "AV-Vertrag Supabase", "AV-Vertrag Sentry", "AV-Vertrag PostHog", "AV-Vertrag Langfuse", "AV-Vertrag bzw. Datenschutz-Zusatz Anthropic", "AV-Vertrag bzw. Datenschutz-Zusatz OpenAI"] },
  },
  {
    titel: "Impressum-Daten eintragen",
    wo: "Repo, Datei content/legal/impressum.md",
    link: "https://github.com/siinanXD/Content-Agent-Lernapp/blob/main/content/legal/impressum.md",
    minuten: 15,
    schritte: [
      "Alle Platzhalter `[ ]` in `content/legal/impressum.md` mit deinen Angaben ersetzen (Name, Anschrift, Kontakt).",
      "In `docs/legal/checkliste-demo-zugang.md` den Punkt „Impressum ausgefüllt“ abhaken.",
    ],
    pruefung: "Der Loop schließt das Issue, sobald „Impressum ausgefüllt“ in der Checkliste abgehakt ist.",
    check: { type: "legal", items: ["Impressum ausgefüllt"] },
  },
  {
    titel: "Datenschutztext final machen",
    wo: "Repo, Datei content/legal/datenschutz.md",
    link: "https://github.com/siinanXD/Content-Agent-Lernapp/blob/main/content/legal/datenschutz.md",
    minuten: 60,
    schritte: [
      "Platzhalter in `content/legal/datenschutz.md` ersetzen: Speicherfristen und die Regionen von Supabase und Sentry (im jeweiligen Dashboard nachsehen).",
      "Text mit Generator oder Anwalt abgleichen.",
      "In `docs/legal/checkliste-demo-zugang.md` abhaken: „Datenschutzerklärung final“, „Speicherfristen festgelegt“, „Regionen … geprüft“.",
    ],
    pruefung: "Der Loop schließt das Issue, sobald diese 3 Punkte in der Checkliste abgehakt sind.",
    check: { type: "legal", items: ["Datenschutzerklärung final", "Speicherfristen festgelegt", "Regionen in der Datenschutzerklärung geprüft"] },
  },
  {
    titel: "Vercel und Supabase auf Pro umstellen (vor Livegang)",
    wo: "Dashboards von Vercel und Supabase (Abrechnung)",
    link: "https://vercel.com/dashboard",
    minuten: 15,
    schritte: [
      "Vercel: Team auf Pro stellen (Hobby ist nur für nicht-kommerzielle Nutzung).",
      "Supabase: Organisation auf Pro stellen (https://supabase.com/dashboard), damit das Projekt nicht pausiert wird.",
      "Kommentar an dieses Issue schreiben: erledigt, Datum.",
    ],
    pruefung: "Der Loop sieht die Abrechnung nicht. Du schließt das Issue selbst. Vorher kein Livegang.",
  },
  {
    titel: "GitHub-Tokens erneuern",
    wo: "GitHub und Infisical, cron-job.org",
    link: "https://github.com/settings/personal-access-tokens",
    minuten: 20,
    faellig: "2026-12-20",
    schritte: [
      "GitHub → Settings → Developer settings → Fine-grained tokens: `agent-workflows` (AGENT_WORKFLOW_TOKEN, läuft am 03.01.2027 ab), `AGENT_VARIABLES_TOKEN` und `cron-takt` (ca. 02.–04.01.2027) jeweils „Regenerate token“, gleiche Laufzeit wählen.",
      "Neuen Wert für `agent-workflows` und `AGENT_VARIABLES_TOKEN` in Infisical (Development) ersetzen und synchronisieren; für `cron-takt` den Wert im cron-job.org-Job ersetzen. Nie ins Repo schreiben.",
      "In `docs/autonomy/tokens.md` die neuen Ablaufdaten eintragen.",
    ],
    pruefung: "Der Loop schließt das Issue, sobald alle 3 Tokens in docs/autonomy/tokens.md einen Ablauf nach dem 01.02.2027 haben.",
    check: { type: "tokens", names: ["agent-workflows", "AGENT_VARIABLES_TOKEN", "cron-takt"], after: "01.02.2027" },
  },
]);

// ---------- Anzeige ----------

/** Fällig-Datum JJJJ-MM-TT → „TT.MM.“. */
const dueShort = (d) => (d ? `${String(d).slice(8, 10)}.${String(d).slice(5, 7)}.` : "");

/** Offene Aufgaben: früh fällige zuerst, ohne Datum danach, sonst nach Nummer. */
export function sortSinan(issues) {
  const num = (i) => Number(String(i.identifier).split("-")[1] ?? 0);
  return [...issues].sort((a, b) => String(a.dueDate ?? "9999").localeCompare(String(b.dueDate ?? "9999")) || num(a) - num(b));
}

/** Eine Zeile für das Tages-Update: Kennung, Titel, Minuten, Fälligkeit, Link. */
export function sinanLine(issue) {
  const { minuten } = parseSinanBody(issue.description);
  const meta = [minuten ? `${minuten} Min` : null, issue.dueDate ? `fällig ${dueShort(issue.dueDate)}` : null].filter(Boolean).join(", ");
  return `${issue.identifier} ${trim(issue.title, 60)}${meta ? ` (${meta})` : ""} ${issue.url ?? ""}`.trim();
}

/** Abschnitt für die Status-Seite („Braucht dich“). */
export function renderSinan(issues) {
  if (!issues?.length) return "Keine offenen Aufgaben mit Label `sinan`.";
  return sortSinan(issues)
    .map((i) => {
      const { minuten } = parseSinanBody(i.description);
      const meta = [minuten ? `${minuten} Min` : null, i.dueDate ? `fällig ${dueShort(i.dueDate)}` : null].filter(Boolean).join(", ");
      return `- [${i.identifier}](${i.url}) ${i.title.replaceAll("|", "/")}${meta ? `, ${meta}` : ""}`;
    })
    .join("\n");
}

// ---------- Linear ----------

const FIELDS = `id identifier title description url dueDate completedAt team { id } state { name type }`;

/** Alle Issues mit Label `sinan` (offen und erledigt, für den Duplikat-Schutz); `open` filtert auf offene. */
export async function fetchSinanIssues(call = linear, { project = PROJECT_NAME } = {}) {
  const data = await call(
    `query($project: String!, $label: String!) {
       issues(first: 100, filter: { project: { name: { eq: $project } }, labels: { name: { eqIgnoreCase: $label } } }) { nodes { ${FIELDS} } }
     }`,
    { project, label: SINAN_LABEL },
  );
  return data.issues.nodes;
}

export const isOpen = (i) => !["completed", "canceled"].includes(i.state?.type);

async function sinanLabelId(teamId, call) {
  const found = await call(`query($t: ID!, $n: String!) { issueLabels(filter: { team: { id: { eq: $t } }, name: { eqIgnoreCase: $n } }) { nodes { id } } }`, { t: teamId, n: SINAN_LABEL });
  if (found.issueLabels.nodes[0]) return found.issueLabels.nodes[0].id;
  const made = await call(`mutation($i: IssueLabelCreateInput!) { issueLabelCreate(input: $i) { issueLabel { id } } }`, { i: { teamId, name: SINAN_LABEL } });
  return made.issueLabelCreate.issueLabel.id;
}

/**
 * Legt Aufgaben als Todo mit Label `sinan` an (nie `claude`). Titel, die es schon gibt (auch erledigt), werden übersprungen.
 * @param {SinanTask[]} tasks
 * @returns {Promise<string[]>} Kennungen der neuen Issues
 */
export async function createSinanIssues(tasks, existing = [], call = linear) {
  const have = new Set(existing.map((i) => i.title.trim().toLowerCase()));
  const fresh = tasks.filter((t) => !have.has(t.titel.trim().toLowerCase()));
  if (!fresh.length) return [];
  const { teamId, projectId } = await linearTeamAndProject(call);
  const stateId = await stateIdByName(teamId, "Todo", call);
  const labelId = await sinanLabelId(teamId, call);
  const created = [];
  for (const t of fresh) {
    const data = await call(`mutation($i: IssueCreateInput!) { issueCreate(input: $i) { issue { identifier url } } }`, {
      i: { teamId, projectId, stateId, title: t.titel, description: buildSinanBody(t), priority: 3, labelIds: [labelId], ...(t.faellig ? { dueDate: t.faellig } : {}) },
    });
    console.log(`Angelegt: ${data.issueCreate.issue.identifier} ${data.issueCreate.issue.url}`);
    created.push(data.issueCreate.issue.identifier);
  }
  return created;
}

/**
 * Standard-Aufgaben nachtragen, erledigte schließen. Gibt die danach offenen Aufgaben zurück.
 * @returns {Promise<{ open: any[], created: string[], closed: { identifier: string, grund: string }[] }>}
 */
export async function syncSinan({ call = linear, files = readCheckFiles(), dry = false, seed = SEED } = {}) {
  let all = await fetchSinanIssues(call);
  const created = dry ? [] : await createSinanIssues(seed, all, call);
  if (created.length) all = await fetchSinanIssues(call);
  const closed = [];
  for (const issue of all.filter(isOpen)) {
    const res = evaluateCheck(parseSinanBody(issue.description).check, { files });
    if (!res.done) continue;
    closed.push({ identifier: issue.identifier, grund: res.grund });
    if (dry) continue;
    await comment(issue.id, `Automatisch geschlossen: ${res.grund}.`, call);
    await setState(issue, "Done", call);
  }
  const gone = new Set(closed.map((c) => c.identifier));
  return { open: all.filter((i) => isOpen(i) && !gone.has(i.identifier)), created, closed };
}

export async function main(argv) {
  const cmd = argv[0];
  const dry = argv.includes("--dry-run");
  const all = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
  const one = (n) => all(n)[0];
  if (cmd === "sync") {
    const r = await syncSinan({ dry });
    console.log(`Neu: ${r.created.join(", ") || "keine"}. Geschlossen: ${r.closed.map((c) => `${c.identifier} (${c.grund})`).join(", ") || "keine"}.`);
    console.log(renderSinan(r.open));
  } else if (cmd === "list") {
    console.log(renderSinan((await fetchSinanIssues()).filter(isOpen)));
  } else if (cmd === "create") {
    const task = { titel: one("--titel"), wo: one("--wo"), link: one("--link"), minuten: Number(one("--minuten")), schritte: all("--schritt"), pruefung: one("--pruefung"), ...(one("--faellig") ? { faellig: one("--faellig") } : {}) };
    for (const k of ["titel", "wo", "link", "pruefung"]) if (!task[k]) throw new Error(`--${k} fehlt`);
    if (!Number.isFinite(task.minuten) || !task.schritte.length) throw new Error("--minuten (Zahl) und mindestens ein --schritt nötig");
    if (dry) return console.log(buildSinanBody(task));
    await createSinanIssues([task], await fetchSinanIssues());
  } else {
    throw new Error("Befehl: sync | list | create");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
