import {
  createCourse,
  getCourse,
  listCourses,
  setEvaluation,
  setGenerated,
  setPlan,
  setSources,
  setStatus,
} from "@/lib/pipeline/mock-store";
import type {
  CourseStorage,
  LearningProgressEvent,
  QuestionEvaluationRecord,
  RecordProgressInput,
} from "./types";

const progress = new Map<string, LearningProgressEvent>();
const questionEvaluations: QuestionEvaluationRecord[] = [];

function toProgress(input: RecordProgressInput): LearningProgressEvent {
  const id = input.id ?? crypto.randomUUID();
  return {
    id,
    anonymousId: input.anonymousId,
    courseId: input.courseId,
    unitId: input.unitId,
    questionId: input.questionId,
    correct: input.correct,
    durationMs: input.durationMs,
    abandoned: input.abandoned ?? false,
    createdAt: new Date().toISOString(),
  };
}

/** In-memory adapter — used for tests and when Supabase secrets are missing. */
export const mockStorage: CourseStorage = {
  backend: "mock",

  async createCourse(keyword, variants = 2) {
    return createCourse(keyword, variants);
  },

  async getCourse(id) {
    return getCourse(id);
  },

  async listCourses() {
    return listCourses();
  },

  async setStatus(id, status) {
    return setStatus(id, status);
  },

  async setSources(id, sources) {
    return setSources(id, sources);
  },

  async setPlan(id, plan) {
    return setPlan(id, plan);
  },

  async setGenerated(id, generated) {
    return setGenerated(id, generated);
  },

  async setEvaluation(id, evaluation) {
    return setEvaluation(id, evaluation);
  },

  async appendQuestionEvaluations(records) {
    questionEvaluations.push(...records);
  },

  async listQuestionEvaluations(courseId) {
    return questionEvaluations.filter((r) => r.courseId === courseId);
  },

  async listSharedModuleLinks() {
    return [];
  },

  async recordProgress(input) {
    if (!input.anonymousId?.trim()) {
      throw new Error("anonymousId_required");
    }
    const event = toProgress(input);
    progress.set(event.id, event);
    return event;
  },

  async listProgress(anonymousId) {
    return [...progress.values()].filter((e) => e.anonymousId === anonymousId);
  },
};

/** Test helper */
export function clearMockProgress() {
  progress.clear();
  questionEvaluations.length = 0;
}
