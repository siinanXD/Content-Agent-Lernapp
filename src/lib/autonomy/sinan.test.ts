import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildDigest, needsYou } from "../../../scripts/autonomy/digest.mjs";
import { isHumanIssue } from "../../../scripts/autonomy/linear.mjs";
import {
  CHECK_FILES,
  SEED,
  buildSinanBody,
  createSinanIssues,
  evaluateCheck,
  parseSinanBody,
  readCheckFiles,
  renderSinan,
  sinanLine,
  sortSinan,
  syncSinan,
} from "../../../scripts/autonomy/sinan.mjs";
import { analyze } from "../../../scripts/autonomy/status.mjs";

const NOW = new Date("2026-10-07T08:00:00Z");
const files = () => readCheckFiles((f: string) => readFileSync(f, "utf8")) as Record<string, string>;
type Vars = { id?: string; s?: string; i?: Record<string, string | number | string[]> };
const issueOf = (n: number, t: (typeof SEED)[number], extra: object = {}) => ({
  id: `id-${n}`,
  identifier: `SIN-${n}`,
  title: t.titel,
  description: buildSinanBody(t),
  url: `https://linear.app/x/issue/SIN-${n}`,
  dueDate: t.faellig ?? null,
  team: { id: "team" },
  state: { name: "Todo", type: "unstarted" },
  labels: { nodes: [{ name: "sinan" }] },
  ...extra,
});

