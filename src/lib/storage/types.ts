import type { GeneratedLernfeld } from "@/lib/generate/maf-lernfeld-seed";

export type CourseStatus =
  | "created"
  | "researched"
  | "planned"
  | "generated"
  | "evaluated"
  | "published";

export type CourseSource = {
  title: string;
  url: string;
  fetchedAt: string;
  kind?: string;
  note?: string;
};

export type Course = {
  id: string;
  keyword: string;
  status: CourseStatus;
  createdAt: string;
  mock: boolean;
  variants: number;
  sources?: CourseSource[];
  plan?: unknown;
  generated?: GeneratedLernfeld | unknown;
  evaluation?: unknown;
};

/** Answer event — anonymous random id only (PRODUCT.md); no PII fields. */
export type LearningProgressEvent = {
  id: string;
  anonymousId: string;
  courseId?: string;
  unitId?: string;
  questionId?: string;
  correct?: boolean;
  durationMs?: number;
  abandoned?: boolean;
  createdAt: string;
};

export type RecordProgressInput = {
  anonymousId: string;
  courseId?: string;
  unitId?: string;
  questionId?: string;
  correct?: boolean;
  durationMs?: number;
  abandoned?: boolean;
  id?: string;
};

export type StorageBackend = "mock" | "supabase";

export interface CourseStorage {
  readonly backend: StorageBackend;
  createCourse(keyword: string, variants?: number): Promise<Course>;
  getCourse(id: string): Promise<Course | undefined>;
  listCourses(): Promise<Course[]>;
  setStatus(id: string, status: CourseStatus): Promise<Course | undefined>;
  setSources(id: string, sources: CourseSource[]): Promise<Course | undefined>;
  setPlan(id: string, plan: unknown): Promise<Course | undefined>;
  setGenerated(id: string, generated: unknown): Promise<Course | undefined>;
  setEvaluation(id: string, evaluation: unknown): Promise<Course | undefined>;
  recordProgress(input: RecordProgressInput): Promise<LearningProgressEvent>;
  listProgress(anonymousId: string): Promise<LearningProgressEvent[]>;
}
