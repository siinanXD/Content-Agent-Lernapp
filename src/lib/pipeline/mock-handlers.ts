import { createCourse, getCourse, setStatus } from "./mock-store";

function notFound(id: string) {
  return Response.json(
    { error: "course_not_found", id, mock: true },
    { status: 404 },
  );
}

export async function handleCreateCourse(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    keyword?: string;
    variants?: number;
  };
  if (!body.keyword?.trim()) {
    return Response.json(
      { error: "keyword_required", mock: true },
      { status: 400 },
    );
  }
  const course = createCourse(body.keyword, body.variants ?? 2);
  return Response.json(course, { status: 201 });
}

export function handleResearch(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  setStatus(id, "researched");
  return Response.json({
    courseId: id,
    mock: true,
    sources: [
      {
        title: "Ausbildungsordnung (Mock – amtliche Quelle einsetzen)",
        url: "https://www.gesetze-im-internet.de/",
        fetchedAt: new Date().toISOString(),
      },
      {
        title: "Rahmenlehrplan (Mock – KMK/Land)",
        url: "https://www.kmk.org/",
        fetchedAt: new Date().toISOString(),
      },
    ],
  });
}

export function handlePlan(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  setStatus(id, "planned");
  return Response.json({
    courseId: id,
    mock: true,
    variants: [
      {
        name: "Prüfungsvorbereitung 2 Monate",
        days: [
          {
            day: 1,
            units: [
              { id: "u1", title: "Werkstoffe erkennen", minutes: 8 },
              { id: "u2", title: "Messmittel wählen", minutes: 7 },
            ],
          },
        ],
      },
      {
        name: "Weiterbildung 3 Monate",
        days: [
          {
            day: 1,
            units: [
              { id: "u1", title: "Werkstoffe erkennen", minutes: 8 },
              { id: "u2", title: "Messmittel wählen", minutes: 7 },
              { id: "u3", title: "Sicherheit am Arbeitsplatz", minutes: 10 },
            ],
          },
        ],
      },
    ],
  });
}

export function handleGenerate(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  setStatus(id, "generated");
  return Response.json({
    courseId: id,
    unitsGenerated: 3,
    mock: true,
  });
}

export function handleEvaluate(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  setStatus(id, "evaluated");
  return Response.json({
    courseId: id,
    passed: true,
    scores: {
      sourceFidelity: 1,
      uniqueness: 1,
      niveau: 4,
      language: 4,
    },
    mock: true,
  });
}

export function handlePublish(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  setStatus(id, "published");
  return Response.json({
    courseId: id,
    publishedUnits: 3,
    blockedUnits: 0,
    mock: true,
  });
}

export function handleRefresh(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  return Response.json({
    courseId: id,
    sourcesChanged: false,
    mock: true,
  });
}
