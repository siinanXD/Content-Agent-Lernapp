export type CourseStatus =
  | "created"
  | "researched"
  | "planned"
  | "generated"
  | "evaluated"
  | "published";

export type Course = {
  id: string;
  keyword: string;
  status: CourseStatus;
  createdAt: string;
  mock: true;
  variants: number;
  sources?: Array<{ title: string; url: string; fetchedAt: string; kind?: string; note?: string }>;
  plan?: unknown;
  generated?: unknown;
};

const courses = new Map<string, Course>();

export function createCourse(keyword: string, variants = 2): Course {
  const course: Course = {
    id: crypto.randomUUID(),
    keyword: keyword.trim(),
    status: "created",
    createdAt: new Date().toISOString(),
    mock: true,
    variants,
  };
  courses.set(course.id, course);
  return course;
}

export function getCourse(id: string): Course | undefined {
  return courses.get(id);
}

export function setStatus(id: string, status: CourseStatus): Course | undefined {
  const course = courses.get(id);
  if (!course) return undefined;
  course.status = status;
  courses.set(id, course);
  return course;
}

export function setSources(
  id: string,
  sources: NonNullable<Course["sources"]>,
): Course | undefined {
  const course = courses.get(id);
  if (!course) return undefined;
  course.sources = sources;
  course.status = "researched";
  courses.set(id, course);
  return course;
}

export function setPlan(id: string, plan: unknown): Course | undefined {
  const course = courses.get(id);
  if (!course) return undefined;
  course.plan = plan;
  course.status = "planned";
  courses.set(id, course);
  return course;
}

export function setGenerated(id: string, generated: unknown): Course | undefined {
  const course = courses.get(id);
  if (!course) return undefined;
  course.generated = generated;
  course.status = "generated";
  courses.set(id, course);
  return course;
}

export function listCourses(): Course[] {
  return [...courses.values()];
}
