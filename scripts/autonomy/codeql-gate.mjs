/**
 * CodeQL-Tor (SIN-295): liest die SARIF-Dateien eines Ordners und scheitert bei Funden hoher Schwere.
 * Hoch heißt: `security-severity` >= 7.0 (GitHubs Stufen "high" und "critical"); ohne Zahl zählt Level `error`.
 * Aufruf: node scripts/autonomy/codeql-gate.mjs <Ordner>
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const HIGH_SEVERITY = 7.0;

/** @returns {{ rule: string, severity: number | null, message: string, file: string, line: number }[]} */
export function highFindings(sarif) {
  const out = [];
  for (const run of sarif.runs ?? []) {
    const driverRules = run.tool?.driver?.rules ?? [];
    const extensionRules = (run.tool?.extensions ?? []).flatMap((e) => e.rules ?? []);
    const rules = new Map([...driverRules, ...extensionRules].map((r) => [r.id, r]));
    for (const res of run.results ?? []) {
      const rule = rules.get(res.ruleId) ?? {};
      const raw = rule.properties?.["security-severity"];
      const score = raw === undefined ? NaN : Number(raw);
      const level = res.level ?? rule.defaultConfiguration?.level;
      const high = Number.isFinite(score) ? score >= HIGH_SEVERITY : level === "error";
      if (!high) continue;
      const loc = res.locations?.[0]?.physicalLocation;
      out.push({
        rule: res.ruleId ?? "?",
        severity: Number.isFinite(score) ? score : null,
        message: res.message?.text ?? "",
        file: loc?.artifactLocation?.uri ?? "?",
        line: loc?.region?.startLine ?? 1,
      });
    }
  }
  return out;
}

function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("Ordner mit SARIF-Dateien fehlt.");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sarif"));
  if (files.length === 0) throw new Error(`Keine SARIF-Datei in ${dir}.`);
  const findings = files.flatMap((f) => highFindings(JSON.parse(readFileSync(join(dir, f), "utf8"))));
  for (const f of findings) {
    console.log(`::error file=${f.file},line=${f.line}::${f.rule} (${f.severity ?? "error"}): ${f.message}`);
  }
  console.log(`CodeQL: ${findings.length} Fund(e) hoher Schwere in ${files.length} Datei(en).`);
  if (findings.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
