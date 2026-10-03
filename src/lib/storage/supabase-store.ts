import type { GeneratedLernfeld, GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { getServiceSupabase } from "./supabase-client";
import type {
  Course,
  CourseSource,
  CourseStatus,
  CourseStorage,
  LearningProgressEvent,
  RecordProgressInput,
} from "./types";

type CourseRow = {
  id: string;
  keyword: string;
  status: CourseStatus;
  created_at: string;
  mock: boolean;
  variants: number;
  lernfeld: GeneratedLernfeld | null;
};

type SourceRow = {
  title: string;
  url: string;
  fetched_at: string;
  kind: string | null;
  note: string | null;
};

type UnitRow = {
  id: string;
  title: string;
  minutes: number;
  explanation: string;
  source_url: string;
  source_fetched_at: string;
  sort_order: number;
  module_id: string | null;
  block_id: string | null;
  niveau: number | null;
  safety_flag: boolean | null;
  variant: string | null;
  sections: unknown | null;
};

type QuestionRow = {
  id: string;
  unit_id: string;
  type: string;
  prompt: string;
  choices: string[] | null;
  correct: string | string[];
  explanation: string;
  source_url: string;
  sort_order: number;
  level: string | null;
  exam_areas: string[] | null;
};

function isLernfeld(value: unknown): value is GeneratedLernfeld {
  if (!value || typeof value !== "object") return false;
  const v = value as GeneratedLernfeld;
  return typeof v.id === "string" && Array.isArray(v.units);
}

async function loadCourse(id: string): Promise<Course | undefined> {
  const sb = getServiceSupabase();
  const { data: row, error } = await sb
    .from("courses")
    .select("id, keyword, status, created_at, mock, variants, lernfeld")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`courses_read: ${error.message}`);
  if (!row) return undefined;

  const courseRow = row as CourseRow;
  const [{ data: sources }, { data: planRow }, { data: units }, { data: questions }, { data: evaluation }] =
    await Promise.all([
      sb
        .from("sources")
        .select("title, url, fetched_at, kind, note")
        .eq("course_id", id)
        .order("created_at", { ascending: true }),
      sb.from("plans").select("payload").eq("course_id", id).maybeSingle(),
      sb
        .from("units")
        .select(
          "id, title, minutes, explanation, source_url, source_fetched_at, sort_order, module_id, block_id, niveau, safety_flag, variant, sections",
        )
        .eq("course_id", id)
        .order("sort_order", { ascending: true }),
      sb
        .from("questions")
        .select(
          "id, unit_id, type, prompt, choices, correct, explanation, source_url, sort_order, level, exam_areas",
        )
        .eq("course_id", id)
        .order("sort_order", { ascending: true }),
      sb.from("evaluations").select("payload").eq("course_id", id).maybeSingle(),
    ]);

  const course: Course = {
    id: courseRow.id,
    keyword: courseRow.keyword,
    status: courseRow.status,
    createdAt: courseRow.created_at,
    mock: courseRow.mock,
    variants: courseRow.variants,
  };

  const sourceRows = (sources ?? []) as SourceRow[];
  if (sourceRows.length) {
    course.sources = sourceRows.map((s) => ({
      title: s.title,
      url: s.url,
      fetchedAt: s.fetched_at,
      ...(s.kind ? { kind: s.kind } : {}),
      ...(s.note ? { note: s.note } : {}),
    }));
  }

  if (planRow?.payload !== undefined) {
    course.plan = planRow.payload;
  }

  // Prefer full lernfeld JSON (AP-15 Phase A) when present; else reconstruct from rows.
  if (isLernfeld(courseRow.lernfeld)) {
    course.generated = courseRow.lernfeld;
  } else {
    const unitRows = (units ?? []) as UnitRow[];
    const questionRows = (questions ?? []) as QuestionRow[];
    if (courseRow.lernfeld && unitRows.length) {
      const byUnit = new Map<string, QuestionRow[]>();
      for (const q of questionRows) {
        const list = byUnit.get(q.unit_id) ?? [];
        list.push(q);
        byUnit.set(q.unit_id, list);
      }
      course.generated = {
        id: (courseRow.lernfeld as { id: string }).id,
        title: (courseRow.lernfeld as { title: string }).title,
        focus: (courseRow.lernfeld as { focus: string }).focus,
        units: unitRows.map(
          (u): GeneratedUnit => ({
            id: u.id,
            title: u.title,
            minutes: u.minutes,
            explanation: u.explanation,
            sourceUrl: u.source_url,
            sourceFetchedAt: u.source_fetched_at,
            moduleId: u.module_id ?? undefined,
            blockId: u.block_id ?? undefined,
            niveau: u.niveau ?? undefined,
            safetyFlag: u.safety_flag ?? undefined,
            variant: (u.variant as GeneratedUnit["variant"]) ?? undefined,
            sections: (u.sections as GeneratedUnit["sections"]) ?? undefined,
            questions: (byUnit.get(u.id) ?? []).map((q) => ({
              id: q.id,
              type: q.type as GeneratedUnit["questions"][number]["type"],
              prompt: q.prompt,
              ...(q.choices ? { choices: q.choices } : {}),
              correct: q.correct,
              explanation: q.explanation,
              sourceUrl: q.source_url,
              level: (q.level as GeneratedUnit["questions"][number]["level"]) ?? undefined,
              examAreas: q.exam_areas ?? undefined,
            })),
          }),
        ),
      };
    }
  }

  if (evaluation?.payload !== undefined) {
    course.evaluation = evaluation.payload;
  }

  return course;
}

