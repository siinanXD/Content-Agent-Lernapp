import { notFound } from "next/navigation";
import { loadPublishedCourseUnits } from "@/lib/learner/kurse";
import { mapGeneratedToPathUnits, slimPathUnits } from "@/lib/learner/phase-a-path";
import { getStorage } from "@/lib/storage";
import { LernpfadView } from "../../lernpfad-view";

export const revalidate = 300;

/** Pfad eines veröffentlichten Kurses (SIN-1455); wie `/lernpfad/[kurs]`, nur die Pfad-Ansicht. */
export default async function KursPfadPage({ params }: { params: Promise<{ kurs: string }> }) {
  const { kurs } = await params;
  let units: ReturnType<typeof mapGeneratedToPathUnits> = [];
  try {
    const loaded = await loadPublishedCourseUnits(getStorage(), kurs);
    units = mapGeneratedToPathUnits(loaded?.units ?? []);
  } catch {
    /* 404 unten */
  }
  if (!units.length) notFound();
  return <LernpfadView ansicht="pfad" courseId={kurs} initialUnits={slimPathUnits(units)} />;
}
