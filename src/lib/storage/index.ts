import { preferMockStorage } from "./config";
import { mockStorage } from "./mock-adapter";
import { supabaseStorage } from "./supabase-store";
import type { CourseStorage, StorageBackend } from "./types";

export type {
  Course,
  CourseSource,
  CourseStatus,
  CourseStorage,
  LearningProgressEvent,
  RecordProgressInput,
  StorageBackend,
} from "./types";

export { mockStorage } from "./mock-adapter";
export { preferMockStorage, supabaseSecretsPresent } from "./config";

let override: CourseStorage | null = null;

/** Resolve storage: Supabase when secrets exist, else mock-store. */
export function getStorage(): CourseStorage {
  if (override) return override;
  if (preferMockStorage()) return mockStorage;
  return supabaseStorage;
}

export function getStorageBackend(): StorageBackend {
  return getStorage().backend;
}

/** Test helper — inject a storage implementation. */
export function setStorageForTests(storage: CourseStorage | null) {
  override = storage;
}
