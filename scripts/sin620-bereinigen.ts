/**
 * SIN-620 — Interne Prüfhinweise aus Lerninhalten entfernen und Elektro-Hinweis ergänzen.
 * Nur Textänderung an `course.generated` (setGenerated), keine Löschung. Ohne --apply nur Bericht.
 * Danach `npm run quality:judge-backfill`: der Inhalts-Hash der geänderten Fragen ist neu, der Richter bewertet sie erneut.
 *
 * Usage:
 *   COURSE_STORAGE=supabase npm run content:bereinigen            (Trockenlauf)
 *   COURSE_STORAGE=supabase npm run content:bereinigen -- --apply
 */
import { bereinigeLernfeld } from "../src/lib/review/pruefhinweise";
import { getStorage } from "../src/lib/storage";

async function main() {
  const apply = process.argv.includes("--apply");
  const storage = getStorage();
  if (storage.backend !== "supabase") {
    console.error("STOP: need COURSE_STORAGE=supabase (got", storage.backend, ")");
    process.exit(2);
  }
  let manuell = 0;
  for (const course of (await storage.listCourses()).filter((c) => !c.mock && c.generated)) {
    const { generated, bericht } = bereinigeLernfeld(course.generated);
    manuell += bericht.manuell.length;
    if (bericht.einheiten.length === 0 && bericht.manuell.length === 0) continue;
    console.log(JSON.stringify({ course: course.id, ...bericht }));
    if (apply && bericht.einheiten.length > 0) await storage.setGenerated(course.id, generated);
  }
  console.log(apply ? "angewendet" : "Trockenlauf (mit --apply schreiben)", `· manuell zu prüfen: ${manuell}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
