import { loadPathUnitsServer } from "@/lib/learner/phase-a-server";
import { LernpfadView } from "./lernpfad-view";

/** Einheiten stehen im HTML; alle 5 Minuten neu erzeugt, damit Veröffentlichungen ankommen (SIN-311). */
export const revalidate = 300;

export default async function LernpfadPage() {
  return <LernpfadView initialUnits={await loadPathUnitsServer()} />;
}
