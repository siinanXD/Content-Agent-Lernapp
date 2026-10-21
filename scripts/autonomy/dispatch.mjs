#!/usr/bin/env node
/**
 * Dispatcher (SIN-223): wählt das nächste Linear-Issue und gibt es für den Workflow aus.
 *
 *   node scripts/autonomy/dispatch.mjs [--dry-run]     wählen (+ In Progress, außer Dry-Run)
 *   node scripts/autonomy/dispatch.mjs --done SIN-123   Linear auf Done (nach Merge)
 *   node scripts/autonomy/dispatch.mjs --blocker SIN-123 "Text"   Blocker-Kommentar
 *   node scripts/autonomy/dispatch.mjs --no-pr SIN-123 [datei]    Worker ohne PR: zurück auf Todo + Grund, zu große Aufträge zerlegen (SIN-291)
 *
 *   node scripts/autonomy/dispatch.mjs --repeat-fail SIN-123 [--runs datei.json]   3 Fehlläufe in 60 Min ohne PR → Pause (SIN-548)
 *   node scripts/autonomy/dispatch.mjs --prompt SIN-123 [--bundle "SIN-124 SIN-125"] [--attempt 2]
 *                                        Prompt, Größe, Modell und Runden-Deckel für den Worker-Lauf (SIN-320)
 *
 * Ausgabe für GitHub Actions: GITHUB_OUTPUT (found, identifiers; beim Worker identifier, prompt).
 * Der Dispatcher wählt nur (bis zu 2, Spuren abwechselnd); jedes Issue läuft in einem eigenen Worker-Lauf.
 * Dry-Run: nur lesen, nichts in Linear ändern. Ohne LINEAR_API_KEY: `--fixture datei.json`.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { main as leitstandEreignis } from "./leitstand.mjs";
import { claudeMayTake, isPaused, parsePausedUntil, pauseUntilFromLog, repeatFailurePause } from "./budget.mjs";
import { MAX_NO_PR, needsHumanComment, noPrComment, noPrStreak, splitIssue, summarizeExecution, tooBig } from "./diagnose.mjs";
import { parsePhase, phaseAllowsIssue } from "./phase.mjs";
import { bundle, bundleEntry, bundlePrompt, maxTurnsFor, modelFor, runSize, sizeOf } from "./sparen.mjs";
import { collectPrStates, waitingIssues } from "./warten.mjs";
import { MAX_HAKEN_STARTS, MAX_PARALLEL, MAX_REPAIR_ROUNDS, findeHakenPause, hakenPauseKommentar, hakenStartKommentar, hakenStreak, updateComment, addLabel, applyDone, pruefeHaken, buildPrompt, comment, createLinearIssues, fetchBacklogIdeas, fetchComments, fetchProjectIssues, fetchRecentIdeaStarts, ideaSlotFree, laneOf, linear, pickMany, reconcile, setState, startOrder } from "./linear.mjs";

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

/** Zuletzt geänderte PRs (offen, gemergt, geschlossen) für den Abgleich mit Linear. */
async function fetchAllPrs() {
  const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token } = process.env;
  if (!repo || !token) return [];
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub-PRs nicht lesbar: ${res.status}`);
  return (await res.json()).map((p) => ({ title: p.title, head: p.head?.ref, state: p.state, merged: Boolean(p.merged_at), body: p.merged_at ? p.body : undefined }));
}

/** Kennungen (SIN-123) der Worker-Läufe, die gerade laufen oder warten (Lauf-Titel „worker SIN-123“, SIN-238). */
async function fetchRunningWorkers() {
  const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token } = process.env;
  if (!repo || !token) return undefined;
  const ids = [];
  for (const status of ["in_progress", "queued"]) {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/worker.yml/runs?status=${status}&per_page=50`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return undefined; // Läufe unbekannt: lieber nichts zurücksetzen
    for (const r of (await res.json()).workflow_runs ?? []) ids.push(...(String(r.display_title ?? "").match(/SIN-\d+/g) ?? []));
  }
  return ids.filter(Boolean);
}

/** Rote Worker-Läufe der letzten Stunde; bei Fehler leer, dann greift nur die Log-Erkennung. */
async function fetchFailedWorkers() {
  const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GH_TOKEN: gh } = process.env;
  const auth = token || gh;
  if (!repo || !auth) return [];
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/worker.yml/runs?status=failure&created=%3E%3D${since}&per_page=100`, {
    headers: { Authorization: `Bearer ${auth}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return [];
  return ((await res.json()).workflow_runs ?? []).map((r) => ({ display_title: r.display_title, created_at: r.created_at }));
}

