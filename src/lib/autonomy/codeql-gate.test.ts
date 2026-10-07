import assert from "node:assert/strict";
import { test } from "node:test";
import { highFindings, splitFindings } from "../../../scripts/autonomy/codeql-gate.mjs";

const result = (ruleId: string, extra: Record<string, unknown> = {}) => ({
  ruleId,
  message: { text: "Fund" },
  locations: [{ physicalLocation: { artifactLocation: { uri: "src/a.ts" }, region: { startLine: 4 } } }],
  ...extra,
});

const sarif = (rules: unknown[], results: unknown[]) => ({ runs: [{ tool: { driver: { rules } }, results }] });

test("CodeQL-Tor: ab 7.0 blockiert, darunter nicht", () => {
  const rules = [
    { id: "js/high", properties: { "security-severity": "8.8" } },
    { id: "js/edge", properties: { "security-severity": "7.0" } },
    { id: "js/medium", properties: { "security-severity": "6.9" } },
  ];
  const found = highFindings(sarif(rules, [result("js/high"), result("js/edge"), result("js/medium")]));
  assert.deepEqual(found.map((f: { rule: string }) => f.rule), ["js/high", "js/edge"]);
  assert.equal(found[0].file, "src/a.ts");
  assert.equal(found[0].line, 4);
});

test("CodeQL-Tor: ohne Zahl entscheidet das Level, Hinweise bleiben frei", () => {
  const rules = [{ id: "js/err" }, { id: "js/warn" }];
  const found = highFindings(sarif(rules, [result("js/err", { level: "error" }), result("js/warn", { level: "warning" })]));
  assert.deepEqual(found.map((f: { rule: string }) => f.rule), ["js/err"]);
  assert.deepEqual(highFindings({}), []);
});

test("CodeQL-Tor im PR: nur Funde in geänderten Dateien blockieren, Altfunde nicht", () => {
  const found = [
    { rule: "a", file: "src/a.ts", line: 1 },
    { rule: "b", file: "src/b.ts", line: 2 },
  ];
  const { blocking, legacy } = splitFindings(found, ["src/a.ts"]);
  assert.deepEqual(blocking.map((f: { rule: string }) => f.rule), ["a"]);
  assert.deepEqual(legacy.map((f: { rule: string }) => f.rule), ["b"]);
  assert.equal(splitFindings(found, undefined).blocking.length, 2);
});
