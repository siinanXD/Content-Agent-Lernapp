import assert from "node:assert/strict";
import { test } from "node:test";
import { checkEnvUrls, cleanEnvValue, readEnvUrl } from "./env";
import { ensureLangfuseOtel, shutdownLangfuseOtel } from "./quality/langfuse-otel";
import { getLangfuseConfig } from "./quality/langfuse-client";

function env(values: Record<string, string>): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}

test("cleanEnvValue entfernt Anführungszeichen und Leerzeichen", () => {
  assert.equal(cleanEnvValue(' "https://cloud.langfuse.com" '), "https://cloud.langfuse.com");
  assert.equal(cleanEnvValue("'x'"), "x");
  assert.equal(cleanEnvValue('""'), undefined);
  assert.equal(cleanEnvValue(undefined), undefined);
});

test("readEnvUrl akzeptiert zitierte URL, verwirft Müll mit Warnung ohne Wert", () => {
  assert.equal(
    readEnvUrl("X", env({ X: '"https://cloud.langfuse.com/"' })),
    "https://cloud.langfuse.com",
  );
  const warn = console.warn;
  const msgs: string[] = [];
  console.warn = (m: string) => void msgs.push(m);
  try {
    assert.equal(readEnvUrl("X", env({ X: "kein url" })), null);
    assert.deepEqual(checkEnvUrls(env({ SUPABASE_URL: "ftp://x" })), ["SUPABASE_URL"]);
  } finally {
    console.warn = warn;
  }
  assert.ok(msgs[0].includes("X ist keine gültige"));
  assert.ok(!msgs[0].includes("kein url"));
});

test("ungültige LANGFUSE_BASE_URL: Tracing aus, nichts wirft, Warnung im Log", async () => {
  const saved = { ...process.env };
  process.env.LANGFUSE_PUBLIC_KEY = "pk";
  process.env.LANGFUSE_SECRET_KEY = "sk";
  process.env.LANGFUSE_BASE_URL = "nicht gültig";
  const warn = console.warn;
  const msgs: string[] = [];
  console.warn = (m: string) => void msgs.push(m);
  try {
    assert.equal(getLangfuseConfig(), null);
    assert.equal(ensureLangfuseOtel(), null);
    assert.ok(msgs.some((m) => m.includes("LANGFUSE_BASE_URL")));
  } finally {
    console.warn = warn;
    await shutdownLangfuseOtel();
    process.env = saved;
  }
});

test("zitierte LANGFUSE_BASE_URL wird bereinigt", () => {
  const saved = { ...process.env };
  process.env.LANGFUSE_PUBLIC_KEY = "pk";
  process.env.LANGFUSE_SECRET_KEY = "sk";
  process.env.LANGFUSE_BASE_URL = '"https://cloud.langfuse.com"';
  try {
    assert.equal(getLangfuseConfig()?.baseUrl, "https://cloud.langfuse.com");
  } finally {
    process.env = saved;
  }
});
