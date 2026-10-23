import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildJudgeRequestBody,
  judgeQuestionsFromText,
  JUDGE_JSON_SCHEMA,
  liveJudgeChunkWithUsage,
  type EvalItem,
} from "./evaluate-agent";

const ITEM: EvalItem = {
  id: "g01",
  unitId: "u1",
  prompt: "Welche Schutzeinrichtung trennt die Gefahrenstelle?",
  correct: "Trennende Schutzeinrichtung",
  explanation: "Trennende Schutzeinrichtungen verhindern den Zugriff auf die Gefahrenstelle.",
  sourceUrl: "https://www.gesetze-im-internet.de/betrsichv/",
};

/** Strict-Regeln (SIN-490): jedes Objekt hat additionalProperties false und alle Felder required. */
function assertStrictObjects(node: unknown, path = "$"): void {
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;
  if (n.type === "object") {
    const props = Object.keys((n.properties as Record<string, unknown>) ?? {});
    assert.equal(n.additionalProperties, false, `${path}: additionalProperties muss false sein`);
    assert.deepEqual([...((n.required as string[]) ?? [])].sort(), [...props].sort(), `${path}: required = alle Felder`);
  }
  for (const [k, v] of Object.entries(n)) {
    if (Array.isArray(v)) v.forEach((x, i) => assertStrictObjects(x, `${path}.${k}[${i}]`));
    else assertStrictObjects(v, `${path}.${k}`);
  }
}

describe("Richter: festes Antwortschema (SIN-490)", () => {
  it("Schema ist strict-konform: alle Felder required, keine offenen Objekte", () => {
    assertStrictObjects(JUDGE_JSON_SCHEMA);
  });

  it("Beispielantwort passt zum Schema und ergibt die bisherigen Bewertungen", () => {
    const answer = {
      items: [
        {
          id: "g01",
          sourceFidelity: 1,
          uniqueness: 1,
          niveau: 4,
          language: 5,
          safetyFlag: true,
          reasons: ["Schutzeinrichtung laut Auszug korrekt"],
        },
      ],
    };
    // Feldmenge der Antwort entspricht genau den Schema-Eigenschaften.
    const item = (JUDGE_JSON_SCHEMA.properties.items.items.properties as Record<string, unknown>);
    assert.deepEqual(Object.keys(answer.items[0]).sort(), Object.keys(item).sort());

    const [q] = judgeQuestionsFromText(JSON.stringify(answer), [ITEM]);
    assert.equal(q!.questionId, "g01");
    assert.deepEqual(q!.scores, { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: true });
    assert.equal(q!.passed, true);
    assert.ok(q!.reasons.includes("safety_human_sample"));
  });

  it("Beispielantwort unter der Schwelle fällt durch (Schwelle unverändert: Niveau ≥ 4)", () => {
    const answer = {
      items: [
        { id: "g01", sourceFidelity: 1, uniqueness: 1, niveau: 3, language: 4, safetyFlag: false, reasons: [] },
      ],
    };
    const [q] = judgeQuestionsFromText(JSON.stringify(answer), [ITEM]);
    assert.equal(q!.passed, false);
    assert.ok(q!.reasons.includes("niveau_below_4"));
  });

  it("SIN-1036: Schema-Verstoß oder kaputtes JSON = Einheit nicht bestanden mit Grund, nie {}", () => {
    const bad = [
      "kein json",
      "Hier: " + JSON.stringify({ items: [] }),
      "{}",
      JSON.stringify({ items: [{ id: "g01", sourceFidelity: 2, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false }] }),
      JSON.stringify({ items: [{ id: "andere", sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false }] }),
    ];
    for (const text of bad) {
      const [q] = judgeQuestionsFromText(text, [ITEM]);
      assert.equal(q!.passed, false, text);
      assert.match(q!.reasons[0] ?? "", /^richter_antwort_ungueltig: .+/, text);
    }
  });

  it("Anfrage nutzt json_schema mit strict: true und dem Schema", () => {
    const body = buildJudgeRequestBody([ITEM]) as {
      model: string;
      response_format: { type: string; json_schema: { name: string; strict: boolean; schema: unknown } };
      messages: Array<{ role: string }>;
    };
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.deepEqual(body.response_format.json_schema.schema, JUDGE_JSON_SCHEMA);
    assert.deepEqual(body.messages.map((m) => m.role), ["system", "user"]);
  });

  it("Ohne Schema-Flag bleibt der JSON-Modus für die Wiederholung", () => {
    const body = buildJudgeRequestBody([ITEM], false) as { response_format: { type: string } };
    assert.equal(body.response_format.type, "json_object");
  });

  it("Trockenlauf: erste Anfrage mit json_schema; HTTP 400 wiederholt einmal mit json_object", async () => {
    const formats: string[] = [];
    const answer = JSON.stringify({
      items: [{ id: "g01", sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false, reasons: [] }],
    });
    const fake = (async (_url: string, init?: RequestInit) => {
      const sent = JSON.parse(String(init?.body)) as { response_format: { type: string } };
      formats.push(sent.response_format.type);
      return formats.length === 1
        ? new Response("schema abgelehnt", { status: 400 })
        : new Response(JSON.stringify({ choices: [{ message: { content: answer } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 });
    }) as typeof fetch;

    const r = await liveJudgeChunkWithUsage("k", [ITEM], fake);
    assert.deepEqual(formats, ["json_schema", "json_object"]);
    assert.equal(r.questions[0]!.passed, true);
    assert.deepEqual(r.usage, { prompt_tokens: 10, completion_tokens: 5 });
  });

  it("Fehler ohne 400 wird nicht wiederholt und trägt den Status", async () => {
    let calls = 0;
    const fake = (async () => {
      calls += 1;
      return new Response("kein Kontingent", { status: 429 });
    }) as typeof fetch;
    await assert.rejects(() => liveJudgeChunkWithUsage("k", [ITEM], fake), /OpenAI 429 .*kein Kontingent/);
    assert.equal(calls, 1);
  });
});
