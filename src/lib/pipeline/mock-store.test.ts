import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCourse, getCourse, setStatus } from "./mock-store";

describe("mock-store", () => {
  it("creates and updates a course", () => {
    const c = createCourse("Maschinen- und Anlagenführer");
    assert.equal(c.mock, true);
    assert.equal(c.status, "created");
    assert.ok(getCourse(c.id));
    setStatus(c.id, "researched");
    assert.equal(getCourse(c.id)?.status, "researched");
  });
});
