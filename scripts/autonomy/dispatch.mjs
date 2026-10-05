#!/usr/bin/env node
/**
 * Dispatcher (SIN-223): wählt das nächste Linear-Issue und gibt es für den Workflow aus.
 *
 *   node scripts/autonomy/dispatch.mjs [--dry-run]     wählen (+ In Progress, außer Dry-Run)
 *   node scripts/autonomy/dispatch.mjs --done SIN-123   Linear auf Done (nach Merge)
 *   node scripts/autonomy/dispatch.mjs --blocker SIN-123 "Text"   Blocker-Kommentar
 *
 * Ausgabe für GitHub Actions: GITHUB_OUTPUT (found, identifier, prompt).
 * Dry-Run: nur lesen, nichts in Linear ändern. Ohne LINEAR_API_KEY: `--fixture datei.json`.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { claudeMayTake, isPaused, parsePausedUntil, pauseUntilFromLog } from "./budget.mjs";
import { MAX_REPAIR_ROUNDS, buildPrompt, comment, fetchProjectIssues, linear, pickNext, setState } from "./linear.mjs";

/** Offene PRs (Titel, Branch), damit Claude kein Issue übernimmt, an dem schon jemand arbeitet. */
async function fetchOpenPrs() {
  const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token } = process.env;
  if (!repo || !token) return [];
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub-PRs nicht lesbar: ${res.status}`);
  return (await res.json()).map((p) => ({ title: p.title, head: p.head?.ref }));
}

async function findByIdentifier(identifier) {
  const issues = await fetchProjectIssues();
  const issue = issues.find((i) => i.identifier === identifier);
  if (!issue) throw new Error(`${identifier} nicht im Projekt gefunden (oder schon abgeschlossen)`);
  return issue;
}

function output(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`);
}

export async function main(argv) {
  const dry = argv.includes("--dry-run");
  const fixtureAt = argv.indexOf("--fixture");

  // Pause bis zum Claude-Reset (Repo-Variable AGENT_PAUSED_UNTIL, Wert kommt aus `vars`).
  if (argv.includes("--check-pause")) {
    const paused = isPaused(process.env.AGENT_PAUSED_UNTIL);
    const until = parsePausedUntil(process.env.AGENT_PAUSED_UNTIL)?.toISOString() ?? "";
    console.log(paused ? `Pausiert bis ${until}` : "Nicht pausiert");
    output("paused", String(paused));
    return;
  }
  // Limit-Meldung aus dem Claude-Log lesen → ISO-Zeit für AGENT_PAUSED_UNTIL (leer = kein Limit).
  const limitAt = argv.indexOf("--limit-from-log");
  if (limitAt >= 0) {
    const until = pauseUntilFromLog(readFileSync(argv[limitAt + 1], "utf8")) ?? "";
    console.log(until ? `Claude-Limit, Pause bis ${until}` : "Kein Limit erkannt");
    output("until", until);
    return;
  }
  // Issue zurück auf Todo, wenn Claude es nicht fertig bekam (Limit, Fehler), damit kein Slot blockiert.
  const resetAt = argv.indexOf("--reset");
  if (resetAt >= 0) {
    const issue = await findByIdentifier(argv[resetAt + 1]);
    if (dry) return console.log(`[dry-run] ${issue.identifier} → Todo`);
    await setState(issue, "Todo");
    return console.log(`${issue.identifier} → Todo`);
  }

  const doneAt = argv.indexOf("--done");
  if (doneAt >= 0) {
    const issue = await findByIdentifier(argv[doneAt + 1]);
    if (dry) return console.log(`[dry-run] ${issue.identifier} → Done`);
    await setState(issue, "Done");
    return console.log(`${issue.identifier} → Done`);
  }

  const blockerAt = argv.indexOf("--blocker");
  if (blockerAt >= 0) {
    const issue = await findByIdentifier(argv[blockerAt + 1]);
    const text = `Blocker nach ${MAX_REPAIR_ROUNDS} Reparatur-Runden: ${argv[blockerAt + 2] ?? "siehe PR"}`;
    if (dry) return console.log(`[dry-run] Kommentar an ${issue.identifier}: ${text}`);
    await comment(issue.id, text);
    return console.log(`Blocker-Kommentar an ${issue.identifier}`);
  }

  const issues =
    fixtureAt >= 0
      ? JSON.parse(readFileSync(argv[fixtureAt + 1], "utf8"))
      : await fetchProjectIssues(linear);
  // Budget: nicht pausiert; Cursor hat zuerst Vorrang; höchstens 2 parallel (pickNext).
  if (isPaused(process.env.AGENT_PAUSED_UNTIL)) {
    console.log(`Nichts zu starten: pausiert bis ${parsePausedUntil(process.env.AGENT_PAUSED_UNTIL).toISOString()}`);
    output("found", "false");
    return;
  }
  const openPrs = fixtureAt >= 0 ? [] : await fetchOpenPrs();
  const { issue, reason } = pickNext(issues, undefined, (i) => claudeMayTake(i, { openPrs }));
  if (!issue) {
    console.log(`Nichts zu starten: ${reason}`);
    output("found", "false");
    return;
  }
  const prompt = buildPrompt(issue);
  console.log(`${dry ? "[dry-run] " : ""}Nächstes Issue: ${issue.identifier} (${issue.title}), Priorität ${issue.priority}`);
  if (dry) console.log(`\n${prompt}`);
  else await setState(issue, "In Progress");
  output("found", "true");
  output("identifier", issue.identifier);
  output("prompt", prompt);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
