/**
 * Linear-Zugriff und Auswahl für Dispatcher und Planer (SIN-223).
 * Auswahl und Prompt sind reine Funktionen; nur `linear()` spricht mit dem Netz.
 */

import { fetchJson } from "./http.mjs";

export const PROJECT_NAME = "Content-Agent-Lernapp";
export const MAX_PARALLEL = 2;
export const MAX_REPAIR_ROUNDS = 3;
const LINEAR_URL = "https://api.linear.app/graphql";

/** Linear-API: persönlicher Key ohne „Bearer“. */
export async function linear(query, variables = {}, { key = process.env.LINEAR_API_KEY, fetchImpl = fetch, ...http } = {}) {
  if (!key) throw new Error("LINEAR_API_KEY fehlt");
  const json = await fetchJson(
    "Linear",
    LINEAR_URL,
    { method: "POST", headers: { "Content-Type": "application/json", Authorization: key }, body: JSON.stringify({ query, variables }) },
    { fetchImpl, ...http },
  );
  if (json?.errors) throw new Error(`Linear-Fehler: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const ISSUE_FIELDS = `
  id identifier title description priority url updatedAt createdAt startedAt
  labels { nodes { name } }
  projectMilestone { name }
  state { id name type }
  team { id }
  inverseRelations { nodes { type issue { identifier state { type } } } }`;

export async function fetchProjectIssues(call = linear, project = PROJECT_NAME) {
  const data = await call(
    `query($project: String!) {
       issues(first: 100, filter: { project: { name: { eq: $project } }, state: { type: { in: ["unstarted", "started"] } } }) {
         nodes { ${ISSUE_FIELDS} }
       }
     }`,
    { project },
  );
  return data.issues.nodes;
}

/** Meilensteine je Projekt (SIN-528): v1 ist das Grundgerüst aus der Fertig-Liste, v2 sammelt Ideen. */
export const MILESTONE_V1 = "v1 Grundgerüst";
export const MILESTONE_V2 = "v2 Ideen";
export const LABEL_IDEE = "idee";
export const LABEL_DRINGEND = "dringend";
/** Höchstens eine Idee startet je Zeitfenster (Tage). */
export const IDEA_WINDOW_DAYS = 7;

/** Ideen im Backlog (der Standard-Abruf liest nur Todo und In Progress): Kandidaten für den Wochen-Slot. */
export async function fetchBacklogIdeas(call = linear, project = PROJECT_NAME) {
  const data = await call(
    `query($project: String!, $label: String!) {
       issues(first: 100, filter: { project: { name: { eq: $project } }, state: { type: { eq: "backlog" } }, labels: { name: { eqIgnoreCase: $label } } }) {
         nodes { ${ISSUE_FIELDS} }
       }
     }`,
    { project, label: LABEL_IDEE },
  );
  return data.issues.nodes;
}

/** Startzeiten (ISO) der Ideen, die in den letzten `IDEA_WINDOW_DAYS` Tagen begonnen wurden (offen oder erledigt). */
export async function fetchRecentIdeaStarts(call = linear, { project = PROJECT_NAME, now = new Date() } = {}) {
  const since = new Date(now.getTime() - IDEA_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const data = await call(
    `query($project: String!, $label: String!, $since: DateTimeOrDuration!) {
       issues(first: 50, filter: { project: { name: { eq: $project } }, labels: { name: { eqIgnoreCase: $label } }, startedAt: { gte: $since } }) {
         nodes { startedAt }
       }
     }`,
    { project, label: LABEL_IDEE, since },
  );
  return data.issues.nodes.map((n) => n.startedAt).filter(Boolean);
}

/** Frei, wenn in den letzten `IDEA_WINDOW_DAYS` Tagen keine Idee gestartet wurde (SIN-528: 1 Idee pro Woche). */
export const ideaSlotFree = (startedAts, now = new Date()) =>
  !startedAts.some((t) => now.getTime() - new Date(t).getTime() < IDEA_WINDOW_DAYS * 24 * 3600 * 1000);

/** Fortschritt je Projekt aus Linear (SIN-528): erledigte und alle v1-Issues, offene Ideen. Abgebrochene zählen nicht. */
export async function fetchProgress(call = linear, project = PROJECT_NAME) {
  const data = await call(
    `query($project: String!) {
       issues(first: 250, filter: { project: { name: { eq: $project } }, state: { type: { nin: ["canceled"] } } }) {
         nodes { state { type } labels { nodes { name } } projectMilestone { name } }
       }
     }`,
    { project },
  );
  return progressOf(data.issues.nodes);
}

/** Zählt v1-Fortschritt und offene Ideen. Reine Funktion. */
export function progressOf(issues) {
  const v1 = issues.filter((i) => !isIdea(i));
  const open = (i) => i.state?.type !== "completed" && i.state?.type !== "canceled";
  return { fertig_v1: v1.filter((i) => i.state?.type === "completed").length, gesamt_v1: v1.length, ideen_offen: issues.filter((i) => isIdea(i) && open(i)).length };
}

/** In den letzten `days` Tagen erledigte Issues des Projekts (Duplikat-Schutz des Planers, SIN-292). */
export async function fetchRecentlyDone(call = linear, { project = PROJECT_NAME, days = 14, now = new Date() } = {}) {
  const since = new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();
  const data = await call(
    `query($project: String!, $since: DateTimeOrDuration!) {
       issues(first: 100, filter: { project: { name: { eq: $project } }, completedAt: { gte: $since } }) {
         nodes { id identifier title description completedAt state { type } }
       }
     }`,
    { project, since },
  );
  return data.issues.nodes;
}

/** Kommentar an ein bestehendes Issue. */
export async function commentOnIssue(issueId, body, call = linear) {
  await call(`mutation($i: CommentCreateInput!) { commentCreate(input: $i) { success } }`, { i: { issueId, body } });
}

/** Offener Blocker: eine „blocks“-Relation, deren Quelle noch nicht abgeschlossen ist. */
export function hasOpenBlockers(issue) {
  return (issue.inverseRelations?.nodes ?? []).some(
    (r) => r.type === "blocks" && !["completed", "canceled"].includes(r.issue?.state?.type),
  );
}

/** Priorität in Linear: 1 dringend … 4 niedrig, 0 = keine (zählt als niedrigste). */
const rank = (p) => (p === 0 || p == null ? 5 : p);

/** Spuren (SIN-227), in dieser Reihenfolge abwechselnd bedient. Label je Spur = Name. */
export const LANES = ["frontend", "content", "backend"];
/** Issues mit diesen Labels bekommt der Dispatcher nie: Design (Figma-Sitzung), Abnahme, Blocker, Recherche und Aufgaben für Sinan (SIN-310). */
export const HUMAN_LABELS = ["design", "abnahme", "needs-human", "research", "sinan"];

const labelsOf = (issue) => (issue.labels?.nodes ?? []).map((l) => l.name.toLowerCase());
/** Idee: Label `idee` oder Meilenstein „v2 …“ (SIN-528). Alles andere zählt zum Grundgerüst v1. */
export const isIdea = (issue) => labelsOf(issue).includes(LABEL_IDEE) || /^v2\b/i.test(issue.projectMilestone?.name ?? "");
export const isUrgentLabel = (issue) => labelsOf(issue).includes(LABEL_DRINGEND);
export const isHumanIssue =(issue) => labelsOf(issue).some((l) => HUMAN_LABELS.includes(l));
/** Spur eines Issues; ohne Spur-Label zählt es als `backend`. */
export const laneOf = (issue) => LANES.find((l) => labelsOf(issue).includes(l)) ?? "backend";

/**
 * Bis zu `slots` Issues: Status Todo, keine offenen Blocker, kein `design`/Mensch-Issue, `mayTake` (Cursor-Wartezeit nur mit CURSOR_GRACE_MIN, SIN-420).
 * Spuren wechseln sich ab: Beginn bei der Spur nach der zuletzt gestarteten, danach reihum; innerhalb
 * einer Spur höchste Priorität, dann ältere Nummer. Eine Spur ohne Kandidat wird übersprungen (kein Hungern).
 * Urgent (Priorität 1) kommt vor der Rotation (SIN-327). `waiting`: Kennungen von Issues mit wartendem PR,
 * sie belegen keinen der `MAX_PARALLEL` Plätze.
 */
export function pickMany(issues, slots = MAX_PARALLEL, mayTake = () => true, waiting = new Set(), opts = {}) {
  // Wartende PRs (SIN-327) belegen keinen Platz: nur Issues mit Worker oder PR in Arbeit zählen.
  const started = issues.filter((i) => i.state.type === "started" && !waiting.has(i.identifier));
  const free = Math.max(0, MAX_PARALLEL - started.length);
  const want = Math.min(slots, free);
  if (want === 0) return { issues: [], reason: `${started.length} Issues laufen schon (max. ${MAX_PARALLEL})` };
  const picked = startOrder(issues, mayTake, opts).slice(0, want);
  return picked.length
    ? { issues: picked, reason: "ok" }
    : { issues: [], reason: "kein freies Todo (Blocker, Design/Mensch, oder Cursor hat noch Vorrang)" };
}

/**
 * Alle startbaren Todo-Issues in der Reihenfolge, in der der Dispatcher sie wählt (Spuren reihum, je Spur
 * Priorität, dann Nummer), unabhängig von freien Slots. Der Loop-Status (SIN-238) zeigt damit die Schlange.
 */
export function startOrder(issues, mayTake = () => true, /** @type {{ ideaSlot?: boolean }} */ { ideaSlot = true } = {}) {
  const started = issues.filter((i) => i.state.type === "started");
  const queues = Object.fromEntries(LANES.map((l) => [l, []]));
  const startable = issues.filter(
    (i) => (i.state.name === "Todo" || (i.state.name === "Backlog" && isIdea(i))) && !isHumanIssue(i) && !hasOpenBlockers(i) && mayTake(i),
  );
  // SIN-528: `dringend` zuerst (überspringt alles), dann v1; Ideen erst danach, höchstens eine je Woche (`ideaSlot`), älteste zuerst.
  const dringend = startable.filter(isUrgentLabel).sort((a, b) => rank(a.priority) - rank(b.priority) || numberOf(a) - numberOf(b));
  const ideas = startable.filter((i) => !isUrgentLabel(i) && isIdea(i)).sort((a, b) => numberOf(a) - numberOf(b));
  const todo = startable
    .filter((i) => !isUrgentLabel(i) && !isIdea(i))
    .sort((a, b) => rank(a.priority) - rank(b.priority) || numberOf(a) - numberOf(b));
  // Urgent zuerst, älteste Nummer zuerst; die Rotation gilt erst ab Priorität 2 (SIN-327).
  const urgent = todo.filter((i) => i.priority === 1);
  todo.filter((i) => i.priority !== 1).forEach((i) => queues[laneOf(i)].push(i));
  const last = [...started].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))[0];
  let lane = last ? (LANES.indexOf(laneOf(last)) + 1) % LANES.length : 0;
  const ordered = [...dringend, ...urgent];
  while (LANES.some((l) => queues[l].length)) {
    const next = queues[LANES[lane]].shift();
    if (next) ordered.push(next);
    lane = (lane + 1) % LANES.length;
  }
  return ideaSlot && ideas.length ? [...ordered, ideas[0]] : ordered;
}

/** Das nächste einzelne Issue (wie `pickMany` mit einem Slot). @returns {{ issue: any, reason: string }} */
export function pickNext(issues, maxParallel = MAX_PARALLEL, mayTake = () => true) {
  const { issues: picked, reason } = pickMany(issues, Math.min(1, maxParallel), mayTake);
  return { issue: picked[0] ?? null, reason };
}

const numberOf = (i) => Number(String(i.identifier).split("-")[1] ?? 0);

/** Prompt für claude-code-action im Automationsmodus. */
export function buildPrompt(issue) {
  return [
    `Linear-Issue ${issue.identifier}: ${issue.title}`,
    issue.url ?? "",
    "",
    issue.description ?? "(ohne Beschreibung)",
    "",
    "Regeln: AGENTS.md. Lies zuerst docs/LANDKARTE.md (wo liegt was), docs/PRODUCT.md und docs/DECISIONS.md (Index; die Einzeldateien liegen in docs/decisions/).",
    "Lehren (SIN-296): Lies docs/autonomy/LEHREN.md. Nach jedem behobenen Bug ergänze dort eine Zeile (Was nicht geht → wie es richtig geht; keine Dopplungen, höchstens 150 Zeilen). Wiederholt sich ein Arbeitsablauf, lege docs/skills/<name>/SKILL.md an (Aufbau: docs/skills/README.md), nutze passende vorhandene Skills und nenne neue im PR unter `## Neue Skills`. Das Laufprotokoll erzeugt der Workflow, du schreibst es nicht.",
    `Entscheidungen und Annahmen: eine neue Datei docs/decisions/${issue.identifier}-<kurz>.md (Kopf: Links, Entscheidung, Annahmen, Warum). docs/DECISIONS.md nie von Hand bearbeiten: vor dem Push \`npm run decisions:index\` ausführen und den Index im selben PR committen (CI prüft ihn).`,
    `Arbeite auf einem neuen Branch claude/${issue.identifier.toLowerCase()}. Ein PR pro Arbeitspaket, Reparaturen im selben PR.`,
    `PR-Titel als Conventional Commit mit (${issue.identifier}), Body beginnt mit "Part of ${issue.identifier}". Kein Draft, nie selbst mergen.`,
    "PR-Titel in Klartext (Conventional Commit, SIN-248). PR-Beschreibung nach dem ersten Satz in festen Abschnitten mit `## `-Überschriften, daraus baut pr-gate den Steckbrief für Sinan: `## Was ändert sich` (2–4 Zeilen aus Nutzersicht, keine Dateilisten), `## Ausprobieren` (ein Klickpfad, z. B. Startseite → Los geht’s → Einverstanden; bei Backend-only weglassen), `## Nach dem Merge` (was automatisch passiert), `## Kosten` (nur wenn relevant: API-Kosten, neue Secrets, neue Dienste), `## Rückgängig` (nur wenn nicht „Revert-PR genügt“). Braucht es eine Entscheidung von Sinan: `## Entscheidung nötig` mit Frage und 2–3 Optionen.",
    `Höchstens ${MAX_REPAIR_ROUNDS} Reparatur-Runden. Bei einem Blocker: stoppen und den Blocker im PR beschreiben.`,
    "Vor dem Push: `git fetch origin main && git merge origin/main`, dann `npm ci`, `npm run typecheck`, `npm run lint` und `npm test` ausführen (die CI-Prüfungen im selben Lauf, SIN-298). Rot? Ursache selbst beheben und erneut ausführen, erst dann pushen und den PR öffnen. Kein PR mit bekannten roten Checks.",
    `Live-Updates (SIN-298): Schreibe kurze Fortschritts-Kommentare ins Linear-Issue: \`node scripts/autonomy/live.mjs fortschritt ${issue.identifier} "woran du gerade arbeitest"\` (höchstens 3 je Lauf, z. B. nach dem Plan, vor den Prüfungen). Rückfragen an Sinan als \`node scripts/autonomy/live.mjs frage ${issue.identifier} "…"\`, nicht nur im PR. Gestartet, fertig und gescheitert schreibt der Workflow selbst. Dateien liest und suchst du mit Read/Grep/Glob, nicht mit sed/grep/ls in der Shell; Lauf-Skripte startest du über npm run (z. B. \`npm run safety-sample -- --live --json <datei>\`).`,
    "Frontend: Werte (Farben, Abstände, Texte) aus Figma lesen, nicht schätzen: `node scripts/autonomy/figma.mjs --node <ID>` (Datei 0SWGDO2ioBD3MyXiAnrbRz, Token FIGMA_ACCESS_TOKEN nur lesend; fehlt er, im PR „nicht verfügbar“ schreiben).",
    "Frontend-Selbstprüfung (SIN-275, Pflicht vor dem PR bei Änderungen an src/app oder Komponenten): Lies docs/skills/web-design-guidelines/SKILL.md. `npm run build`, dann `node scripts/autonomy/screenshots.mjs <geänderte Routen>` (Handy 390 px + Desktop, Chromium ist installiert; sonst `npx playwright install chromium`). Sieh dir die Bilder an, prüfe sie gegen die Checkliste und Figma, behebe Abweichungen oder nenne sie im PR. Spiele den Klickpfad aus dem Issue einmal durch. Schreibe in `## Ausprobieren` „Klickpfad geprüft“ und die Screenshot-Namen (Artefakt `screenshots` des Worker-Laufs).",
    "README (SIN-300): Ändern sich Funktion, Einrichtung, Befehle oder Umgebungsvariablen, passe `README.md` im selben PR an (CI warnt sonst). `CHANGELOG.md` nie von Hand: sie wird aus den PR-Titeln erzeugt.",
    "Diagramme (SIN-376): Änderst du `.github/workflows/`, `scripts/autonomy/` oder `src/app/**/page.tsx`, passe im selben PR `docs/diagramme/pipeline.mmd` bzw. `docs/diagramme/nutzerwege.mmd` an (bei `pipeline.mmd` auch den Mermaid-Block im README). Ohne das zeigt der PR-Steckbrief einen Hinweis.",
    "Aufgaben für Sinan (SIN-310): Braucht es etwas, das nur Sinan tun kann, schreibe keine Anleitung in den PR. Lege ein Linear-Issue mit Label `sinan` an: `node scripts/autonomy/sinan.mjs create --titel … --wo … --link … --minuten … --schritt „1. …“ (mehrfach) --pruefung …` (Beschreibung im festen Block wo, link, minuten, schritte, pruefung; kopierbare Werte, nie Geheimnisse). Verlinke das Issue im PR unter `## Nach dem Merge`.",
    "Keine neuen Komponenten, Farben oder Screens im Code erfinden. Fehlt etwas in Figma, lege ein Linear-Issue mit Label `design` an, statt zu improvisieren.",
  ].join("\n");
}

