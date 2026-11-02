import { loadMafCurriculum } from "@/lib/content/curriculum";
import { loadPathUnitsServer } from "@/lib/learner/phase-a-server";
import { LernpfadView } from "../lernpfad-view";

export const revalidate = 300;

/** Pfad (Figma N5): ein Modul als senkrechte Linie (SIN-1455). */
export default async function PfadPage() {
  let modules: Array<{ id: string; title: string }> = [];
  try {
    modules = [...loadMafCurriculum().modules]
      .sort((a, b) => a.order - b.order)
      .map((m) => ({ id: m.id, title: m.title }));
  } catch {
    /* ohne Kursdatei nur Module mit Einheiten */
  }
  return <LernpfadView ansicht="pfad" initialUnits={await loadPathUnitsServer()} modules={modules} />;
}
