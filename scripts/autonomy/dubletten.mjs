#!/usr/bin/env node
/**
 * SIN-1540: Bericht über gleiche und ähnliche Einheiten je Block. Nur lesen, nichts löschen oder zusammenlegen.
 * Rechenweg wie Bericht 03.11.2026, Abschnitt 2: gleicher Titel = `lower` plus Leerraum zusammengezogen;
 * ähnlich = Verhältnis ab 0,8 im selben Block (Ratcliff/Obershelp wie Python `difflib.SequenceMatcher`).
 *
 *   infisical run … -- node scripts/autonomy/dubletten.mjs [--out docs/ops/dubletten-<Datum>.md]
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fetchAll } from "./content-metrics.mjs";

export const AEHNLICH_AB = 0.8;
export const AUSZUG = 200;

export const normiere = (t) => String(t ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Block einer Einheiten-ID (`<Modul>-<n>-u<n>`); ohne Muster der Rest vor `-u`. */
export const blockVon = (id) => /^(.+?-\d+)-u\d+$/.exec(id)?.[1] ?? id;

/** Längster gemeinsamer Block; bei Gleichstand der früheste in a, dann in b (wie difflib). */
function laengsterBlock(a, b, alo, ahi, blo, bhi) {
  let best = { i: alo, j: blo, k: 0 };
  let vorher = new Map();
  for (let i = alo; i < ahi; i++) {
    const jetzt = new Map();
    for (let j = blo; j < bhi; j++) {
      if (a[i] !== b[j]) continue;
      const k = (vorher.get(j - 1) ?? 0) + 1;
      jetzt.set(j, k);
      if (k > best.k) best = { i: i - k + 1, j: j - k + 1, k };
    }
    vorher = jetzt;
  }
  return best;
}

function treffer(a, b, alo, ahi, blo, bhi) {
  if (alo >= ahi || blo >= bhi) return 0;
  const m = laengsterBlock(a, b, alo, ahi, blo, bhi);
  if (!m.k) return 0;
  return m.k + treffer(a, b, alo, m.i, blo, m.j) + treffer(a, b, m.i + m.k, ahi, m.j + m.k, bhi);
}

/** 2·Treffer / (|a|+|b|), wie `SequenceMatcher(None, a, b).ratio()`. */
export function verhaeltnis(a, b) {
  const total = a.length + b.length;
  return total ? (2 * treffer(a, b, 0, a.length, 0, b.length)) / total : 1;
}

/** Gruppen gleicher Titel im Kurs (`ueberzaehlig` = Summe von Anzahl − 1) und Paare ähnlicher Titel je Block. */
export function dubletten(units) {
  const nachTitel = new Map();
  for (const u of units) nachTitel.set(normiere(u.title), [...(nachTitel.get(normiere(u.title)) ?? []), u]);
  const gruppen = [...nachTitel.values()].filter((g) => g.length > 1);
  const nachBlock = new Map();
  for (const u of units) nachBlock.set(blockVon(u.id), [...(nachBlock.get(blockVon(u.id)) ?? []), u]);
  const paare = [];
  for (const [block, liste] of nachBlock) {
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const r = verhaeltnis(normiere(liste[i].title), normiere(liste[j].title));
        if (r >= AEHNLICH_AB) paare.push({ block, a: liste[i], b: liste[j], verhaeltnis: r });
      }
    }
  }
  const einheiten = new Set(paare.flatMap((p) => [p.a.id, p.b.id]));
  return {
    gleich: { gruppen: gruppen.length, ueberzaehlig: gruppen.reduce((n, g) => n + g.length - 1, 0), liste: gruppen },
    aehnlich: { paare: paare.length, einheiten: einheiten.size, liste: paare },
  };
}

const entschaerfe = (t) => t.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

/** Wert für eine Markdown-Tabellenzelle: Objekte als JSON, Listen mit Pfeil, Backslash und Pipe entschärft (Belegprüfung #722). */
export const tabellenText = (v) => {
  const roh = Array.isArray(v) && v.every((x) => typeof x !== "object") ? v.join(" → ") : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
  return entschaerfe(roh.replace(/\s+/g, " "));
};

const zelle = (t) => entschaerfe(String(t ?? "").replace(/\s+/g, " ").trim().slice(0, AUSZUG));

/** Markdown: Zahlen je Kurs, dann je Kurs die Paare nach Block gruppiert, größte Blöcke zuerst. */
export function renderBericht(kurse, datum) {
  const zeilen = [
    `# Dubletten-Bericht ${datum}`,
    "",
    "Nur gelesen (SIN-1540): nichts gelöscht, nichts zusammengelegt. Gleicher Titel: Kleinschreibung, Leerraum zusammengezogen. Ähnlich: Verhältnis ≥ 0,8 im selben Block (wie Python `SequenceMatcher`). Nah-Titel sind ein Hinweis, kein Beweis: Viele Kaufmann-Titel fallen nur durch das Muster „Thema: Aspekt“ auf.",
    "",
    "| Kurs | Einheiten | Gleicher Titel: Gruppen / überzählig | Ähnliche Titel im Block: Paare / Einheiten |",
    "| --- | --- | --- | --- |",
  ];
  const ergebnis = kurse.map((k) => ({ ...k, d: dubletten(k.units) }));
  for (const { name, units, d } of ergebnis) {
    zeilen.push(`| ${name} | ${units.length} | ${d.gleich.gruppen} / ${d.gleich.ueberzaehlig} | ${d.aehnlich.paare} / ${d.aehnlich.einheiten} |`);
  }
  for (const { name, d } of ergebnis) {
    const nachBlock = new Map();
    for (const p of d.aehnlich.liste) nachBlock.set(p.block, [...(nachBlock.get(p.block) ?? []), p]);
    zeilen.push("", `## ${name}`);
    if (!nachBlock.size) zeilen.push("", "Keine ähnlichen Titel im selben Block.");
    for (const [block, liste] of [...nachBlock].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]))) {
      zeilen.push("", `### Block ${block} (${liste.length} ${liste.length === 1 ? "Paar" : "Paare"})`, "", "| Einheit A | Einheit B | Erklärung A (erste 200 Zeichen) | Erklärung B (erste 200 Zeichen) |", "| --- | --- | --- | --- |");
      for (const p of liste) {
        zeilen.push(`| ${p.a.id}<br>${zelle(p.a.title)} | ${p.b.id}<br>${zelle(p.b.title)} | ${zelle(p.a.explanation)} | ${zelle(p.b.explanation)} |`);
      }
    }
  }
  return `${zeilen.join("\n")}\n`;
}

async function main(env = process.env, argv = process.argv.slice(2)) {
  if (!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen (infisical run …)");
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const courses = (await fetchAll(env.SUPABASE_URL, "courses", "select=id,keyword,status&mock=eq.false&status=eq.published&order=keyword", h));
  const units = await fetchAll(env.SUPABASE_URL, "units", "select=id,course_id,title,explanation&order=course_id,id", h);
  const kurse = courses
    .map((c) => ({ name: c.keyword, units: units.filter((u) => u.course_id === c.id) }))
    .filter((k) => k.units.length);
  const datum = new Date().toISOString().slice(0, 10);
  const i = argv.indexOf("--out");
  const out = i >= 0 ? argv[i + 1] : `docs/ops/dubletten-${datum}.md`;
  writeFileSync(out, renderBericht(kurse, datum));
  console.log(`${out}: ${kurse.map((k) => `${k.name} ${k.units.length}`).join(", ")} (nur gelesen)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
