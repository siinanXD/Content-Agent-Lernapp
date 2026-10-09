/**
 * Beispielmodus für die Lern-Ansichten ohne Konto (SIN-408). `?demo=1` schaltet ihn für diese Browser-Sitzung ein,
 * `?demo=0` aus. Alles Gezeigte ist erfunden. Im Beispielmodus wird nichts gespeichert und nichts gesendet
 * (Speicher-Funktionen sind dann leer), echte Lerndaten auf dem Gerät bleiben unberührt.
 */
import { trafficLabel, trafficLight } from "@/lib/content/didaktik";
import type { AreaResult } from "@/lib/learner/exam";
import { toWrongAnswer } from "@/lib/learner/exam-result";
import type { LeitnerStack } from "@/lib/learner/leitner";
import { activePathUnits } from "@/lib/learner/playable-path";
import type { LearnerSession } from "@/lib/learner/session";
import type { LearningEvent } from "@/lib/learner/streak";

export const DEMO_LERNEN_PARAM = "demo";
export const DEMO_LERNEN_HREF = `/lernpfad?${DEMO_LERNEN_PARAM}=1`;
const FLAG_KEY = "cal-demo";
const DAY_MS = 86_400_000;

/** Ist der Beispielmodus aktiv? Liest `?demo=` aus der Adresse und merkt es sich für die Sitzung. */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const param = new URLSearchParams(window.location.search).get(DEMO_LERNEN_PARAM);
    if (param === "1") window.sessionStorage.setItem(FLAG_KEY, "1");
    if (param === "0") window.sessionStorage.removeItem(FLAG_KEY);
    return window.sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Kalendertag `YYYY-MM-DD` in der Zeitzone des Geräts, `offset` Tage von `now`. */
function dayAt(now: Date, offset: number): string {
  const d = new Date(now.getTime() + offset * DAY_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Lernereignisse: Serie von 5 Tagen bis heute, davor ein paar einzelne Tage. */
export function demoEvents(now: Date): LearningEvent[] {
  const plan: Array<[number, LearningEvent["kind"][]]> = [
    [-12, ["unit"]],
    [-10, ["unit", "review"]],
    [-8, ["unit"]],
    [-4, ["unit", "unit", "review"]],
    [-3, ["unit", "unit"]],
    [-2, ["unit", "review", "unit"]],
    [-1, ["unit", "unit", "unit"]],
    [0, ["unit", "review"]],
  ];
  return plan.flatMap(([offset, kinds]) =>
    kinds.map((kind, i) => ({
      at: new Date(now.getTime() + offset * DAY_MS - i * 60_000).toISOString(),
      day: dayAt(now, offset),
      kind,
    })),
  );
}

/** Wiederholungsstapel aus echten Fragen des Lernpfads, mit gestern, heute und später fälligen Karten. */
export function demoStack(now: Date): LeitnerStack {
  const ids = activePathUnits()
    .flatMap((u) => u.questions)
    .slice(0, 8)
    .map((q) => q.id);
  const stages = [1, 1, 2, 2, 3, 3, 4, 1] as const;
  const dueOffsets = [-1, 0, 0, 2, 3, 6, 10, 1];
  return {
    items: ids.map((questionId, i) => ({
      questionId,
      stage: stages[i % stages.length]!,
      dueAt: new Date(now.getTime() + dueOffsets[i % dueOffsets.length]! * DAY_MS).toISOString(),
    })),
    updatedAt: now.toISOString(),
  };
}

function demoAreas(): AreaResult[] {
  const rows: Array<[string, string, number, number]> = [
    ["WISO-1", "Beispiel: Wirtschafts- und Sozialkunde", 9, 10],
    ["PT-d", "Beispiel: Prüfungsteil Technik", 6, 10],
    ["PT-e", "Beispiel: Prüfungsteil Einrichten", 3, 8],
  ];
  return rows.map(([areaId, title, correct, total]) => {
    const ratio = correct / total;
    const light = trafficLight(ratio);
    return { areaId, title, correct, total, ratio, light, label: trafficLabel(light) };
  });
}

/** Sitzung mit einem Prüfungsergebnis, damit Ergebnis, Profil und Prüfungs-Auswertung Werte zeigen. */
export function demoSession(): LearnerSession {
  const areaResults = demoAreas();
  const wrong = activePathUnits()
    .flatMap((u) => u.questions)
    .slice(0, 2)
    .map(toWrongAnswer);
  return {
    keyword: "Maschinen- und Anlagenführer",
    variant: "pruefung",
    totalPoints: 140,
    lastResult: {
      unitId: "beispiel",
      unitTitle: "Beispiel-Prüfung",
      correct: areaResults.reduce((n, a) => n + a.correct, 0),
      total: areaResults.reduce((n, a) => n + a.total, 0),
      points: 140,
      kind: "exam",
      areaResults,
      wrongAnswers: wrong,
    },
  };
}
