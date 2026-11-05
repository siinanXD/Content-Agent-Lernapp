import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { resetServiceSupabaseCache } from "./supabase-client";
import { supabaseStorage } from "./supabase-store";

const realFetch = globalThis.fetch;
const COURSE = "7c3e9a14-5b2d-4f68-a1c7-9d4e2b8f0a65";

/** PostgREST-Attrappe: kappt jede Antwort bei 1.000 Zeilen wie der echte Server und beachtet offset/limit. */
function stubFetch(table: Record<string, unknown[]>, course: Record<string, unknown>) {
  globalThis.fetch = (async (input: Request | string | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const name = url.pathname.split("/").pop() ?? "";
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });
    if (name === "courses") return json(course);
    const rows = table[name] ?? [];
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 1000), 1000);
    return json(rows.slice(offset, offset + limit));
  }) as typeof fetch;
}

describe("loadCourse (SIN-882)", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "http://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    resetServiceSupabaseCache();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    resetServiceSupabaseCache();
  });

  it("lernfeld = null mit 485 Einheiten: alle Einheiten, alle Fragen (>1.000), KI-Kennzeichnung", async () => {
    const units = Array.from({ length: 485 }, (_, i) => ({
      id: `u${i}`, title: `E${i}`, minutes: 5, explanation: "x", source_url: "https://x", source_fetched_at: "2026-10-01", sort_order: i,
    }));
    const questions = Array.from({ length: 2500 }, (_, i) => ({
      id: `q${i}`, unit_id: `u${i % 485}`, type: "single", prompt: "?", choices: ["a", "b"], correct: "a", explanation: "x", source_url: "https://x", sort_order: i,
    }));
    stubFetch(
      { units, questions, sources: [], plans: [], evaluations: [] },
      { id: COURSE, keyword: "Industriemechaniker", status: "researched", created_at: "2026-10-01", mock: false, variants: 2, lernfeld: null },
    );
    const course = await supabaseStorage.getCourse(COURSE);
    const generated = course?.generated as { units: Array<{ questions: unknown[] }>; aiDisclosure?: { text: string } };
    assert.equal(generated.units.length, 485);
    assert.equal(generated.units.reduce((n, u) => n + u.questions.length, 0), 2500);
    assert.ok(generated.aiDisclosure?.text.trim());
  });

  it("listQuestionEvaluations lädt 2.500 Bewertungen seitenweise (SIN-899)", async () => {
    const evaluations = Array.from({ length: 2500 }, (_, i) => ({
      id: `e${i}`, question_id: `LF5-4-u8-LF5-4-u8-q${i}`, unit_id: "LF5-4-u8", course_id: COURSE, run_id: "r1",
      judge_model: "m", prompt_version: "v1", quellentreue: 1, eindeutigkeit: 1, niveau: 3, sprache: 3,
      sicherheit_flag: false, passed: true, reason: null, langfuse_trace_id: null, content_hash: null,
      created_at: `2026-10-20T17:43:${String(i % 60).padStart(2, "0")}Z`,
    }));
    stubFetch({ question_evaluations: evaluations }, {});
    const rows = await supabaseStorage.listQuestionEvaluations(COURSE);
    assert.equal(rows.length, 2500);
    assert.equal(new Set(rows.map((r) => r.id)).size, 2500);
  });

  it("MAF aus den Tabellen: Fragen tragen examAreas aus der Zuordnung, Industriemechaniker keine (SIN-1534)", async () => {
    const MAF = "e22073de-7020-4380-9002-c70d46c25e25";
    const row = (id: string) => ({ id, title: id, minutes: 5, explanation: "x", source_url: "https://x", source_fetched_at: "2026-10-01", sort_order: 0 });
    const frage = (unit: string) => ({ id: `${unit}-q1`, unit_id: unit, type: "auswahl", prompt: "?", choices: ["a", "b"], correct: "a", explanation: "x", source_url: "https://x", sort_order: 0 });
    const lade = async (id: string) => {
      stubFetch(
        { units: [row("LF1-1-u1"), row("XYZ-9-u1")], questions: [frage("LF1-1-u1"), frage("XYZ-9-u1")], sources: [], plans: [], evaluations: [] },
        { id, keyword: "k", status: "published", created_at: "2026-10-01", mock: false, variants: 2, lernfeld: { id, title: "t", focus: "f", units: [] } },
      );
      const generated = (await supabaseStorage.getCourse(id))?.generated as { units: Array<{ id: string; questions: Array<{ examAreas?: string[] }> }> };
      return generated.units.map((u) => u.questions[0]!.examAreas);
    };
    assert.deepEqual(await lade(MAF), [["PT-a"], undefined]); // unbekannter Block: kein Gebiet, nicht raten
    assert.deepEqual(await lade(COURSE), [undefined, undefined]);
  });
});
