#!/usr/bin/env node
/**
 * SIN-272: Stichprobe sicherheitsrelevanter, veröffentlichter MAF-Metall-Einheiten.
 *
 *   node --import tsx scripts/safety-sample.mjs --units export.json [--seed 272] [--size 15]
 *   node --import tsx scripts/safety-sample.mjs --url https://<app> [--seed 272] [--size 15]
 *   node --import tsx scripts/safety-sample.mjs --live --review-page   (SIN-278: URL aus docs/autonomy/config.json, Prüfseite für Sinan)
 *
 * --json <datei>: zusätzlich die Anzahlen als JSON schreiben (SIN-404, Lauf-Auftrag safety-sample).
 * --review-page --langfuse: zusätzlich die Fragen in die Langfuse-Warteschlange stellen (SIN-299).
 * --units: JSON-Datei mit { units: [...] } oder [...] (z. B. Antwort von /api/learner/phase-a).
 * --url:   Basis-URL der App; liest /api/learner/phase-a.
 * Schreibt docs/quality/sicherheits-stichprobe-maf-metall.md. Exit 2, wenn keine Einheiten
 * gefunden wurden (dann ist der Bericht kein Beleg) oder Quelle/Abrufdatum fehlen.
 * Die Bestätigung setzt ein Mensch; das Skript bewertet den Inhalt nicht.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const { loadAllCurricula } = await import("../src/lib/content/curriculum.ts");
const { buildSafetySample, renderReport, sampleCounts } = await import("../src/lib/quality/safety-sample.ts");
const { buildQuestionSample, renderReviewPage } = await import("../src/lib/quality/review-page.ts");

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const seed = Number(opt("seed", "272"));
const size = Number(opt("size", "15"));
if (!Number.isInteger(seed) || !Number.isInteger(size) || size < 1) {
  console.error("--seed und --size müssen ganze Zahlen sein (size ≥ 1).");
  process.exit(1);
}

let units = [];
let source;
const file = opt("units");
const base =
  opt("url") ??
  (argv.includes("--live") ? JSON.parse(readFileSync("docs/autonomy/config.json", "utf8")).APP_BASE_URL : undefined);
if (file) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  units = Array.isArray(data) ? data : (data.units ?? []);
  source = `Datei ${path.basename(file)}`;
} else if (base) {
  const res = await fetch(new URL("/api/learner/phase-a", base), { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    console.error(`HTTP ${res.status} von ${base}`);
    process.exit(1);
  }
  const data = await res.json();
  units = data.units ?? [];
  source = `${new URL(base).origin}/api/learner/phase-a (${data.source ?? "unbekannt"})`;
} else {
  console.error("Angabe nötig: --units <datei.json> oder --url <app-basis-url>.");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
if (argv.includes("--review-page")) {
  // SIN-278: Prüfseite mit 10 % der Fragen zu Elektrik und Maschinensicherheit
  const mafMetall = loadAllCurricula().find((c) => c.id === "maf-metall");
  const r = buildQuestionSample(units, mafMetall, { seed });
  if (argv.includes("--langfuse")) {
    // SIN-299: Fragen in die Langfuse-Warteschlange „Sicherheits-Stichprobe“; Urteile kommen als Score zurück.
    const { queueSafetySample } = await import("../src/lib/quality/langfuse-verwaltung.ts");
    const { shutdownLangfuseOtel } = await import("../src/lib/quality/langfuse-otel.ts");
    const q = await queueSafetySample(r.sample, { runId: `stichprobe-${today}`, seed });
    await shutdownLangfuseOtel();
    console.log(q ? `${q.queued} Fragen in der Langfuse-Warteschlange.` : "Langfuse nicht konfiguriert: nichts eingereiht.");
  }
  const page = path.join(process.cwd(), "docs", "content", `safety-sample-${today}.md`);
  writeFileSync(page, renderReviewPage(r, { date: today, source, seed }));
  console.log(`${r.sample.length} von ${r.total} Fragen. Seite: ${path.relative(process.cwd(), page)}`);
  process.exit(r.sample.length === 0 ? 2 : 0);
}
const result = buildSafetySample(units, loadAllCurricula(), { seed, size, today });
const out = path.join(process.cwd(), "docs", "quality", "sicherheits-stichprobe-maf-metall.md");
writeFileSync(out, renderReport(result, { date: today, source }));
// SIN-404: Anzahlen für den Lauf-Auftrag (run-task, Aufgabe safety-sample); keine Einheiten-Inhalte.
const jsonFile = opt("json", null);
if (jsonFile) writeFileSync(jsonFile, `${JSON.stringify(sampleCounts(result))}\n`);

const problems = result.checks.filter((c) => c.problems.length).length;
console.log(`${result.checks.length} von ${result.safetyUnits} sicherheitsrelevanten Einheiten gezogen (Seed ${seed}), ${problems} mit Befund. Bericht: ${path.relative(process.cwd(), out)}`);
process.exit(result.checks.length === 0 || problems > 0 ? 2 : 0);
