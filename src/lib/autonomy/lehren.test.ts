import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPrompt } from "../../../scripts/autonomy/linear.mjs";
import { abortReason, appendProtocolLink, protocolFromExecution, renderProtocol } from "../../../scripts/autonomy/protokoll.mjs";
import { buildSteckbrief } from "../../../scripts/autonomy/steckbrief.mjs";

const execution = JSON.stringify([
  {
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", id: "a", name: "Read", input: { file_path: "/home/runner/work/x/x/docs/LANDKARTE.md" } },
        { type: "tool_use", id: "b", name: "Read", input: { file_path: "/home/runner/work/x/x/docs/LANDKARTE.md" } },
        { type: "tool_use", id: "c", name: "Edit", input: { file_path: "/home/runner/work/x/x/docs/autonomy/LEHREN.md" } },
        { type: "tool_use", id: "d", name: "Write", input: { file_path: "/home/runner/work/x/x/docs/decisions/SIN-1-x.md" } },
        { type: "tool_use", id: "e", name: "Write", input: { file_path: "/home/runner/work/x/x/src/lib/a.ts" } },
        { type: "tool_use", id: "f", name: "Bash", input: { command: "npm run typecheck && echo fertig" } },
        { type: "tool_use", id: "g", name: "Bash", input: { command: "npm test" } },
        { type: "tool_use", id: "h", name: "Bash", input: { command: "ls" } },
      ],
    },
  },
  {
    type: "user",
    message: {
      content: [
        { type: "tool_result", tool_use_id: "f", is_error: false },
        { type: "tool_result", tool_use_id: "g", is_error: true },
      ],
    },
  },
  { type: "result", subtype: "error_max_turns", num_turns: 30, result: "" },
]);

test("Laufprotokoll: gelesene Dateien, Entscheidungen und Prüfungen aus dem Log", () => {
  const p = protocolFromExecution(execution);
  assert.deepEqual(p.read, ["docs/LANDKARTE.md"]);
  assert.deepEqual(p.decisions, ["docs/autonomy/LEHREN.md", "docs/decisions/SIN-1-x.md"]);
  assert.deepEqual(p.checks, [
    { cmd: "npm run typecheck", ok: true },
    { cmd: "npm test", ok: false },
  ]);
  assert.equal(p.subtype, "error_max_turns");
  assert.match(abortReason(p), /Runden-Deckel/);
  const md = renderProtocol({ identifiers: "SIN-1", run: "42", runs: [{ label: "Worker", p }] });
  assert.match(md, /Gelesene Dateien \(1\)/);
  assert.match(md, /npm test → Fehler/);
  assert.match(md, /1 rot/);
});

test("Laufprotokoll: unlesbares Log kippt nichts", () => {
  const p = protocolFromExecution("kein json");
  assert.equal(p.read.length, 0);
  assert.match(abortReason(p), /unbekannt/);
  assert.equal(abortReason({ ...p, subtype: "success" }), "keiner");
  assert.match(renderProtocol({ runs: [{ label: "Worker", p }] }), /Abbruchgrund/);
});

test("Protokoll-Link: unter eigener Überschrift, je Lauf einmal", () => {
  const once = appendProtocolLink("Part of SIN-1\n", { link: "https://x/y", run: "7" });
  assert.match(once, /## Laufprotokoll\n- \[Worker: Laufprotokoll/);
  assert.equal(appendProtocolLink(once, { link: "https://x/y", run: "7" }), once);
  assert.equal(appendProtocolLink(once, { link: "https://x/z", run: "8" }).match(/Laufprotokoll \(Artefakt/g)?.length, 2);
});

test("Steckbrief zeigt Protokoll-Link und neue Skills (SIN-296)", () => {
  const body = "Part of SIN-1\n\n## Was ändert sich\nEtwas.\n\n## Neue Skills\n- migration-mit-rls: Migration mit RLS\n\n## Laufprotokoll\n- [Worker: Laufprotokoll](https://x/y)\n";
  const sb = buildSteckbrief({ title: "feat(x): y (SIN-1)", branch: "claude/sin-1", body, risk: "risk:medium", reasons: [], approved: false });
  assert.match(sb.body, /\*\*Laufprotokoll:\*\*\n- \[Worker: Laufprotokoll\]\(https:\/\/x\/y\)/);
  assert.match(sb.body, /\*\*Neue Skills:\*\*\n- migration-mit-rls/);
});

test("Worker-Prompt verweist auf Lehren-Datei und Skills", () => {
  const p = buildPrompt({ identifier: "SIN-9", title: "T", description: "d" });
  assert.match(p, /docs\/autonomy\/LEHREN\.md/);
  assert.match(p, /docs\/skills\/<name>\/SKILL\.md/);
  assert.match(p, /## Neue Skills/);
});

test("Lehren-Datei: Startinhalt, höchstens 150 Zeilen, keine doppelten Zeilen, in AGENTS.md verlinkt", () => {
  const text = readFileSync("docs/autonomy/LEHREN.md", "utf8");
  const lines = text.split("\n");
  assert.ok(lines.length <= 150, `${lines.length} Zeilen`);
  assert.match(text, /getOctokit/);
  for (const topic of ["Rechte", "Bot-Starts", "Merge-Kette", "Dedup", "Vercel", "Linear"]) assert.match(text, new RegExp(topic));
  const items = lines.filter((l) => l.startsWith("- "));
  assert.equal(new Set(items).size, items.length);
  assert.match(readFileSync("AGENTS.md", "utf8"), /docs\/autonomy\/LEHREN\.md/);
});
