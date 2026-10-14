#!/usr/bin/env node
/**
 * SIN-652: Lernkarte MAF Metall aus der Map (docs/content/maf-metall.json) ableiten.
 * Zeilen = Berufsbildpositionen der MaschFüAusbV-Anlage (Quelle `ao-anlage`), je Zeile die Module,
 * die sie abdecken. Lücken = Positionen ohne Modul. Lernfelder: nur Zeilen mit Quelle `rlp-maf`
 * gelten als MAF-Lernfeld; alles mit `rlp-im` wird als offen ausgewiesen (kein Erfinden).
 *
 *   node scripts/maf-lernkarte.mjs          # schreibt docs/content/MAF-LERNKARTE.md
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "docs", "content");
const code = (s) => "`" + s + "`";

export function lernkarte(c) {
  const src = Object.fromEntries(c.sources.map((s) => [s.id, s]));
  const L = [];
  const w = (s = "") => L.push(s);
  const cover = new Map(c.aoBerufsbild.map((b) => [b.id, []]));
  for (const m of c.modules) for (const p of m.aoPositions ?? []) cover.get(p.berufsbild)?.push({ m, ref: p.ref });
  const weeks = new Map();
  for (const sec of c.aoZeitrahmen.sections)
    for (const r of sec.rows) for (const b of r.berufsbild) weeks.set(b, [...(weeks.get(b) ?? []), `${sec.id}: ${r.weeks ?? "ganze Ausbildung"}`]);

  w("# Lernkarte MAF Metall (SIN-652)");
  w();
  w(`Stand der Map: ${c.version}. Erzeugt aus [${code("maf-metall.json")}](maf-metall.json) mit ${code("node scripts/maf-lernkarte.mjs")}. KI-erzeugt, Prüfung und Freigabe macht ein Mensch; nicht von Hand ändern.`);
  w();
  w("## 1. Ausbildungsinhalte (Berufsbildpositionen)");
  w();
  w(`Quelle jeder Zeile: ${code("ao-anlage")}, [${src["ao-anlage"].title}](${src["ao-anlage"].url}), Abruf ${src["ao-anlage"].fetchedAt}. Wochen je Abschnitt der Anlage; Einheiten = Summe der Soll-Einheiten der Module, die die Position nennen.`);
  w();
  w("| Nr. | Berufsbildposition | Wochen (Anlage) | Module | Einheiten (Soll) |");
  w("| --- | --- | --- | --- | --- |");
  const gaps = [];
  for (const b of c.aoBerufsbild) {
    const hits = cover.get(b.id);
    const mods = [...new Set(hits.map((h) => h.m.id))];
    const units = [...new Map(hits.map((h) => [h.m.id, h.m.unitsTarget])).values()].reduce((a, n) => a + n, 0);
    if (!mods.length) gaps.push(b);
    w(`| ${b.id} | ${b.title} | ${(weeks.get(b.id) ?? []).join("; ")} | ${mods.map(code).join(", ") || "**keins**"} | ${units} |`);
  }
  w();
  w("## 2. Lernfelder (Rahmenlehrplan)");
  w();
  const rlp = src["rlp-maf"];
  w(`Quelle: ${code("rlp-maf")}, [${rlp.title}](${rlp.url}), Abruf ${rlp.fetchedAt}. Laut Map hat der RLP MAF keine eigenen Lernfelder und verweist auf die Rahmenlehrpläne der Fortsetzungsberufe. Der Verweistext ist in diesem Lauf nicht gelesen worden (kmk.org war im Lauf nur als PDF ohne auslesbaren Text erreichbar), die Lernfeld-Zeilen bleiben darum **offen**.`);
  w();
  w("| Modul | Titel | Jahr | Std. | Quelle heute | Status |");
  w("| --- | --- | --- | --- | --- | --- |");
  const offen = [];
  for (const m of c.modules.filter((x) => x.kind === "lernfeld")) {
    const r = m.rlpLernfeld ?? {};
    const isMaf = r.sourceId === "rlp-maf";
    if (!isMaf) offen.push(m);
    w(`| ${code(m.id)} | ${m.title} | ${m.year} | ${r.hours ?? ""} | ${code(r.sourceId ?? "?")}${r.viaSourceId ? ` via ${code(r.viaSourceId)}` : ""} | ${isMaf ? "MAF-Quelle" : "offen: Industriemechaniker-RLP"} |`);
  }
  w();
  w("## 3. Lücken");
  w();
  w(gaps.length ? gaps.map((b) => `- Position ${b.id} ${b.title}: kein Modul`).join("\n") : "- Jede Berufsbildposition der Anlage hat mindestens ein Modul.");
  w(`- ${offen.length} Lernfeld-Module (${offen.map((m) => m.id).join(", ")}) beruhen auf dem Industriemechaniker-RLP (${code("rlp-im")}). Sie müssen gegen den RLP MAF und die Fortsetzungsberufe neu belegt werden; bis dahin bleiben sie unverändert.`);
  w();
  return L.join("\n") + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const c = JSON.parse(readFileSync(path.join(DIR, "maf-metall.json"), "utf8"));
  writeFileSync(path.join(DIR, "MAF-LERNKARTE.md"), lernkarte(c));
}
