/**
 * CodeQL-Tor (SIN-295): liest die SARIF-Dateien eines Ordners und scheitert bei Funden hoher Schwere.
 * Hoch heißt: `security-severity` >= 7.0 (GitHubs Stufen "high" und "critical"); ohne Zahl zählt Level `error`.
 * Im Pull Request blockieren nur neue Funde (SIN-322): `--changed <Datei>` mit den geänderten Pfaden, Altfunde sind Warnungen.
 * Aufruf: node scripts/autonomy/codeql-gate.mjs <Ordner> [--changed <Datei>]
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

/**
 * Teilt Funde in blockierende und Altfunde. Ohne `changed` (Push auf main, Zeitplan) blockiert jeder Fund;
 * mit `changed` (Pull Request) blockieren nur Funde in geänderten Dateien, alle anderen sind Altfunde (Warnung).
 */
export function splitFindings(findings, changed) {
  if (!changed) return { blocking: findings, legacy: [] };
  const set = new Set(changed);
  return { blocking: findings.filter((f) => set.has(f.file)), legacy: findings.filter((f) => !set.has(f.file)) };
}

function main() {
  const args = process.argv.slice(2);
  const ci = args.indexOf("--changed");
  const changedFile = ci === -1 ? undefined : args.splice(ci, 2)[1];
  const dir = args[0];
  if (!dir) throw new Error("Ordner mit SARIF-Dateien fehlt.");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sarif"));
  if (files.length === 0) throw new Error(`Keine SARIF-Datei in ${dir}.`);
  const findings = files.flatMap((f) => highFindings(JSON.parse(readFileSync(join(dir, f), "utf8"))));
  const changed = changedFile ? readFileSync(changedFile, "utf8").split("\n").map((l) => l.trim()).filter(Boolean) : undefined;
  const { blocking, legacy } = splitFindings(findings, changed);
  for (const f of blocking) console.log(`::error file=${f.file},line=${f.line}::${f.rule} (${f.severity ?? "error"}): ${f.message}`);
  for (const f of legacy) console.log(`::warning file=${f.file},line=${f.line}::Altfund ${f.rule} (${f.severity ?? "error"}): ${f.message}`);
  const sources = new Set(findings.map((f) => f.file)).size;
  console.log(`CodeQL: ${blocking.length} neue Fund(e) hoher Schwere, ${legacy.length} Altfund(e) (Warnung), in ${sources} Quelldatei(en).`);
  for (const f of findings) console.log(`  ${f.file}:${f.line} ${f.rule}`);
  if (blocking.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