/** Trifft Titel oder Branch eines PRs die Issue-ID (SIN-7, nicht SIN-70)? Branch klein geschrieben (claude/sin-7). */
export function prMentions(pr, identifier) {
  const re = new RegExp(`(^|[^a-z0-9])${identifier}($|[^0-9])`, "i");
  return re.test(pr.title ?? "") || re.test(pr.head ?? "");
}

const HAKEN = /^([-*] )\[( |x|X)\] (.+?)\s*$/gm;

/**
 * Haken (`- [ ]`) der Issue-Beschreibung gegen die Belege der gemergten PRs (SIN-779): ein Haken gilt als belegt,
 * wenn ein PR-Text dieselbe Zeile als `- [x]` führt. Belegte werden in der Beschreibung auf `[x]` gesetzt.
 * „Part of“ allein belegt nichts: bleibt ein Haken offen, bleibt das Issue offen. Ohne Haken gibt es nichts zu belegen.
 * @returns {{ offen: string[], description: string }}
 */
export function pruefeHaken(description, prBodies = []) {
  const norm = (s) => s.trim().toLowerCase();
  const belegt = new Set(
    prBodies.flatMap((b) => [...String(b ?? "").matchAll(HAKEN)].filter((m) => m[2] !== " ").map((m) => norm(m[3]))),
  );
  const offen = [];
  const neu = String(description ?? "").replace(HAKEN, (zeile, punkt, box, text) => {
    if (box !== " ") return zeile;
    if (belegt.has(norm(text))) return `${punkt}[x] ${text}`;
    offen.push(text);
    return zeile;
  });
  return { offen, description: neu };
}

