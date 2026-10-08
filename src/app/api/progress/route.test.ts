import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mockStorage, setStorageForTests } from "@/lib/storage";
import { POST, GET } from "./route";

before(() => setStorageForTests(mockStorage));
after(() => setStorageForTests(null));

const VALID_UUID = "f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0";
const INVALID_ID = "livecheck-1234567890";

test("POST /api/progress accepts valid UUID and returns 201", async () => {
  const req = new Request("http://localhost/api/progress", {
    method: "POST",
    body: JSON.stringify({
      anonymousId: VALID_UUID,
      questionId: "test-q",
      correct: true,
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert(body.anonymousId);
});

test("POST /api/progress rejects non-UUID with 400 anonymousId_invalid", async () => {
  const req = new Request("http://localhost/api/progress", {
    method: "POST",
    body: JSON.stringify({
      anonymousId: INVALID_ID,
      questionId: "test-q",
      correct: true,
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "anonymousId_invalid");
});

test("POST /api/progress rejects missing anonymousId with 400", async () => {
  const req = new Request("http://localhost/api/progress", {
    method: "POST",
    body: JSON.stringify({ questionId: "test-q", correct: true }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "anonymousId_required");
});

test("POST /api/progress rejects PII field names", async () => {
  const req = new Request("http://localhost/api/progress", {
    method: "POST",
    body: JSON.stringify({
      anonymousId: VALID_UUID,
      email: "user@example.com",
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "pii_not_allowed");
});

test("GET /api/progress accepts valid UUID and returns 200", async () => {
  const req = new Request(
    `http://localhost/api/progress?anonymousId=${VALID_UUID}`
  );

  const res = await GET(req);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.anonymousId, VALID_UUID);
  assert(Array.isArray(body.events));
});

test("GET /api/progress rejects non-UUID with 400 anonymousId_invalid", async () => {
  const req = new Request(
    `http://localhost/api/progress?anonymousId=${INVALID_ID}`
  );

  const res = await GET(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "anonymousId_invalid");
});

test("GET /api/progress rejects missing anonymousId with 400", async () => {
  const req = new Request("http://localhost/api/progress");

  const res = await GET(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "anonymousId_required");
});
