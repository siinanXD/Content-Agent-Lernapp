import type { GeneratedLernfeld } from "@/lib/generate/maf-lernfeld-seed";
import type { QuestionEvaluationRecord } from "@/lib/quality/question-evaluations";

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

/** AP-20: Verknüpfung eines Kurses mit einem gemeinsamen Modul der Modul-Bibliothek. */
export type SharedModuleLink = {
  key: string;
  moduleId: string;
  /** Kurs, in dem die Einheiten des Moduls liegen (nicht kopiert). */
  sourceCourseId: string;
  sortOrder: number;
};

export type { QuestionEvaluationRecord };

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
  /** Append-only: one row per judged question and run (AP-19). Never overwrites. */
  appendQuestionEvaluations(records: QuestionEvaluationRecord[]): Promise<void>;
  /** All judge rows for a course, oldest first. */
  listQuestionEvaluations(courseId: string): Promise<QuestionEvaluationRecord[]>;
  /** Gemeinsame Module, die dieser Kurs per Verknüpfung zeigt (AP-20). */
  listSharedModuleLinks(courseId: string): Promise<SharedModuleLink[]>;
  recordProgress(input: RecordProgressInput): Promise<LearningProgressEvent>;
  listProgress(anonymousId: string): Promise<LearningProgressEvent[]>;
}