export const supabaseStorage: CourseStorage = {
  backend: "supabase",

  async createCourse(keyword, variants = 2) {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("courses")
      .insert({
        keyword: keyword.trim(),
        status: "created",
        mock: false,
        variants,
      })
      .select("id, keyword, status, created_at, mock, variants")
      .single();
    if (error || !data) throw new Error(`courses_create: ${error?.message}`);
    return {
      id: data.id,
      keyword: data.keyword,
      status: data.status as CourseStatus,
      createdAt: data.created_at,
      mock: data.mock,
      variants: data.variants,
    };
  },

  async getCourse(id) {
    return loadCourse(id);
  },

  async listCourses() {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("courses")
      .select("id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`courses_list: ${error.message}`);
    const courses: Course[] = [];
    for (const row of data ?? []) {
      const c = await loadCourse(row.id as string);
      if (c) courses.push(c);
    }
    return courses;
  },

  async setStatus(id, status) {
    const sb = getServiceSupabase();
    const { error } = await sb
      .from("courses")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`courses_status: ${error.message}`);
    return loadCourse(id);
  },

  async setSources(id, sources: CourseSource[]) {
    const sb = getServiceSupabase();
    const existing = await loadCourse(id);
    if (!existing) return undefined;

    const { error: delErr } = await sb.from("sources").delete().eq("course_id", id);
    if (delErr) throw new Error(`sources_clear: ${delErr.message}`);

    if (sources.length) {
      const { error: insErr } = await sb.from("sources").insert(
        sources.map((s) => ({
          course_id: id,
          title: s.title,
          url: s.url,
          fetched_at: s.fetchedAt,
          kind: s.kind ?? null,
          note: s.note ?? null,
        })),
      );
      if (insErr) throw new Error(`sources_insert: ${insErr.message}`);
    }

    const { error: stErr } = await sb
      .from("courses")
      .update({ status: "researched", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (stErr) throw new Error(`courses_researched: ${stErr.message}`);
    return loadCourse(id);
  },

  async setPlan(id, plan) {
    const sb = getServiceSupabase();
    const existing = await loadCourse(id);
    if (!existing) return undefined;

    const { error: upsertErr } = await sb.from("plans").upsert(
      {
        course_id: id,
        payload: plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id" },
    );
    if (upsertErr) throw new Error(`plans_upsert: ${upsertErr.message}`);

    const { error: stErr } = await sb
      .from("courses")
      .update({ status: "planned", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (stErr) throw new Error(`courses_planned: ${stErr.message}`);
    return loadCourse(id);
  },

  async setGenerated(id, generated) {
    const sb = getServiceSupabase();
    const existing = await loadCourse(id);
    if (!existing) return undefined;
    if (!isLernfeld(generated)) {
      throw new Error("generated_must_be_lernfeld");
    }

    // Persist full lernfeld JSON (AP-15); also keep relational rows for queries.
    const { error: qDel } = await sb.from("questions").delete().eq("course_id", id);
    if (qDel) throw new Error(`questions_clear: ${qDel.message}`);
    const { error: uDel } = await sb.from("units").delete().eq("course_id", id);
    if (uDel) throw new Error(`units_clear: ${uDel.message}`);

    if (generated.units.length) {
      const { error: uIns } = await sb.from("units").insert(
        generated.units.map((u, i) => ({
          id: u.id,
          course_id: id,
          title: u.title,
          minutes: u.minutes,
          explanation: u.explanation,
          source_url: u.sourceUrl,
          source_fetched_at: u.sourceFetchedAt,
          sort_order: i,
          module_id: u.moduleId ?? null,
          block_id: u.blockId ?? null,
          niveau: u.niveau ?? null,
          safety_flag: u.safetyFlag ?? null,
          variant: u.variant ?? null,
          sections: u.sections ?? null,
        })),
      );
      if (uIns) throw new Error(`units_insert: ${uIns.message}`);

      const questionRows = generated.units.flatMap((u, ui) =>
        u.questions.map((q, qi) => ({
          id: q.id,
          course_id: id,
          unit_id: u.id,
          type: q.type,
          prompt: q.prompt,
          choices: q.choices ?? null,
          correct: q.correct,
          explanation: q.explanation,
          source_url: q.sourceUrl,
          sort_order: ui * 1000 + qi,
          level: q.level ?? null,
          exam_areas: q.examAreas ?? null,
        })),
      );
      if (questionRows.length) {
        const { error: qIns } = await sb.from("questions").insert(questionRows);
        if (qIns) throw new Error(`questions_insert: ${qIns.message}`);
      }
    }

    const { error: stErr } = await sb
      .from("courses")
      .update({
        status: "generated",
        lernfeld: generated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (stErr) throw new Error(`courses_generated: ${stErr.message}`);
    return loadCourse(id);
  },

  async setEvaluation(id, evaluation) {
    const sb = getServiceSupabase();
    const existing = await loadCourse(id);
    if (!existing) return undefined;

    const ev = evaluation as { passed?: boolean; scores?: unknown };
    const { error: upsertErr } = await sb.from("evaluations").upsert(
      {
        course_id: id,
        passed: Boolean(ev.passed),
        scores: ev.scores ?? {},
        payload: evaluation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id" },
    );
    if (upsertErr) throw new Error(`evaluations_upsert: ${upsertErr.message}`);

    const { error: stErr } = await sb
      .from("courses")
      .update({ status: "evaluated", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (stErr) throw new Error(`courses_evaluated: ${stErr.message}`);
    return loadCourse(id);
  },

  async recordProgress(input: RecordProgressInput) {
    if (!input.anonymousId?.trim()) {
      throw new Error("anonymousId_required");
    }
    const sb = getServiceSupabase();
    const row = {
      id: input.id ?? crypto.randomUUID(),
      anonymous_id: input.anonymousId,
      course_id: input.courseId ?? null,
      unit_id: input.unitId ?? null,
      question_id: input.questionId ?? null,
      correct: input.correct ?? null,
      duration_ms: input.durationMs ?? null,
      abandoned: input.abandoned ?? false,
    };
    const { data, error } = await sb
      .from("learning_progress")
      .insert(row)
      .select(
        "id, anonymous_id, course_id, unit_id, question_id, correct, duration_ms, abandoned, created_at",
      )
      .single();
    if (error || !data) throw new Error(`progress_insert: ${error?.message}`);
    return {
      id: data.id as string,
      anonymousId: data.anonymous_id as string,
      courseId: (data.course_id as string | null) ?? undefined,
      unitId: (data.unit_id as string | null) ?? undefined,
      questionId: (data.question_id as string | null) ?? undefined,
      correct: (data.correct as boolean | null) ?? undefined,
      durationMs: (data.duration_ms as number | null) ?? undefined,
      abandoned: Boolean(data.abandoned),
      createdAt: data.created_at as string,
    } satisfies LearningProgressEvent;
  },

  async listProgress(anonymousId) {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("learning_progress")
      .select(
        "id, anonymous_id, course_id, unit_id, question_id, correct, duration_ms, abandoned, created_at",
      )
      .eq("anonymous_id", anonymousId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`progress_list: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      anonymousId: row.anonymous_id as string,
      courseId: (row.course_id as string | null) ?? undefined,
      unitId: (row.unit_id as string | null) ?? undefined,
      questionId: (row.question_id as string | null) ?? undefined,
      correct: (row.correct as boolean | null) ?? undefined,
      durationMs: (row.duration_ms as number | null) ?? undefined,
      abandoned: Boolean(row.abandoned),
      createdAt: row.created_at as string,
    }));
  },
};
