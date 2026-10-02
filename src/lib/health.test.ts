import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getHealth } from "./health";

describe("health", () => {
  it("reports ok", () => {
    const h = getHealth();
    assert.equal(h.ok, true);
    assert.equal(h.service, "content-agent-lernapp");
  });
});
