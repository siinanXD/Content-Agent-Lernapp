import assert from "node:assert/strict";
import { test } from "node:test";
import { compactApiError } from "./api-error";

test("SIN-445: compactApiError zieht OpenAI- und Anthropic-Fehler auf eine Zeile", () => {
  const openai = JSON.stringify({ error: { message: "The model `x` does not exist", type: "invalid_request_error", param: null, code: "model_not_found" } }, null, 2);
  assert.equal(compactApiError(openai), "invalid_request_error/model_not_found: The model `x` does not exist");
  const anthropic = JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "You have reached your specified API usage limits." } });
  assert.equal(compactApiError(anthropic), "invalid_request_error: You have reached your specified API usage limits.");
  assert.equal(compactApiError("kein\n  JSON"), "kein JSON");
  assert.doesNotMatch(compactApiError("Incorrect API key provided: sk-proj-abcdefghijklmnopqrstuv"), /abcdefghijkl/);
  assert.equal(compactApiError("x".repeat(500)).length, 400);
});
