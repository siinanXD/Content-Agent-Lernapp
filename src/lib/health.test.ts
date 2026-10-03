import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getHealth } from "./health";
import { supabaseSecretsPresent } from "@/lib/storage";

describe("health", () => {
  it("reports ok", () => {
    const h = getHealth();
    assert.equal(h.ok, true);
    assert.equal(h.service, "content-agent-lernapp");
    // COURSE_STORAGE=mock in npm test → mock backend even with live secrets.
    assert.equal(h.storage, "mock");
    assert.equal(h.supabaseConfigured, supabaseSecretsPresent());
  });
});