/** Kommentartext, wenn ein Issue trotz gemergtem PR offen bleibt (fester Wortlaut: Dublettenschutz). */
export const offenKommentar = (offen) =>
  `Bleibt offen: ${offen.length} von den Fertig-Kriterien ohne Beleg (Loop-Wächter, SIN-779):\n${offen.map((t) => `- ${t}`).join("\n")}`;

/**
 * Setzt Haken, dann Done (alle belegt) oder Kommentar „bleibt offen“ (einmal je Stand). `action` aus `reconcile`.
 * `dry`: nichts ändern. Gibt zurück, ob das Issue Done wurde.
 */
export async function applyDone(action, { dry = false, call = linear } = {}) {
  const { issue, offen = [], description } = action;
  if (dry) return !offen.length;
  if (description !== undefined && description !== issue.description) {
    await call(`mutation($id: String!, $d: String!) { issueUpdate(id: $id, input: { description: $d }) { success } }`, { id: issue.id, d: description });
  }
  if (!offen.length) {
    await setState(issue, "Done", call);
    return true;
  }
  const text = offenKommentar(offen);
  if (!(await fetchComments(issue.id, call)).some((c) => c.body === text)) await comment(issue.id, text, call);
  return false;
}

/**
 * Abgleich vor der Auswahl (SIN-237): Issues in „In Progress“ mit gemergtem PR → Done, nur geschlossene
 * PRs ohne offenen → Todo. Ohne PR bleibt das Issue (der Worker läuft evtl. noch). PRs: { title, head, state, merged, body }.
 * Mit offenen Haken (SIN-779) lautet die Aktion `Offen` statt `Done`: das Issue bleibt „In Progress“, belegt sich nicht selbst.
 */
