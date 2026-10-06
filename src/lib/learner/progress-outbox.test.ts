import { test } from "node:test";
import assert from "node:assert/strict";
import { enqueueProgress, flushProgress, loadOutbox } from "./progress-outbox";

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}
const reply = (status = 201) => Promise.resolve(new Response("{}", { status }));

test("Offline bleiben Antworten in der Warteschlange", async () => {
  const store = memoryStore();
  enqueueProgress({ questionId: "q1", correct: true }, store);
  enqueueProgress({ questionId: "q2", correct: false }, store);
  await flushProgress(store, () => Promise.reject(new TypeError("offline")));
  assert.equal(loadOutbox(store).length, 2);
});

test("Nach Netzrückkehr wird alles der Reihe nach gesendet", async () => {
  const store = memoryStore();
  enqueueProgress({ questionId: "q1", correct: true }, store);
  enqueueProgress({ questionId: "q2", correct: false }, store);
  const sent: string[] = [];
  await flushProgress(store, (_u, init) => {
    sent.push(JSON.parse(String(init?.body)).questionId);
    return reply();
  });
  assert.deepEqual(sent, ["q1", "q2"]);
  assert.equal(loadOutbox(store).length, 0);
});

test("Serverfehler mittendrin: der Rest bleibt erhalten", async () => {
  const store = memoryStore();
  enqueueProgress({ questionId: "q1" }, store);
  enqueueProgress({ questionId: "q2" }, store);
  let n = 0;
  await flushProgress(store, () => reply(++n === 1 ? 201 : 500));
  assert.deepEqual(loadOutbox(store).map((e) => e.questionId), ["q2"]);
});