test("Beschreibung hat den festen Block und lässt sich zurücklesen", () => {
  for (const t of SEED) {
    const body = buildSinanBody(t);
    for (const k of ["wo", "link", "minuten", "schritte", "pruefung"]) assert.match(body, new RegExp(`^\\*\\*${k}:\\*\\*`, "m"), `${t.titel}: ${k}`);
    assert.match(body, /^1\. /m);
    const parsed = parseSinanBody(body);
    assert.equal(parsed.minuten, t.minuten);
    assert.equal(parsed.link, t.link);
    assert.deepEqual(parsed.check, t.check ?? null);
    assert.match(t.link, /^https:\/\//);
  }
  assert.deepEqual(parseSinanBody("ohne Block"), { link: null, minuten: null, check: null });
});

test("Standard-Aufgaben: alle offenen Anweisungen aus SIN-310 sind da, Token-Issue fällig am 20.12.2026", () => {
  const titles = SEED.map((t) => t.titel.toLowerCase()).join("\n");
  for (const re of [/cron-job\.org/, /wiederherstellung/, /stichprobe/, /av-verträge/, /impressum/, /datenschutz/, /pro umstellen/, /github-tokens erneuern/]) assert.match(titles, re);
  const tokens = SEED.find((t) => /GitHub-Tokens/.test(t.titel))!;
  assert.equal(tokens.faellig, "2026-12-20");
  assert.equal(tokens.link, "https://github.com/settings/personal-access-tokens");
  assert.ok(new Set(SEED.map((t) => t.titel)).size === SEED.length);
});

test("sinan-Issues bekommt der Dispatcher nie", () => {
  assert.equal(isHumanIssue(issueOf(1, SEED[0])), true);
});

test("Prüfungen: Checkliste, Token-Datum, entfernter Hinweis", () => {
  const f = files();
  const av = SEED.find((t) => /AV-Verträge/.test(t.titel))!.check;
  assert.equal(evaluateCheck(av, { files: f }).done, false, "im Repo noch offen");
  const done = { ...f, "docs/legal/checkliste-demo-zugang.md": f["docs/legal/checkliste-demo-zugang.md"].replaceAll("- [ ] AV-Vertrag", "- [x] AV-Vertrag") };
  assert.equal(evaluateCheck(av, { files: done }).done, true);
  assert.equal(evaluateCheck(av, { files: {} }).done, false, "Datei nicht lesbar: nicht erledigt");

  const tokens = SEED.find((t) => /GitHub-Tokens/.test(t.titel))!.check;
  assert.equal(evaluateCheck(tokens, { files: f }).done, false, "läuft Anfang Januar ab");
  const renewed = { ...f, "docs/autonomy/tokens.md": f["docs/autonomy/tokens.md"].replaceAll("03.01.2027", "20.03.2027") };
  assert.equal(evaluateCheck(tokens, { files: renewed }).done, true);
  const partly = { ...f, "docs/autonomy/tokens.md": f["docs/autonomy/tokens.md"].replace("| agent-workflows | Secret `AGENT_WORKFLOW_TOKEN` (GitHub, Infisical) | 03.01.2027", "| agent-workflows | Secret `AGENT_WORKFLOW_TOKEN` (GitHub, Infisical) | 20.03.2027") };
  assert.equal(evaluateCheck(tokens, { files: partly }).done, false, "ein Token fehlt noch");

  const restore = SEED.find((t) => /Wiederherstellung/.test(t.titel))!.check;
  assert.equal(evaluateCheck(restore, { files: f }).done, false);
  assert.equal(evaluateCheck(restore, { files: { "docs/ops/BACKUP.md": "kein Hinweis mehr" } }).done, true);
  assert.equal(evaluateCheck(undefined, { files: f }).done, false);
  assert.ok(CHECK_FILES.every((x) => f[x] != null));
});

test("Anlegen: Label sinan, Fälligkeit, kein Duplikat (auch nicht, wenn schon erledigt)", async () => {
  const calls: { q: string; v: Vars }[] = [];
  let n = 100;
  const call = async (q: string, v: Vars) => {
    calls.push({ q, v });
    if (q.includes("projects(")) return { projects: { nodes: [{ id: "p", teams: { nodes: [{ id: "t" }] } }] } };
    if (q.includes("states")) return { team: { states: { nodes: [{ id: "todo", name: "Todo" }] } } };
    if (q.includes("issueLabels")) return { issueLabels: { nodes: [{ id: "label-sinan" }] } };
    n += 1;
    return { issueCreate: { issue: { identifier: `SIN-${n}`, url: `u${n}` } } };
  };
  const existing = [{ title: SEED[0].titel.toUpperCase() }];
  const created = await createSinanIssues(SEED, existing as never[], call as never);
  assert.equal(created.length, SEED.length - 1);
  const inputs = calls.filter((c) => c.q.includes("issueCreate")).map((c) => c.v.i!);
  assert.ok(inputs.every((i) => (i.labelIds as string[]).length === 1 && (i.labelIds as string[])[0] === "label-sinan" && i.priority === 3));
  assert.equal(inputs.find((i) => /GitHub-Tokens/.test(String(i.title)))?.dueDate, "2026-12-20");
  assert.equal(inputs.some((i) => i.title === SEED[0].titel), false);
  assert.deepEqual(await createSinanIssues(SEED, SEED.map((t) => ({ title: t.titel })) as never[], call as never), []);
});

test("Sync: legt fehlende an und schließt erledigte mit Kommentar; offene bleiben", async () => {
  const impressum = SEED.find((t) => /Impressum/.test(t.titel))!;
  const other = SEED.find((t) => /cron-job/.test(t.titel))!;
  const rest = SEED.filter((t) => t !== impressum && t !== other);
  const open = [issueOf(1, impressum), issueOf(2, other), ...rest.map((t, i) => issueOf(10 + i, t))];
  const writes: string[] = [];
  const call = async (q: string, v: Vars) => {
    if (q.includes("labels: {")) return { issues: { nodes: open } };
    if (q.includes("states")) return { team: { states: { nodes: [{ id: "done", name: "Done" }] } } };
    if (q.includes("commentCreate")) writes.push(`comment:${v.id}`);
    if (q.includes("issueUpdate")) writes.push(`state:${v.id}:${v.s}`);
    return {};
  };
  const f = files();
  f["docs/legal/checkliste-demo-zugang.md"] = f["docs/legal/checkliste-demo-zugang.md"].replace("- [ ] Impressum ausgefüllt", "- [x] Impressum ausgefüllt");
  const res = await syncSinan({ call: call as never, files: f });
  assert.deepEqual(res.created, []);
  assert.deepEqual(res.closed.map((c) => c.identifier), ["SIN-1"]);
  assert.deepEqual(writes, ["comment:id-1", "state:id-1:done"]);
  assert.equal(res.open.some((i) => i.identifier === "SIN-1"), false);
  assert.equal(res.open.some((i) => i.identifier === "SIN-2"), true, "ohne Prüfung bleibt es offen");

  writes.length = 0;
  const dry = await syncSinan({ call: call as never, files: f, dry: true });
  assert.equal(dry.closed.length, 1);
  assert.deepEqual(writes, [], "Trockenlauf schreibt nichts");
});

test("Anzeige: früh Fälliges zuerst, Link und Minuten in Update und Status-Seite", () => {
  const issues = SEED.map((t, i) => issueOf(20 + i, t));
  const sorted = sortSinan(issues);
  assert.match(sorted[0].title, /GitHub-Tokens/);
  assert.match(sinanLine(sorted[0]), /^SIN-\d+ GitHub-Tokens erneuern \(20 Min, fällig 20\.12\.\) https:\/\/linear\.app/);
  assert.match(renderSinan(issues), /- \[SIN-27\]\(https:\/\/linear\.app\/x\/issue\/SIN-27\) GitHub-Tokens erneuern, 20 Min, fällig 20\.12\./);
  assert.match(renderSinan([]), /Keine offenen Aufgaben/);

  const need = needsYou({ sinan: issues, legalOpen: ["a"], now: NOW });
  assert.equal(need.length, SEED.length, "Rechts-Sammelhinweis entfällt, wenn die Aufgaben als Issues da sind");
  assert.ok(need.every((n: string) => n.startsWith("Sinan SIN-")));

  const { text } = buildDigest({ now: NOW.toISOString(), slot: "morgen", issues: [], openPrs: [], mergedPrs: [], decisions: [], sinanIssues: issues });
  const block = text.split("**Braucht dich**\n")[1].split("\n\n")[0].split("\n");
  assert.equal(block.length, 6, "5 Aufgaben und „… und 3 weitere“");
  assert.match(block[0], /^- Sinan SIN-27 GitHub-Tokens erneuern \(20 Min, fällig 20\.12\.\)/);
  assert.equal(block[5], "… und 3 weitere");

  const fixture = JSON.parse(readFileSync("docs/autonomy/fixture-status.json", "utf8"));
  const limits = JSON.parse(readFileSync("docs/autonomy/free-tier-limits.json", "utf8"));
  const body = analyze({ ...fixture, sinanIssues: issues }, limits, {}).body;
  assert.match(body, /## Braucht dich[\s\S]*Aufgaben mit Label `sinan`[\s\S]*\[SIN-27\]/);
});
