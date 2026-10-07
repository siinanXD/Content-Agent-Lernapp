import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPrompt } from "../../../scripts/autonomy/linear.mjs";
import { liveText, parseArgs } from "../../../scripts/autonomy/live.mjs";

test("liveText: gestartet, fertig mit PR-Link, gescheitert mit Grund", () => {
  assert.equal(liveText("gestartet", { run: "https://x/run/1" }), "Worker gestartet ([Lauf](https://x/run/1)).");
  assert.match(liveText("fertig", { pr: "https://x/pull/2" }), /^Worker fertig: https:\/\/x\/pull\/2/);
  assert.match(liveText("gescheitert", { text: "max-turns" }), /gescheitert: max-turns/);
  assert.match(liveText("gescheitert"), /ohne PR beendet/);
});

test("liveText: leerer Text und unbekannte Art ergeben keinen Kommentar", () => {
  assert.equal(liveText("fortschritt", { text: "" }), "");
  assert.equal(liveText("unbekannt", { text: "x" }), "");
});

test("parseArgs trennt Text von Flags", () => {
  const a = parseArgs(["fertig", "SIN-1", "--pr", "https://x/pull/2", "--run", "https://x/run/1"]);
  assert.deepEqual(a, { kind: "fertig", identifier: "SIN-1", text: "", pr: "https://x/pull/2", run: "https://x/run/1" });
  assert.equal(parseArgs(["frage", "SIN-1", "Welche", "Quelle?"]).text, "Welche Quelle?");
});

test("Prompt verlangt Live-Updates und Reparatur vor dem Push; Worker darf das Skript aufrufen", () => {
  const p = buildPrompt({ identifier: "SIN-9", title: "T", description: "d" });
  assert.match(p, /live\.mjs fortschritt SIN-9/);
  assert.match(p, /live\.mjs frage SIN-9/);
  assert.match(p, /selbst beheben/);
  const wf = readFileSync(".github/workflows/worker.yml", "utf8");
  assert.match(wf, /Bash\(node scripts\/autonomy\/live\.mjs:\*\)/);
  assert.match(wf, /cache: npm/);
});
