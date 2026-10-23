import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { belegGate } from "../../../scripts/autonomy/beleg-gate.mjs";

const HEAD = "a".repeat(40);
const beleg = (sha: string, urteil = "ok") => ({ user: "github-actions[bot]", body: `<!-- pruefer-beleg sha=${sha} urteil=${urteil} run=https://x/1 -->` });

test("Test: Ein Lern-App-PR ohne Prüfer-Beleg für den aktuellen Head wird nicht gemergt.", () => {
  assert.equal(belegGate({ branch: "claude/sin-1", headSha: HEAD, comments: [] }).ok, false);
  assert.equal(belegGate({ branch: "codex/x", headSha: HEAD, comments: [beleg("b".repeat(40))] }).ok, false);
  assert.equal(belegGate({ branch: "claude/x", headSha: HEAD, comments: [beleg(HEAD, "fehler")] }).ok, false);
  assert.equal(belegGate({ branch: "claude/x", headSha: HEAD, comments: [{ user: "mensch", body: beleg(HEAD).body }] }).ok, false);
});

test("Beleg für den aktuellen Head lässt durch; andere Branches brauchen keinen", () => {
  assert.equal(belegGate({ branch: "claude/x", headSha: HEAD, comments: [beleg(HEAD)] }).ok, true);
  assert.equal(belegGate({ branch: "dependabot/npm/x", headSha: HEAD, comments: [] }).noetig, false);
});

test("pruefer-anstoss.yml sendet nur den Anstoß: kein checkout von head.sha", () => {
  const yml = readFileSync(".github/workflows/pruefer-anstoss.yml", "utf8");
  assert.ok(!/actions\/checkout/.test(yml));
  assert.ok(!/head\.sha/.test(yml));
  assert.ok(yml.includes("AGENT_WORKFLOW_TOKEN"));
  assert.ok(!/pull_request_target/.test(yml));
});

test("Test: pruefer-anstoss.yml sendet genau das Ereignis, auf das der Leitstand-Prüfer hört (pruefer-anstoss)", () => {
  const yml = readFileSync(".github/workflows/pruefer-anstoss.yml", "utf8");
  assert.match(yml, /event_type=pruefer-anstoss\b/);
});

test("merge-gate in pr-gate.yml verlangt den Beleg", () => {
  assert.ok(readFileSync(".github/workflows/pr-gate.yml", "utf8").includes("beleg-gate.mjs"));
});

const leitstand = (sha: string, urteil = "bestanden", owner = true) => ({
  user: "siinanXD",
  owner,
  body: `<!-- pruefer-zweites-modell -->\n### Prüfer (zweites Modell): ${urteil}\nKeine Funde.\n<!-- pruefer-stand:${sha}:${"c".repeat(16)} -->`,
});

test("Test: Bestandener Leitstand-Prüfer-Kommentar (pruefer-stand, Repo-Owner) für den Head lässt durch.", () => {
  assert.equal(belegGate({ branch: "claude/x", headSha: HEAD, comments: [leitstand(HEAD)] }).ok, true);
  assert.equal(belegGate({ branch: "claude/x", headSha: HEAD, comments: [leitstand(HEAD, "nicht bestanden")] }).ok, false);
  assert.equal(belegGate({ branch: "claude/x", headSha: HEAD, comments: [leitstand("b".repeat(40))] }).ok, false);
  assert.equal(belegGate({ branch: "claude/x", headSha: HEAD, comments: [leitstand(HEAD, "bestanden", false)] }).ok, false);
});
