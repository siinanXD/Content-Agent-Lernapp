#!/usr/bin/env node
/**
 * Render docs/content/<id>.json curriculum maps to Markdown (docs/content/<ID>.md).
 * The JSON is the contract; the Markdown is generated and must not be edited by hand.
 *
 *   node scripts/content-render-curriculum.mjs            # all maps
 *   node scripts/content-render-curriculum.mjs maf-metall # one map
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "docs", "content");
const esc = (s) => String(s).replace(/\|/g, "\\|");
const code = (s) => "`" + s + "`";
const codes = (arr) => arr.map(code).join(", ");

function render(c) {
  const L = [];
  const w = (s = "") => L.push(s);
  const byId = Object.fromEntries(c.modules.map((m) => [m.id, m]));
  const modules = [...c.modules].sort((a, b) => a.order - b.order);
  const total = c.totals.unitsTarget;

  w(`# Curriculum-Map: ${c.title}`);
  w();
  w(
    `Stand: ${c.version} · Status: **${c.status}** · Familie: ${code(c.family)} · Map-ID: ${code(c.id)} · Maschinenlesbar: [${code(c.id + ".json")}](${c.id}.json) · Vorgaben für die Agenten: [README](README.md)`,
  );
  w();
  w("> Diese Datei wird aus der JSON erzeugt (`node scripts/content-render-curriculum.mjs`). Änderungen gehören in die JSON.");
  w();
  w("## 1. Beruf, Dauer, Variante");
  w();
  w(`- **Beruf:** ${c.keyword}`);
  if (c.variantLabel) w(`- **Variante:** ${c.variantLabel}`);
  w(`- **Dauer:** ${c.durationYears} Jahre. ${c.durationNote}`);
  w(`- **Referenz-Rahmenlehrplan:** ${code(c.referenceRlp.sourceId)}. ${c.referenceRlp.why}`);
  if (c.referenceRlp.alternatives?.length) w(`- **Alternativen:** ${c.referenceRlp.alternatives.join("; ")}`);
  w();
  w("## 2. Amtliche Quellen");
  w();
  w("| ID | Quelle | Art | Abruf |");
  w("| --- | --- | --- | --- |");
  for (const s of c.sources) w(`| ${code(s.id)} | [${esc(s.title)}](${s.url}) | ${s.kind} | ${s.fetchedAt} |`);
  w();
  w(`Abruf: ${c.sources[0]?.via ?? ""}`);
  w();
  w("## 3. Betrieblicher Zeitrahmen (Ausbildungsrahmenplan)");
  w();
  const bb = Object.fromEntries(c.aoBerufsbild.map((b) => [b.id, b]));
  for (const sec of c.aoZeitrahmen.sections) {
    w(`**${sec.title}** (Quelle ${code(sec.sourceId)})`);
    w();
    w("| Lfd. Nr. | Berufsbildposition | Wochen |");
    w("| --- | --- | --- |");
    let sum = 0;
    for (const r of sec.rows) {
      const pos = r.berufsbild.map((id) => `${id} ${bb[id]?.title ?? ""}`).join("; ");
      const wk = r.weeks == null ? r.note ?? "" : r.weeks;
      if (typeof r.weeks === "number") sum += r.weeks;
      w(`| ${r.lfdNr.join(", ")} | ${esc(pos)} | ${wk} |`);
    }
    w(`| | **Summe** | **${sum}**${sec.expectedWeeks != null ? ` (erwartet ${sec.expectedWeeks})` : ""} |`);
    w();
  }
  w("Mehrere Nummern in einer Zeile teilen sich die Wochen (Klammer in der Anlage).");
  w();
  w("## 4. Schulische Lernfelder (Referenz-Rahmenlehrplan)");
  w();
  w("| LF | Titel | Jahr | Std. | Modul |");
  w("| --- | --- | --- | --- | --- |");
  const hoursByYear = {};
  for (const m of modules) {
    if (m.kind !== "lernfeld" || !m.rlpLernfeld) continue;
    const r = m.rlpLernfeld;
    hoursByYear[m.year] = (hoursByYear[m.year] ?? 0) + r.hours;
    w(`| ${esc(r.label ?? String(r.nr))} | ${esc(r.title)} | ${m.year} | ${r.hours} | ${code(m.id)} |`);
  }
  w(
    `| | **Summe je Jahr** | | **${Object.keys(hoursByYear)
      .sort()
      .map((y) => `J${y}: ${hoursByYear[y]}`)
      .join(" · ")}** | |`,
  );
  w();
  w("## 5. Prüfungen und Zuordnung der Gebiete");
  w();
  w(c.exam.summary);
  w();
  const areaToMods = {};
  for (const m of modules) for (const a of m.examAreas) (areaToMods[a] ??= []).push(m.id);
  w("| Teil | Prüfungsbereich | Form | Dauer | Gewicht | Gebiete | Module |");
  w("| --- | --- | --- | --- | --- | --- | --- |");
  for (const p of c.exam.gradedParts) {
    const mods = new Set(areaToMods[p.id] ?? []);
    for (const g of p.gebiete) for (const id of areaToMods[g.id] ?? []) mods.add(id);
    const sorted = [...mods].sort((a, b) => byId[a].order - byId[b].order);
    const geb = p.gebiete.map((g) => `${g.id}: ${g.title}`).join("; ");
    w(
      `| ${esc(p.part)} | ${esc(p.bereich)} | ${p.form} | ${p.duration ?? ""} | ${p.weightPercent == null ? "–" : p.weightPercent + " %"} | ${esc(geb)} | ${codes(sorted)} |`,
    );
  }
  w();
  if (c.exam.ungraded?.length) {
    for (const u of c.exam.ungraded) w(`**${u.title}:** ${u.text} → ${codes(areaToMods[u.id] ?? [])}`);
    w();
  }
  w(`Bestehen: ${c.exam.bestehen}`);
  w();
  w("## 6. Module im Überblick");
  w();
  w(
    `${modules.length} Module, **${total} Einheiten** (bei ${c.unit.minutesAvg} Minuten im Schnitt ≈ ${c.totals.hoursAtAvgUnit} Stunden Lernzeit; ${c.totals.questionsMin}–${c.totals.questionsMax} Fragen).`,
  );
  w();
  w("| Reihenfolge | Modul | Titel | Jahr | Art | Einheiten | Sicherheit | Prüfungsgebiete |");
  w("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const m of modules)
    w(
      `| ${m.order} | ${code(m.id)} | ${esc(m.title)} | ${m.year} | ${m.kind} | ${m.unitsTarget} | ${m.safety ? "ja" : "nein"} | ${m.examAreas.join(", ")} |`,
    );
  w(`| | | **Summe** | | | **${total}** | | |`);
  w();
  w("Reihenfolge = Lernreihenfolge. Querschnitt-Module werden über den Kurs gestreut (etwa jede fünfte Einheit).");
  w();
  w("## 7. Module und Blöcke im Detail");
  w();
  for (const m of modules) {
    w(`### ${m.id} · ${m.title}`);
    w();
    const meta = [`Jahr ${m.year}`, m.kind, `${m.unitsTarget} Einheiten`, `Niveau: ${m.niveau}`];
    if (m.rlpLernfeld)
      meta.push(`RLP LF ${m.rlpLernfeld.label ?? m.rlpLernfeld.nr} (${m.rlpLernfeld.hours} Std., ${code(m.rlpLernfeld.sourceId)})`);
    w("- " + meta.join(" · "));
    w("- AO-Berufsbild: " + m.aoPositions.map((p) => `${p.ref} → ${bb[p.berufsbild]?.title ?? p.berufsbild}`).join("; "));
    w("- Prüfungsgebiete: " + (m.examAreas.join(", ") || "–"));
    w("- Fragetypen-Mix (%): " + Object.entries(m.questionMix).map(([k, v]) => `${k} ${v}`).join(", "));
    if (m.note) w(`- Hinweis: ${m.note}`);
    w();
    w("| Block | Titel | Einheiten | Themen | Quellen | Merker |");
    w("| --- | --- | --- | --- | --- | --- |");
    for (const b of m.blocks) {
      const flags = [b.rechnen ? "rechnen" : null, b.safety ? "Sicherheit" : null].filter(Boolean).join(", ");
      w(`| ${code(b.id)} | ${esc(b.title)} | ${b.units} | ${esc(b.topics.join("; "))} | ${codes(b.sourceIds)} | ${flags} |`);
    }
    w();
  }
  w("## 8. Erzeugungsphasen");
  w();
  w("Jede Phase ist ein eigener Kurslauf unter dem 20-Euro-Deckel (AGENTS.md).");
  w();
  w("| Phase | Module | Einheiten | Warum |");
  w("| --- | --- | --- | --- |");
  for (const p of c.phases) w(`| ${p.id} | ${codes(p.moduleIds)} | ${p.unitsTarget} | ${esc(p.why)} |`);
  w(`| | **Summe** | **${total}** | |`);
  w();
  if (c.assumptions?.length) {
    w("## 9. Annahmen (ohne Rückfrage, siehe DECISIONS.md)");
    w();
    c.assumptions.forEach((a, i) => w(`${i + 1}. ${a}`));
    w();
  }
  return L.join("\n") + "\n";
}

const only = process.argv[2];
const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && (!only || f === `${only}.json`));
if (files.length === 0) {
  console.error(`no curriculum json found in ${DIR}${only ? ` for ${only}` : ""}`);
  process.exit(1);
}
for (const f of files) {
  const c = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  const out = path.join(DIR, `${c.id.toUpperCase()}.md`);
  writeFileSync(out, render(c));
  console.log(`rendered ${f} -> ${path.basename(out)} (${c.modules.length} modules, ${c.totals.unitsTarget} units)`);
}