/**
 * Setzt Linear nach PR- und Worker-Stand (Merge → Done; ohne Merge geschlossen oder seit 15 Min weder Worker noch PR → Todo);
 * gibt die Issues danach zurück.
 */
async function syncWithPrs(issues, prs, dry, runningWorkers) {
  const actions = reconcile(issues, prs, { runningWorkers });
  for (const action of actions) {
    const { issue, to } = action;
    console.log(`${dry ? "[dry-run] " : ""}Abgleich: ${issue.identifier} → ${to === "Offen" ? `bleibt offen (${action.offen.length} Haken ohne Beleg)` : to}`);
    if (to === "Done" || to === "Offen" || to === "In Review") {
      await applyDone(action, { dry });
      if (to === "In Review" && !dry) await setState(issue, to);
    } else if (!dry) await setState(issue, to);
  }
  const target = new Map(actions.map((a) => [a.issue.identifier, a.to]));
  // „Offen“ (SIN-779): fertig gemergt, wartet auf Belege; belegt keinen Platz und wird nicht neu gestartet.
  return issues
    .filter((i) => !["Done", "Offen", "In Review"].includes(target.get(i.identifier)))
    .map((i) => (target.get(i.identifier) === "Todo" ? { ...i, state: { ...i.state, name: "Todo", type: "unstarted" } } : i));
}

async function findByIdentifier(identifier) {
  const issues = await fetchProjectIssues();
  // Eine Idee wechselt erst beim Start vom Backlog nach In Progress (SIN-528): nur dann nachladen.
  const issue = issues.find((i) => i.identifier === identifier) ?? (await fetchBacklogIdeas().catch(() => [])).find((i) => i.identifier === identifier);
  if (!issue) throw new Error(`${identifier} nicht im Projekt gefunden (oder schon abgeschlossen)`);
  return issue;
}