export function reconcile(issues, prs, /** @type {{ runningWorkers?: string[], now?: Date }} */ { runningWorkers, now = new Date() } = {}) {
  const actions = [];
  for (const issue of issues) {
    if (issue.state?.name !== "In Progress") continue;
    const mine = prs.filter((p) => prMentions(p, issue.identifier));
    if (mine.some((p) => p.merged)) {
      const { offen, description } = pruefeHaken(issue.description, mine.filter((p) => p.merged).map((p) => p.body));
      actions.push({ issue, to: offen.length ? "Offen" : "Done", offen, description });
    }
    else if (mine.length && !mine.some((p) => p.state === "open")) actions.push({ issue, to: "Todo" });
    // SIN-240/SIN-291: weder PR noch laufender Worker seit STUCK_MIN (Geister-Issue) → zurück auf Todo (nur, wenn die Läufe bekannt sind).
    else if (!mine.length && runningWorkers && !runningWorkers.includes(issue.identifier) && stuckMinutes(issue, now) > STUCK_MIN) {
      actions.push({ issue, to: "Todo" });
    }
  }
  return actions;
}

/** So lange darf „In Progress“ ohne Worker-Lauf und ohne PR stehen, bevor der Abgleich das Issue freigibt (SIN-291: 15 Min, vorher 60). */
export const STUCK_MIN = 15;
const stuckMinutes = (issue, now) => (new Date(now).getTime() - new Date(issue.updatedAt ?? now).getTime()) / 60000;

