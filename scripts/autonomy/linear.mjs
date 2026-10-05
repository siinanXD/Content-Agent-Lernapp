/**
 * Linear-Zugriff und Auswahl für Dispatcher und Planer (SIN-223).
 * Auswahl und Prompt sind reine Funktionen; nur `linear()` spricht mit dem Netz.
 */

export const PROJECT_NAME = "Content-Agent-Lernapp";
export const MAX_PARALLEL = 2;
export const MAX_REPAIR_ROUNDS = 3;
const LINEAR_URL = "https://api.linear.app/graphql";

/** Linear-API: persönlicher Key ohne „Bearer“. */
export async function linear(query, variables = {}, { key = process.env.LINEAR_API_KEY, fetchImpl = fetch } = {}) {
  if (!key) throw new Error("LINEAR_API_KEY fehlt");
  const res = await fetchImpl(LINEAR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`Linear-Fehler: ${JSON.stringify(json.errors ?? res.status)}`);
  return json.data;
}

const ISSUE_FIELDS = `
  id identifier title description priority url
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

/** Offener Blocker: eine „blocks“-Relation, deren Quelle noch nicht abgeschlossen ist. */
export function hasOpenBlockers(issue) {
  return (issue.inverseRelations?.nodes ?? []).some(
    (r) => r.type === "blocks" && !["completed", "canceled"].includes(r.issue?.state?.type),
  );
}

/** Priorität in Linear: 1 dringend … 4 niedrig, 0 = keine (zählt als niedrigste). */
const rank = (p) => (p === 0 || p == null ? 5 : p);

/**
 * Nächstes Issue: Status Todo, keine offenen Blocker, höchste Priorität (dann ältere Nummer zuerst).
 * @returns {{ issue: any, reason: string }}
 */
export function pickNext(issues, maxParallel = MAX_PARALLEL) {
  const running = issues.filter((i) => i.state.type === "started").length;
  if (running >= maxParallel) return { issue: null, reason: `${running} Issues laufen schon (max. ${maxParallel})` };
  const todo = issues
    .filter((i) => i.state.name === "Todo" && !hasOpenBlockers(i))
    .sort((a, b) => rank(a.priority) - rank(b.priority) || numberOf(a) - numberOf(b));
  return todo.length ? { issue: todo[0], reason: "ok" } : { issue: null, reason: "kein Todo ohne offene Blocker" };
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
    "Regeln: AGENTS.md. Lies zuerst docs/PRODUCT.md und docs/DECISIONS.md.",
    `Arbeite auf einem neuen Branch claude/${issue.identifier.toLowerCase()}. Ein PR pro Arbeitspaket, Reparaturen im selben PR.`,
    `PR-Titel als Conventional Commit mit (${issue.identifier}), Body beginnt mit "Part of ${issue.identifier}". Kein Draft, nie selbst mergen.`,
    `Höchstens ${MAX_REPAIR_ROUNDS} Reparatur-Runden. Bei einem Blocker: stoppen und den Blocker im PR beschreiben.`,
  ].join("\n");
}

export async function stateIdByName(teamId, name, call = linear) {
  const data = await call(
    `query($id: String!) { team(id: $id) { states { nodes { id name } } } }`,
    { id: teamId },
  );
  const s = data.team.states.nodes.find((n) => n.name === name);
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
