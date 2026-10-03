import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { anthropicHeaders } from "./headers";

describe("anthropicHeaders", () => {
  const prev = process.env.ANTHROPIC_WORKSPACE_ID;

  afterEach(() => {
    if (prev === undefined) delete process.env.ANTHROPIC_WORKSPACE_ID;
    else process.env.ANTHROPIC_WORKSPACE_ID = prev;
  });

  it("sets api key and version without workspace when unset", () => {
    delete process.env.ANTHROPIC_WORKSPACE_ID;
    const h = anthropicHeaders({ apiKey: "sk-ant-test" });
    assert.equal(h["x-api-key"], "sk-ant-test");
    assert.equal(h["anthropic-version"], "2023-06-01");
    assert.equal(h["content-type"], "application/json");
    assert.equal(h["anthropic-workspace-id"], undefined);
  });

  it("adds anthropic-workspace-id when ANTHROPIC_WORKSPACE_ID is set", () => {
    process.env.ANTHROPIC_WORKSPACE_ID = "wrkspc_testworkspaceid0001";
    const h = anthropicHeaders({ apiKey: "sk-ant-test" });
    assert.equal(h["anthropic-workspace-id"], "wrkspc_testworkspaceid0001");
  });

  it("merges extra beta headers", () => {
    delete process.env.ANTHROPIC_WORKSPACE_ID;
    const h = anthropicHeaders({
      apiKey: "sk-ant-test",
      extra: { "anthropic-beta": "web-fetch-2025-09-10" },
    });
    assert.equal(h["anthropic-beta"], "web-fetch-2025-09-10");
  });
});