/** Status je Team einmal pro Lauf lesen, nicht je Issue (SIN-263: weniger Linear-Anfragen). */
const statesCache = new WeakMap();

export async function stateIdByName(teamId, name, call = linear) {
  const perCall = statesCache.get(call) ?? new Map();
  statesCache.set(call, perCall);
  if (!perCall.has(teamId)) {
    const data = await call(`query($id: String!) { team(id: $id) { states { nodes { id name } } } }`, { id: teamId });
    perCall.set(teamId, data.team.states.nodes);
  }
  const s = perCall.get(teamId).find((n) => n.name === name);
  if (!s) throw new Error(`Status „${name}“ im Team nicht gefunden`);
  return s.id;
}

/** Team und Projekt für neue Issues (Planer). */
export async function linearTeamAndProject(call = linear, project = PROJECT_NAME) {
  const data = await call(
    `query($project: String!) { projects(filter: { name: { eq: $project } }) { nodes { id teams { nodes { id } } } } }`,
    { project },
  );
  const p = data.projects.nodes[0];
  if (!p?.teams.nodes[0]) throw new Error(`Projekt „${project}“ oder Team nicht gefunden`);
  return { projectId: p.id, teamId: p.teams.nodes[0].id };
}

/** Anzahl aller nicht archivierten Issues im Workspace (Linear Free: 250, SIN-291). Linear liefert keine Summe: seitenweise zählen. */
export async function countIssues(call = linear, pageSize = 250, maxPages = 4) {
  let n = 0;
  let after = null;
  for (let page = 0; page < maxPages; page++) {
    const data = await call(
      `query($after: String) { issues(first: ${pageSize}, after: $after, includeArchived: false) { nodes { id } pageInfo { hasNextPage endCursor } } }`,
      { after },
    );
    n += data.issues.nodes.length;
    if (!data.issues.pageInfo.hasNextPage) return n;
    after = data.issues.pageInfo.endCursor;
  }
  return n;
}

