/**
 * SIN-632 — Einheiten und Fragen auf eine frühere Version zurücksetzen. Ohne --apply nur Plan.
 *
 *   npm run inhalte:zuruecksetzen -- liste --kurs <uuid> --einheit <id>
 *   npm run inhalte:zuruecksetzen -- --lauf <run_id> [--apply] [--issue SIN-123]
 *   npm run inhalte:zuruecksetzen -- --kurs <uuid> --einheit <id> --ab <versionsnummer> [--apply] [--issue SIN-123]
 *
 * Gelesen und geschrieben wird in SUPABASE_URL (Service-Key). Das Zurücksetzen erzeugt selbst Versionen und ist umkehrbar.
 * Notfallplan: docs/ops/NOTFALL.md.
 */
import { createClient } from "@supabase/supabase-js";
import { fuehreAus, ladeVersionen, planRueckgang, setzeKontext, type Auswahl, type VersionDb } from "../src/lib/versions/versions";

const args = process.argv.slice(2);
const val = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as VersionDb;

  const runId = val("--lauf");
  const courseId = val("--kurs");
  const unitId = val("--einheit");
  const ab = val("--ab");

  if (args[0] === "liste") {
    if (!courseId || !unitId) throw new Error("--kurs und --einheit angeben");
    for (const v of (await ladeVersionen(db, { courseId, unitId, abVersion: 0 })).reverse()) {
      console.log(`${v.id}\t${v.created_at}\t${v.tabelle}\t${v.aktion}\t${v.question_id ?? "-"}\t${v.issue ?? "-"}\t${v.run_id ?? "-"}\t${v.grund}`);
    }
    return;
  }

  let auswahl: Auswahl;
  if (runId) auswahl = { runId };
  else if (courseId && unitId && ab) auswahl = { courseId, unitId, abVersion: Number(ab) };
  else throw new Error("--lauf <run_id> oder --kurs, --einheit und --ab angeben");

  const versionen = await ladeVersionen(db, auswahl);
  if (versionen.length === 0) throw new Error("Keine Versionen gefunden, nichts zurückzusetzen");
  const schritte = planRueckgang(versionen);
  for (const s of schritte) console.log(`${s.op === "loeschen" ? "löschen " : "zurück  "} ${s.tabelle} (Version ${s.version})`);

  if (!args.includes("--apply")) {
    console.log(`Trockenlauf: ${schritte.length} Schritte (mit --apply ausführen)`);
    return;
  }
  const issue = val("--issue");
  await setzeKontext(db, { grund: `Zurückgesetzt: ${runId ? `Lauf ${runId}` : `Einheit ${unitId} ab Version ${ab}`}`, issue });
  await fuehreAus(db, schritte);
  console.log(`zurückgesetzt: ${schritte.length} Schritte`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
