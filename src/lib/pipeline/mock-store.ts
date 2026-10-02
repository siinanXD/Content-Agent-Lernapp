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

export function listCourses(): Course[] {
  return [...courses.values()];
}