/** Titel der in den letzten 24 h erledigten Issues mit diesem Titelanfang (gegen Duplikate am selben Tag). */
export async function doneTitlesSince(prefix, now = new Date(), call = linear) {
  const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const data = await call(
    `query($s: DateTimeOrDuration!, $p: String!) { issues(first: 50, filter: { completedAt: { gte: $s }, title: { startsWith: $p } }) { nodes { title } } }`,
    { s: since, p: prefix },
  );
  return data.issues.nodes.map((n) => n.title);
}

/** ID eines Meilensteins im Projekt (SIN-528); `null`, wenn es ihn nicht gibt (dann bleibt das Issue ohne Meilenstein). */
export async function milestoneIdByName(projectId, name, call = linear) {
  const data = await call(`query($p: String!) { project(id: $p) { projectMilestones { nodes { id name } } } }`, { p: projectId });
  return data.project?.projectMilestones?.nodes?.find((m) => m.name.toLowerCase() === name.toLowerCase())?.id ?? null;
}

/**
 * Einordnung neuer Issues (SIN-528): Ideen (`idee: true`) bekommen Label `idee`, Meilenstein „v2 Ideen“ und Status Backlog,
 * alles andere (Lücke der Fertig-Liste) Meilenstein „v1 Grundgerüst“. `dringend` bleibt immer v1 und startet sofort.
 * @returns {{ labels: string[], state: string, milestone: string }}
 */
