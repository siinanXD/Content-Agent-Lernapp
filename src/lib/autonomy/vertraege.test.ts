import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadAgents } from "../../../scripts/autonomy/agents.mjs";
import { buildEvent } from "../../../scripts/autonomy/leitstand.mjs";
import { SCHEMA_DIR, checkFiles, findReports, loadSchema, validate, validateReport } from "../../../scripts/autonomy/vertraege.mjs";

const read = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const beispiel = (n: string) => read(`${SCHEMA_DIR}/beispiele/${n}.json`);

test("alle Berichte im Repo passen zu ihrem Schema", () => {
  assert.deepEqual(checkFiles(findReports()), []);
});

test("Beispiele: research, planer, content sind gültig", () => {
  for (const n of ["research", "planer", "content"]) assert.deepEqual(validateReport(beispiel(n)), [], n);
});

test("kaputte Berichte werden abgelehnt", () => {
  const c = beispiel("content");
  assert.ok(validateReport({ ...c, erzeugt: "zehn" }).length > 0, "falscher Typ");
  assert.ok(validateReport({ ...c, status: "vielleicht" }).length > 0, "falscher Status");
  assert.ok(validateReport({ ...c, extra: 1 }).length > 0, "unbekanntes Feld");
  const ohneKosten = { ...c, kostenEur: undefined };
  assert.ok(validateReport(ohneKosten).some((e: string) => e.includes("kostenEur")), "Pflichtfeld fehlt");
  assert.ok(validateReport({ ...c, agent: "video" }).length > 0, "falscher Agent");
  const r = beispiel("research");
  const modell = { ...r.modelle[0], quelle: "keine-url" };
  assert.ok(validateReport({ ...r, modelle: [modell] }).length > 0, "Modell ohne Quelle");
  assert.ok(validateReport({ ...c, schema: "../gibtesnicht.schema.json" })[0].includes("existiert nicht"));
  assert.ok(validateReport({}).length > 0, "ohne Feld schema");
  const p = beispiel("planer");
  assert.ok(validateReport({ ...p, issues: Array(6).fill(p.issues[0]) }).length > 0, "mehr als 5 Issues");
});

test("checkFiles meldet ein kaputtes Beispiel mit Dateiname", () => {
  const tmp = join(mkdtempSync(join(tmpdir(), "vertrag-")), "kaputt.json");
  writeFileSync(tmp, JSON.stringify({ ...beispiel("content"), erzeugt: -1 }));
  const problems = checkFiles([{ file: tmp, pflicht: true }]);
  assert.equal(problems.length, 1);
  assert.ok(problems[0].startsWith(tmp));
});

test("Register verlinkt für jeden Agenten mit Ausgabe-Schema eine existierende Datei", () => {
  const agents = loadAgents() as { id: string; ausgabeSchema?: string }[];
  const mitSchema = agents.filter((a) => a.ausgabeSchema).map((a) => a.id);
  assert.deepEqual(mitSchema, ["research", "planer", "content", "video", "marketing"]);
  const files = new Set(readdirSync(SCHEMA_DIR));
  for (const a of agents) if (a.ausgabeSchema) assert.ok(files.has(a.ausgabeSchema.split("/").pop()!), `${a.id}: ${a.ausgabeSchema}`);
  assert.ok(files.has("ereignis.schema.json"));
});

test("Ereignis aus buildEvent passt zum Ereignis-Schema", () => {
  const schema = loadSchema("ereignis");
  const env = { GITHUB_REPOSITORY: "o/p", GITHUB_RUN_ID: "42", NODE_ENV: "test" as const };
  const ok = buildEvent({ schritt: "worker", status: "ok", issue: "SIN-491", pr: 12, seit: 1000 }, env, 5000);
  assert.deepEqual(validate(schema, ok), []);
  assert.deepEqual(validate(schema, buildEvent({ schritt: "planner", status: "start" }, env)), []);
  assert.ok(validate(schema, { ...ok, status: "kaputt" }).length > 0);
  assert.ok(validate(schema, { ...ok, project: 7 }).length > 0);
});
