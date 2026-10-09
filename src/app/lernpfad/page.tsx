import { loadMafCurriculum } from "@/lib/content/curriculum";
import { loadPathUnitsServer } from "@/lib/learner/phase-a-server";
import { LernpfadView } from "./lernpfad-view";

/** Einheiten stehen im HTML; alle 5 Minuten neu erzeugt, damit Veröffentlichungen ankommen (SIN-311). */
export const revalidate = 300;

/** Alle Module des Kurses, auch die ohne Einheiten (SIN-452). Ohne Kursdatei zeigt der Pfad nur Module mit Einheiten. */
function courseModules(): Array<{ id: string; title: string }> {
  try {
    return [...loadMafCurriculum().modules]
      .sort((a, b) => a.order - b.order)
      .map((m) => ({ id: m.id, title: m.title }));
  } catch {
    return [];
  }
}

export default async function LernpfadPage() {
  return <LernpfadView initialUnits={await loadPathUnitsServer()} modules={courseModules()} />;
}