export function classifyNew(/** @type {{ idee?: boolean, labels?: string[] }} */ { idee = false, labels = [] } = {}) {
  const dringend = labels.some((l) => l.toLowerCase() === LABEL_DRINGEND);
  const asIdea = idee && !dringend;
  return {
    labels: asIdea && !labels.includes(LABEL_IDEE) ? [...labels, LABEL_IDEE] : labels,
    state: asIdea ? "Backlog" : "Todo",
    milestone: asIdea ? MILESTONE_V2 : MILESTONE_V1,
  };
}

/**
 * Legt Issues als Todo an (Labels, die es gibt; Priorität; optional `parentId`; `idee` → Backlog, v2). Gibt die Kennungen zurück.
 * @param {{ title: string, description: string, priority: number, labels?: string[], parentId?: string, idee?: boolean }[]} items
 */
export async function createLinearIssues(items, call = linear) {
  if (!items.length) return [];
  const { teamId, projectId } = await linearTeamAndProject(call);
  const stateIds = {};
  const milestoneIds = {};
  const created = [];
  for (const raw of items) {
    const cls = classifyNew(raw);
    const it = { ...raw, labels: cls.labels };
    stateIds[cls.state] ??= await stateIdByName(teamId, cls.state, call);
    milestoneIds[cls.milestone] ??= await milestoneIdByName(projectId, cls.milestone, call);
    const stateId = stateIds[cls.state];
    const projectMilestoneId = milestoneIds[cls.milestone];
    const labelIds = [];
    for (const n of it.labels ?? []) {
      const found = await call(`query($t: ID!, $n: String!) { issueLabels(filter: { team: { id: { eq: $t } }, name: { eqIgnoreCase: $n } }) { nodes { id } } }`, { t: teamId, n });
      labelIds.push(...found.issueLabels.nodes.map((l) => l.id));
    }
    const data = await call(`mutation($i: IssueCreateInput!) { issueCreate(input: $i) { issue { identifier url } } }`, {
      i: { teamId, projectId, stateId, title: it.title, description: it.description, priority: it.priority, labelIds, ...(projectMilestoneId ? { projectMilestoneId } : {}), ...(it.parentId ? { parentId: it.parentId } : {}) },
    });
    const { identifier, url } = data.issueCreate.issue;
    console.log(`Angelegt: ${identifier} ${url}`);
    created.push(identifier);
  }
  return created;
}

export async function setState(issue, name, call = linear) {
  const stateId = await stateIdByName(issue.team.id, name, call);
  await call(`mutation($id: String!, $s: String!) { issueUpdate(id: $id, input: { stateId: $s }) { success } }`, {
    id: issue.id,
    s: stateId,
  });
}

export async function comment(issueId, body, call = linear) {
  await call(`mutation($id: String!, $b: String!) { commentCreate(input: { issueId: $id, body: $b }) { success } }`, {
    id: issueId,
    b: body,
  });
}

/** Kommentare eines Issues (höchstens 50), für die Zählung der Läufe ohne PR (SIN-362). */
export async function fetchComments(issueId, call = linear) {
  const data = await call(`query($id: String!) { issue(id: $id) { comments(first: 50) { nodes { body createdAt } } } }`, { id: issueId });
  return data.issue?.comments?.nodes ?? [];
}

/** Label am Issue ergänzen (SIN-362: `needs-human`). Das Label muss im Team existieren. */
export async function addLabel(issue, name, call = linear) {
  const found = await call(`query($t: ID!, $n: String!) { issueLabels(filter: { team: { id: { eq: $t } }, name: { eqIgnoreCase: $n } }) { nodes { id } } }`, { t: issue.team.id, n: name });
  const labelId = found.issueLabels.nodes[0]?.id;
  if (!labelId) throw new Error(`Label „${name}“ im Team nicht gefunden`);
  await call(`mutation($id: String!, $l: String!) { issueAddLabel(id: $id, labelId: $l) { success } }`, { id: issue.id, l: labelId });
}
