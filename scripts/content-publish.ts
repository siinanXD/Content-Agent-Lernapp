/**
 * SIN-796: Kurs nach Prüfung auf `published` setzen.
 *
 *   node --import tsx scripts/content-publish.ts --keyword "Industriemechaniker" [--dry-run]
 *
 * Prüft Quelle/Abrufdatum, Richter und Verbotsliste (src/lib/review/veroeffentlichen.ts). Nur bei null Mängeln
 * und ohne --dry-run wird `courses.status` gesetzt. Exit 0 = veröffentlicht oder Trockenlauf grün,
 * 1 = Mängel oder Fehler (Liste im Log und in content-publish-bericht.md). Braucht SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY.
 */
import { writeFileSync } from "node:fs";
import { pruefeKursFuerVeroeffentlichung, type Mangel } from "@/lib/review/veroeffentlichen";
import { supabaseStorage } from "@/lib/storage/supabase-store";
import type { Course, CourseStorage } from "@/lib/storage/types";
import { buildEvent, sendEvent } from "./autonomy/leitstand.mjs";

export type PublishErgebnis = { kurs?: Course; mangel: Mangel[]; veroeffentlicht: boolean; fehler?: string };

/** Sucht den Kurs über sein Stichwort (ohne Groß-/Kleinschreibung); mehrdeutig oder unbekannt ist ein Fehler. */
export async function publishKurs(
  storage: Pick<CourseStorage, "listCourses" | "setStatus" | "listQuestionEvaluations">,
  keyword: string,
  dryRun: boolean,
): Promise<PublishErgebnis> {
  const treffer = (await storage.listCourses()).filter((c) => c.keyword.trim().toLowerCase() === keyword.trim().toLowerCase());
  if (treffer.length !== 1) {
    return { mangel: [], veroeffentlicht: false, fehler: treffer.length ? `Stichwort „${keyword}“ ist mehrdeutig (${treffer.length} Kurse)` : `Kein Kurs mit Stichwort „${keyword}“` };
  }
  const kurs = treffer[0];
  const mangel = pruefeKursFuerVeroeffentlichung(kurs, await storage.listQuestionEvaluations(kurs.id));
  if (mangel.length > 0 || dryRun) return { kurs, mangel, veroeffentlicht: false };
  await storage.setStatus(kurs.id, "published");
  return { kurs, mangel, veroeffentlicht: true };
}

export function bericht(e: PublishErgebnis, dryRun: boolean): string {
  const kopf = e.kurs ? `Kurs ${e.kurs.keyword} (Status ${e.kurs.status}, ${(e.kurs.generated as { units?: unknown[] } | undefined)?.units?.length ?? 0} Einheiten)` : "Kein Kurs";
  if (e.fehler) return `${kopf}: ${e.fehler}`;
  const modus = dryRun ? "Trockenlauf, nichts geschrieben" : e.veroeffentlicht ? "veröffentlicht" : "nicht veröffentlicht";
  const zeilen = e.mangel.length ? e.mangel.map((m) => `- ${m.pruefung}: ${m.ort}, ${m.hinweis}`) : ["- alle Prüfungen grün"];
  return [`${kopf}: ${modus}`, `Mängel: ${e.mangel.length}`, ...zeilen].join("\n");
}

/** Kurzgrund für loop_events (SIN-882): Anzahl je Prüfung, höchstens 300 Zeichen. */
export function grund(e: PublishErgebnis): string {
  if (e.fehler) return e.fehler.slice(0, 300);
  const je = new Map<string, number>();
  for (const m of e.mangel) je.set(m.pruefung, (je.get(m.pruefung) ?? 0) + 1);
  return `${e.kurs?.keyword ?? "?"}: ${e.mangel.length} Mängel (${[...je].map(([p, n]) => `${p} ${n}`).join(", ")})`.slice(0, 300);
}

async function main() {
  const argv = process.argv.slice(2);
  const keyword = argv.includes("--keyword") ? argv[argv.indexOf("--keyword") + 1] : "";
  const dryRun = argv.includes("--dry-run");
  if (!keyword) throw new Error("--keyword fehlt");
  const e = await publishKurs(supabaseStorage, keyword, dryRun);
  const text = bericht(e, dryRun);
  console.log(text);
  writeFileSync("content-publish-bericht.md", `${text}\n`);
  if (e.fehler || e.mangel.length > 0) {
    const r = await sendEvent(buildEvent({ schritt: "publish", status: "fehler", grund: grund(e) }), process.env);
    console.log(r.ok ? `loop_events: Zeile ${r.id ?? "?"} gespeichert` : `loop_events nicht gespeichert: ${r.grund}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
