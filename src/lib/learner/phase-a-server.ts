import type { GeneratedLernfeld } from "@/lib/generate/maf-lernfeld-seed";
import { getStorage } from "@/lib/storage";
import phaseAIndex from "./phase-a-index.json";
import { mapGeneratedToPathUnits, phaseAPathUnits, slimPathUnits } from "./phase-a-path";
import type { PathUnit } from "./playable-path";

/**
 * Einheiten des Lernpfads auf dem Server (SIN-311): veröffentlichte Phase A aus dem Speicher,
 * sonst der Seed. Fehler fallen still auf den Seed zurück, die Seite muss immer rendern.
 */
export async function loadPathUnitsServer(): Promise<PathUnit[]> {
  try {
    if (phaseAIndex.courseId) {
      const course = await getStorage().getCourse(phaseAIndex.courseId);
      const units = (course?.generated as GeneratedLernfeld | undefined)?.units ?? [];
      const mapped = mapGeneratedToPathUnits(units);
      if (mapped.length) return slimPathUnits(mapped);
    }
  } catch {
    /* Seed */
  }
  return slimPathUnits(phaseAPathUnits());
}
