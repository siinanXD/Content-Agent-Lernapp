import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import { resetServiceSupabaseCache } from "@/lib/storage/supabase-client";
import { supabaseStorage } from "@/lib/storage/supabase-store";
import { UNITS_API_SCHEMA } from "./api-schema";
import { annotateUnit, mergePhaseLernfeld, parseLernfeldJson } from "./batch-generate";
import { bildwunschOderNull } from "./bildwunsch";
import { didaktikSchemaHint } from "./didaktik-prompts";

const COURSE = "e22073de-7020-4380-9002-c70d46c25e25";
const realFetch = globalThis.fetch;

/** Mock-Modell: so antwortet die API; kein Netzaufruf, 0 € Kosten. */
const frage = (id: string, extra: object = {}) => ({
  id, type: "auswahl", level: "anwenden", prompt: "Welches Maß?", choices: ["a", "b"], correct: "a",
  explanation: "Weil.", sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html", examAreas: ["PT-a"], ...extra,
});
const modellAntwort = JSON.stringify({
  units: [
    { id: "LF1-1-u1", title: "Ansichten", minutes: 6, explanation: "x", sections: { einstieg: "e", kern: "k", beispiel: "b", merksatz: "m" }, variant: "standard",
      bildwunsch: { art: "sketch", motiv: "Vorder-, Draufsicht und Seitenansicht eines Winkels", werte: [{ name: "Schenkellänge", wert: "40 mm" }] },
      questions: [frage("LF1-1-u1-q1")] },
    { id: "LF1-1-u2", title: "Schnitte", minutes: 6, explanation: "x", sections: { einstieg: "e", kern: "k", beispiel: "b", merksatz: "m" }, variant: "standard",
      bildwunsch: null, questions: [frage("LF1-1-u2-q1", { level: "verstehen" })] },
    // Das Modell liefert ein fertiges Bild statt Daten: wird nicht übernommen.
    { id: "LF1-1-u3", title: "Maße", minutes: 6, explanation: "x", variant: "standard",
      bildwunsch: { art: "sketch", motiv: "Maß", werte: [], src: "/x.svg" }, questions: [frage("LF1-1-u3-q1")] },
    { id: "LF1-1-u4", title: "Ohne", minutes: 6, explanation: "x", variant: "standard", questions: [frage("LF1-1-u4-q1")] },
  ],
});

describe("SIN-1551 Bildwunsch, Gebiet und Stufe als Daten (Mock-Modell)", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
    resetServiceSupabaseCache();
  });

  it("Ergebnis enthält bildwunsch mit art, motiv, werte oder null", () => {
    const c = loadMafCurriculum();
    const units = parseLernfeldJson(modellAntwort)!.units.map((u) => annotateUnit(u, null, c));
    assert.deepEqual(units[0]!.bildwunsch, { art: "sketch", motiv: "Vorder-, Draufsicht und Seitenansicht eines Winkels", werte: [{ name: "Schenkellänge", wert: "40 mm" }] });
    assert.equal(units[1]!.bildwunsch, null);
    assert.deepEqual(units[2]!.bildwunsch && Object.keys(units[2]!.bildwunsch), ["art", "motiv", "werte"]); // src fällt weg
    assert.equal(units[3]!.bildwunsch, null);
  });

  it("bildwunschOderNull lehnt Unbrauchbares ab", () => {
    for (const bad of [undefined, "Bild", { art: "foto", motiv: "x", werte: [] }, { art: "sign", motiv: " ", werte: [] }, { art: "sign", motiv: "x", werte: [{ name: "a" }] }]) {
      assert.equal(bildwunschOderNull(bad), null, JSON.stringify(bad));
    }
  });

  it("Prompt und API-Schema kennen bildwunsch als Pflichtfeld, nie als fertiges Bild", () => {
    assert.match(didaktikSchemaHint(), /"bildwunsch":null\|\{"art","motiv","werte"/);
    assert.match(didaktikSchemaHint(), /kein src, kein SVG und keine URL/);
    const unit = (UNITS_API_SCHEMA.properties as { units: { items: { required: string[]; properties: Record<string, unknown> } } }).units.items;
    assert.ok(unit.required.includes("bildwunsch"));
    assert.ok(unit.properties.bildwunsch);
  });

  it("Gebiet und Stufe aus dem Ergebnis landen in den Spalten; kein echtes Modell, 0 €", async () => {
    process.env.SUPABASE_URL = "http://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    resetServiceSupabaseCache();
    const gesendet: Record<string, Array<Record<string, unknown>>> = {};
    let anthropicAufrufe = 0;
    globalThis.fetch = (async (input: Request | string | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : undefined;
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.hostname.includes("anthropic")) anthropicAufrufe += 1;
      const name = url.pathname.split("/").pop() ?? "";
      const method = req?.method ?? init?.method ?? "GET";
      if (method === "POST") gesendet[name] = JSON.parse(req ? await req.text() : String(init?.body));
      const body = method === "GET" ? (name === "courses" ? { id: COURSE, keyword: "k", created_at: "x", mock: false, variants: 2 } : []) : null;
      return new Response(body === null ? null : JSON.stringify(body), { status: body === null ? 201 : 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    const c = loadMafCurriculum();
    const units = parseLernfeldJson(modellAntwort)!.units.map((u) => annotateUnit(u, null, c));
    await supabaseStorage.setGenerated(COURSE, mergePhaseLernfeld(units), { changedUnitIds: units.map((u) => u.id), lernfeld: false });
    assert.deepEqual(gesendet.questions!.map((q) => [q.unit_id, q.exam_areas, q.level]), [
      ["LF1-1-u1", ["PT-a"], "anwenden"],
      ["LF1-1-u2", ["PT-a"], "verstehen"],
      ["LF1-1-u3", ["PT-a"], "anwenden"],
      ["LF1-1-u4", ["PT-a"], "anwenden"],
    ]);
    assert.equal(anthropicAufrufe, 0);
  });
});