function output(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`);
}

/** Worker-Lauf ohne PR (SIN-291): Issue zurück auf Todo, Kommentar mit Grund, zu große Aufträge zerlegen. */
async function noPrRun(identifier, file, dry) {
  const issue = await findByIdentifier(identifier);
  // SIN-933: Hat ein gemergter PR das Issue schon erledigt, geht es auf Done oder In Review, nie zurück auf Todo.
  const [fertig] = reconcile([{ ...issue, state: { ...issue.state, name: "In Progress" } }], await fetchAllPrs().catch(() => []));
  if (fertig && fertig.to !== "Offen") {
    if (dry) return console.log(`[dry-run] ${issue.identifier} → ${fertig.to} (PR gemergt)`);
    await applyDone(fertig);
    if (fertig.to === "In Review") await setState(issue, "In Review");
    return console.log(`${issue.identifier} → ${fertig.to} (PR gemergt, kein Todo)`);
  }
  const raw = file && existsSync(file) ? readFileSync(file, "utf8") : "";
  const summary = summarizeExecution(raw);
  // Claude-Limit (auch Sofortabbruch ohne Text, SIN-362): kein Fehlversuch des Issues.
  const limit = Boolean(raw && pauseUntilFromLog(raw));
  const text = noPrComment(issue.identifier, summary, { limit });
  const parts = tooBig(summary) ? splitIssue(issue) : [];
  // Zweiter Lauf in Folge ohne PR (SIN-362): `needs-human` statt neuem Start.
  const streak = limit || dry ? 0 : noPrStreak(await fetchComments(issue.id)) + 1;
  if (!limit && !parts.length && streak >= MAX_NO_PR) {
    await comment(issue.id, text);
    await comment(issue.id, needsHumanComment(issue.identifier, summary));
    // Fehlt das Label im Team, muss das Issue trotzdem zurück auf Todo (sonst blockiert es den Platz).
    await addLabel(issue, "needs-human").catch((e) => console.log(`::warning::Label needs-human nicht gesetzt: ${e.message}`));
    await setState(issue, "Todo");
    return console.log(`${issue.identifier} → needs-human (${streak} Läufe ohne PR)`);
  }
  if (dry) return console.log(`[dry-run] ${issue.identifier} → ${parts.length ? `${parts.length} Teil-Issues` : "Todo"}\n${text}`);
  await comment(issue.id, text);
  if (parts.length) {
    try {
      const ids = await createLinearIssues(parts.map((p) => ({ ...p, parentId: issue.id })));
      await comment(issue.id, `Zerlegt in ${ids.join(", ")}. Dieses Issue wird abgebrochen (SIN-291).`);
      await setState(issue, "Canceled");
      return console.log(`${issue.identifier} → Canceled, Teil-Issues ${ids.join(", ")}`);
    } catch (e) {
      console.log(`::warning::Zerlegen fehlgeschlagen (${e.message}), Issue geht zurück auf Todo.`);
    }
  }
  await setState(issue, "Todo");
  return console.log(`${issue.identifier} → Todo (kein PR)`);
}

/**
 * Issues mit offenen Haken, die schon MAX_HAKEN_STARTS-mal mit demselben Stand gestartet wurden, bekommen `needs-human`
 * und einen Grund in loop_events; alle anderen werden gemerkt (Kommentar „Haken-Start“) und gestartet. Fehler beim Lesen: Issue startet.
 * Läuft über die ganze Schlange und hört bei `want` Treffern auf: angehaltene Issues blockieren keinen Platz (SIN-818).
 * @returns {Promise<{ go: any[], skipped: string[] }>}
 */
export async function withoutStalledHaken(queue, want, dry, lese = fetchComments, io = { comment, updateComment, addLabel }) {
  const go = [];
  const skipped = [];
  for (const issue of queue) {
    if (go.length >= want) break;
    const { offen } = pruefeHaken(issue.description);
    if (!offen.length) {
      go.push(issue);
      continue;
    }
    try {
      const comments = await lese(issue.id);
      const streak = hakenStreak(comments, offen);
      if (streak >= MAX_HAKEN_STARTS) {
        const grund = `${issue.identifier}: ${offen.length} Haken seit ${streak} Starts unverändert, Pause (SIN-795)`;
        console.log(`${dry ? "[dry-run] " : ""}${grund}`);
        if (!dry) {
          let labelGesetzt = true;
          await io.addLabel(issue, "needs-human").catch((e) => {
            labelGesetzt = false;
            console.log(`::warning::Label needs-human nicht gesetzt: ${e.message}`);
          });
          // SIN-892: gleicher Stand → bestehenden Pausen-Kommentar bearbeiten, nicht neu schreiben.
          const text = hakenPauseKommentar(issue.identifier, offen, streak, labelGesetzt);
          const alt = findeHakenPause(comments, offen);
          if (alt) await io.updateComment(alt.id, text);
          else await io.comment(issue.id, text);
          await leitstandEreignis(["ereignis", "--schritt", "worker_pause", "--status", "uebersprungen", "--issue", issue.identifier, "--grund", grund]);
        }
        skipped.push(issue.identifier);
        continue;
      }
      if (!dry) await comment(issue.id, hakenStartKommentar(offen));
    } catch (e) {
      console.log(`::warning::Haken-Prüfung für ${issue.identifier} gescheitert: ${e.message}`);
    }
    go.push(issue);
  }
  return { go, skipped };
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
  // Wiederholte Fehlläufe (SIN-548): `--repeat-fail SIN-123 [--runs datei.json]` → until, grund (leer = keine Pause).
  const repeatAt = argv.indexOf("--repeat-fail");
  if (repeatAt >= 0) {
    const runsAt = argv.indexOf("--runs");
    const failed = runsAt >= 0 ? JSON.parse(readFileSync(argv[runsAt + 1], "utf8")) : await fetchFailedWorkers();
    const pause = repeatFailurePause(argv[repeatAt + 1], failed);
    console.log(pause ? `Wiederholter Fehllauf, Pause bis ${pause.until}: ${pause.grund}` : "Keine wiederholten Fehlläufe");
    output("until", pause?.until ?? "");
    output("grund", pause?.grund ?? "");
    return;
  }
  // Prompt für den Worker-Lauf: --prompt SIN-123 → GITHUB_OUTPUT (identifier, prompt).
  const promptAt = argv.indexOf("--prompt");
  if (promptAt >= 0) {
    const issue = await findByIdentifier(argv[promptAt + 1]);
    const arg = (n) => argv[argv.indexOf(n) + 1];
    const rest = [];
    for (const id of argv.includes("--bundle") ? arg("--bundle").split(/[\s+,]+/).filter(Boolean) : []) rest.push(await findByIdentifier(id));
    // Größe, Modell und Runden (SIN-320): klein → Haiku, sonst Sonnet; Versuch 2 immer Sonnet.
    const attempt = Number(argv.includes("--attempt") ? arg("--attempt") : 1) || 1;
    const size = runSize([issue, ...rest]);
    const model = modelFor(size, attempt);
    const turns = maxTurnsFor(size, attempt);
    const retryNote = attempt > 1 ? "\n\nZweiter Versuch (SIN-320): Ein erster Lauf mit einem kleineren Modell hat keinen PR geliefert. Prüfe `git status` und `git log` und setze auf dem vorhandenen Stand fort." : "";
    output("identifier", issue.identifier);
    output("size", size);
    output("model", model);
    output("max_turns", String(turns));
    output("prompt", buildPrompt(issue) + bundlePrompt(issue, rest) + retryNote);
    return console.log(`Prompt für ${[issue, ...rest].map((i) => i.identifier).join(", ")} (Größe ${size}, ${model}, ${turns} Runden)`);
  }
  // Issue zurück auf Todo, wenn Claude es nicht fertig bekam (Limit, Fehler), damit kein Slot blockiert.
  const resetAt = argv.indexOf("--reset");
  if (resetAt >= 0) {
    const issue = await findByIdentifier(argv[resetAt + 1]);
    if (dry) return console.log(`[dry-run] ${issue.identifier} → Todo`);
    await setState(issue, "Todo");
    return console.log(`${issue.identifier} → Todo`);
  }

  // Worker-Lauf ohne PR (SIN-291): Issue sofort zurück auf Todo, Kommentar mit Grund; zu große Aufträge in Teil-Issues.
  // `--no-pr SIN-123 <execution_file>`: die Datei der Action (JSON-Array der Sitzung), darf fehlen.
  const noPrAt = argv.indexOf("--no-pr");
  if (noPrAt >= 0) {
    // SIN-587: Scheitert die Auswertung (Linear, Label, Netz), steht der Grund als Ereignis im Leitstand und der
    // Schritt bleibt grün; die Sicherung gegen Wiederholung (--repeat-fail) hängt nicht davon ab.
    try {
      return await noPrRun(argv[noPrAt + 1], argv[noPrAt + 2], dry);
    } catch (e) {
      const grund = `Fehler auswerten gescheitert: ${e.message}`;
      console.log(`::warning::${grund}`);
      return leitstandEreignis(["ereignis", "--schritt", "worker", "--status", "fehler", "--issue", argv[noPrAt + 1], "--grund", grund]);
    }
  }

  const doneAt = argv.indexOf("--done");
  if (doneAt >= 0) {
    // Schon erledigte Issues (z. B. durch den Abgleich) sind kein Fehler: der Lauf nach dem Merge soll grün bleiben.
    const issue = await findByIdentifier(argv[doneAt + 1]).catch((e) => {
      console.log(e.message);
      return null;
    });
    if (!issue) return;
    // SIN-779: Done nur, wenn alle Haken belegt sind; Belege = `- [x]`-Zeilen im PR-Text (Datei oder Umgebung `PR_BODY`).
    const bodyAt = argv.indexOf("--body");
    const body = bodyAt >= 0 ? readFileSync(argv[bodyAt + 1], "utf8") : process.env.PR_BODY;
    const { offen, description } = pruefeHaken(issue.description, [body]);
    const erledigt = await applyDone({ issue, offen, description }, { dry });
    return console.log(`${issue.identifier} → ${dry ? "[dry-run] " : ""}${erledigt ? "Done" : `bleibt offen (${offen.length} Haken ohne Beleg)`}`);
  }

  const blockerAt = argv.indexOf("--blocker");
  if (blockerAt >= 0) {
    const issue = await findByIdentifier(argv[blockerAt + 1]);
    const text = `Blocker nach ${MAX_REPAIR_ROUNDS} Reparatur-Runden: ${argv[blockerAt + 2] ?? "siehe PR"}`;
    if (dry) return console.log(`[dry-run] Kommentar an ${issue.identifier}: ${text}`);
    await comment(issue.id, text);
    return console.log(`Blocker-Kommentar an ${issue.identifier}`);
  }

  const fetched =
    fixtureAt >= 0
      ? JSON.parse(readFileSync(argv[fixtureAt + 1], "utf8"))
      : await fetchProjectIssues(linear);
  // Erst abgleichen, dann Slots zählen (auch bei Pause): gemergte PRs geben ihren Slot frei.
  const issues = await syncWithPrs(
    fetched,
    fixtureAt >= 0 ? [] : await fetchAllPrs(),
    dry,
    fixtureAt >= 0 ? undefined : await fetchRunningWorkers(),
  );
  // Budget: nicht pausiert; Cursor-Wartezeit nur mit CURSOR_GRACE_MIN (SIN-420); höchstens 2 parallel (pickNext).
  if (isPaused(process.env.AGENT_PAUSED_UNTIL)) {
    console.log(`Nichts zu starten: pausiert bis ${parsePausedUntil(process.env.AGENT_PAUSED_UNTIL).toISOString()}`);
    output("found", "false");
    return;
  }
  const openPrs = fixtureAt >= 0 ? [] : await fetchOpenPrs();
  // Phase (SIN-244): im Betrieb nur bug, security, content und der letzte Wochenplan.
  const phase = parsePhase(process.env.PHASE);
  const may = (i) => phaseAllowsIssue(phase, i) && claudeMayTake(i, { openPrs });
  // Wartende PRs (SIN-327): das Issue bleibt „In Progress“, belegt aber keinen Platz.
  const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token } = process.env;
  const running = fixtureAt >= 0 ? undefined : await fetchRunningWorkers();
  // Ohne bekannte Worker-Läufe oder PR-Stand lieber nichts freigeben.
  const prStates = fixtureAt >= 0 || !repo || !token || !running ? [] : await collectPrStates(repo, token).catch(() => []);
  const waiting = running === undefined ? new Map() : waitingIssues(issues, prStates, running);
  for (const [id, w] of waiting) console.log(`${id} wartet (${w.pr ? `PR #${w.pr}: ` : ""}${w.reason}), belegt keinen Platz`);
  // Ideen (SIN-528): Backlog-Ideen sind Kandidaten, aber höchstens eine je Woche und erst nach allen v1-Issues.
  // Ist der Wochenstand unlesbar, startet keine Idee.
  const backlogIdeas = fixtureAt >= 0 ? [] : await fetchBacklogIdeas().catch(() => []);
  const ideaSlot = fixtureAt >= 0 ? true : await fetchRecentIdeaStarts().then((t) => ideaSlotFree(t), () => false);
  const queue = [...issues, ...backlogIdeas];
  const order = { ideaSlot };
  const { issues: candidates, reason, want } = pickMany(queue, MAX_PARALLEL, may, new Set(waiting.keys()), order);
  // SIN-795: Derselbe Haken-Stand höchstens MAX_HAKEN_STARTS-mal ohne Fortschritt; danach Pause mit Grund.
  // SIN-818: Der Filter läuft über die ganze Schlange, angehaltene Issues lassen die nächsten nachrücken.
  const { go: picked, skipped } = fixtureAt >= 0 || !candidates.length ? { go: candidates, skipped: [] } : await withoutStalledHaken(startOrder(queue, may, order), want, dry);
  if (skipped.length) console.log(`Übersprungen (Haken-Pause): ${skipped.join(", ")}`);
  if (!picked.length) {
    console.log(`Nichts zu starten: ${reason}${skipped.length ? `; angehalten: ${skipped.join(", ")}` : ""}`);
    output("found", "false");
    return;
  }
  // Kleinkram desselben Bereichs läuft als ein Lauf mit einem PR (SIN-320).
  const runs = bundle(picked, startOrder(queue, may, order), laneOf);
  for (const { lead, rest } of runs) {
    for (const issue of [lead, ...rest]) {
      console.log(`${dry ? "[dry-run] " : ""}Nächstes Issue: ${issue.identifier} (${issue.title}), Spur ${laneOf(issue)}, Größe ${sizeOf(issue)}, Priorität ${issue.priority}${issue === lead ? "" : ` (gebündelt mit ${lead.identifier})`}`);
      if (!dry) await setState(issue, "In Progress");
    }
    if (dry) console.log(`\n${buildPrompt(lead)}${bundlePrompt(lead, rest)}\n`);
  }
  // Der Workflow startet je Kennung einen eigenen Worker-Lauf (worker.yml, SIN-227).
  output("found", "true");
  output("identifiers", runs.map(bundleEntry).join(" "));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
