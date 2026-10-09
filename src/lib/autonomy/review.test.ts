import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MARKER,
  applyRefutations,
  parseWiderlegt,
  sameFinding,
  sumStats,
  buildDiff,
  costUsd,
  daySpend,
  diffChecks,
  formatComment,
  hasSevere,
  main,
  parseReview,
  readLedger,
} from "../../../scripts/autonomy/review.mjs";

test("Review: schwerer Fund im Modell-Ergebnis löst Reparatur aus, leichter nicht", () => {
  const r = parseReview(
    JSON.stringify({
      zusammenfassung: "Ein Fehler.",
      funde: [
        { schwere: "schwer", datei: "src/a.ts", text: "Nullzugriff" },
        { schwere: "egal", datei: "", text: "Name" },
        { schwere: "schwer", text: "  " },
      ],
    }),
  );
  assert.deepEqual(r.funde.map((f: { schwere: string }) => f.schwere), ["schwer", "leicht"]);
  assert.equal(hasSevere(r.funde), true);
  assert.equal(hasSevere(r.funde.filter((f: { schwere: string }) => f.schwere === "leicht")), false);
  assert.throws(() => parseReview("kein json"));
});

test("Review: feste Prüfung findet abgeschaltete Barrierefreiheits-Tests", () => {
  const funde = diffChecks([
    { filename: "e2e/a11y.spec.ts", status: "modified", patch: "@@\n+test.skip('axe', () => {})" },
    { filename: "e2e/axe-alt.spec.ts", status: "removed", patch: "" },
    { filename: "src/lib/x.ts", status: "modified", patch: "+test.skip(1)" },
  ]);
  assert.equal(funde.length, 2);
  assert.ok(hasSevere(funde));
});

test("Review: Kosten, Ledger und Tagesdeckel", () => {
  assert.equal(costUsd({ prompt_tokens: 1_000_000, completion_tokens: 1_000_000 }), 5.25);
  const body = formatComment({ result: { zusammenfassung: "ok" }, funde: [], ledger: [{ d: "2026-10-07", usd: 0.5, sha: "abcdef1234" }] });
  assert.ok(body.includes(MARKER));
  assert.match(body, /review-severe: false/);
  assert.equal(readLedger(body).length, 1);
  const andere = formatComment({ result: null, funde: [], ledger: [{ d: "2026-10-07", usd: 0.25, sha: "b" }, { d: "2026-10-06", usd: 9, sha: "c" }] });
  assert.equal(daySpend([body, andere, "fremder Kommentar"], "2026-10-07"), 0.75);
});

test("Review: Diff wird gekürzt", () => {
  const files = [1, 2, 3].map((i) => ({ filename: `f${i}`, status: "added", patch: "x".repeat(100) }));
  assert.match(buildDiff(files, 250), /1 weitere Datei\(en\) gekürzt/);
});

test("Review: schwerer Fund → Kommentar mit Schwere und Ausgabe severe=true (Test-PR)", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const realFetch = globalThis.fetch;
  const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
  globalThis.fetch = (async (url: string, init: { method?: string; body?: string } = {}) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body });
    if (url.includes("/pulls/7/files")) return json([{ filename: "src/a.ts", status: "modified", patch: "+const x = null.y;" }]);
    if (url.includes("/pulls/7/commits")) return json([]);
    if (url.includes("/pulls/7")) return json({ title: "feat: a (SIN-1)", body: "Part of SIN-1", head: { sha: "abc1234" }, labels: [] });
    if (url.includes("/issues/comments") || url.includes("/issues/7/comments")) {
      return (init.method ?? "GET") === "POST" ? json({}) : json([]);
    }
    if (new URL(url).hostname === "api.openai.com") {
      return json({
        choices: [{ message: { content: JSON.stringify({ zusammenfassung: "Fehler gefunden.", funde: [{ schwere: "schwer", datei: "src/a.ts", text: "null.y wirft" }] }) } }],
        usage: { prompt_tokens: 1000, completion_tokens: 200 },
      });
    }
    return new Response("unerwartet", { status: 500 });
  }) as typeof fetch;
  try {
    await main(["--pr", "7"], { GITHUB_REPOSITORY: "o/r", GH_TOKEN: "t", OPENAI_API_KEY: "sk-test" } as unknown as NodeJS.ProcessEnv, new Date("2026-10-07T10:00:00Z"));
  } finally {
    globalThis.fetch = realFetch;
  }
  const post = calls.find((c) => c.method === "POST" && c.url.includes("/issues/7/comments"));
  assert.ok(post, "Kommentar wird geschrieben");
  const { body } = JSON.parse(post.body!);
  assert.match(body, /\*\*Schwer \(1\)/);
  assert.match(body, /review-severe: true/);
  assert.equal(readLedger(body)[0].d, "2026-10-07");
});

// ---------- SIN-381: Fehlalarme verbrauchen keine Reparatur-Runden ----------

const jsonRes = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });

async function runReview(opts: { buildConclusion: string | null; commits?: string[]; finding: { datei: string; text: string } }) {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: { method?: string; body?: string } = {}) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body });
    if (url.includes("/pulls/9/files")) return jsonRes([{ filename: "src/lib/m.ts", status: "modified", patch: "+x" }]);
    if (url.includes("/pulls/9/commits")) return jsonRes((opts.commits ?? []).map((message) => ({ commit: { message } })));
    if (url.includes("/pulls/9")) return jsonRes({ title: "feat: m (SIN-9)", body: "Part of SIN-9", head: { sha: "abc1234" }, labels: [] });
    if (url.includes("/check-runs")) {
      return jsonRes({ check_runs: opts.buildConclusion ? [{ name: "build", status: "completed", conclusion: opts.buildConclusion }] : [] });
    }
    if (url.includes("/issues/comments") || url.includes("/issues/9/comments")) return (init.method ?? "GET") === "POST" ? jsonRes({}) : jsonRes([]);
    if (new URL(url).hostname === "api.openai.com") {
      return jsonRes({
        choices: [{ message: { content: JSON.stringify({ zusammenfassung: "x", funde: [{ schwere: "schwer", ...opts.finding }] }) } }],
        usage: { prompt_tokens: 10, completion_tokens: 10 },
      });
    }
    return new Response("unerwartet", { status: 500 });
  }) as typeof fetch;
  try {
    await main(["--pr", "9"], { GITHUB_REPOSITORY: "o/r", GH_TOKEN: "t", OPENAI_API_KEY: "sk" } as unknown as NodeJS.ProcessEnv, new Date("2026-10-08T10:00:00Z"));
  } finally {
    globalThis.fetch = realFetch;
  }
  const post = calls.find((c) => c.method === "POST" && c.url.includes("/issues/9/comments"));
  const body: string = JSON.parse(post!.body!).body;
  const prompt = JSON.stringify(JSON.parse(calls.find((c) => new URL(c.url).hostname === "api.openai.com")!.body!).messages);
  return { body, prompt };
}

test("Review (SIN-381): „Test schlägt fehl“ bei grünem Build gilt als widerlegt, keine Reparatur", async () => {
  const { body } = await runReview({
    buildConclusion: "success",
    finding: { datei: "src/lib/autonomy/migrationen.test.ts", text: "Der Test schlägt fehl, weil applied === 1 nicht stimmt." },
  });
  assert.match(body, /review-severe: false/);
  assert.match(body, /\*\*Widerlegt \(1\)/);
  assert.deepEqual([readLedger(body)[0].gesamt, readLedger(body)[0].widerlegt], [1, 1]);
});

test("Review (SIN-381): gleiche Behauptung bei rotem Build bleibt schwer", async () => {
  const { body } = await runReview({
    buildConclusion: "failure",
    finding: { datei: "src/lib/autonomy/migrationen.test.ts", text: "Der Test schlägt fehl, weil applied === 1 nicht stimmt." },
  });
  assert.match(body, /review-severe: true/);
  assert.equal(readLedger(body)[0].widerlegt, 0);
});

test("Review (SIN-381): Fund ohne CI-Behauptung wird vom grünen Build nicht widerlegt", () => {
  const r = applyRefutations([{ schwere: "schwer", datei: "src/a.ts", text: "Nullzugriff in load()" }], { buildGreen: true });
  assert.equal(r[0].schwere, "schwer");
});

test("Review (SIN-381): wiederholter, begründet verworfener Fund zählt nicht noch einmal", async () => {
  const commit = [
    "Fund geprüft, keine Änderung nötig",
    "",
    "- src/lib/storage/x.ts: Nullzugriff in load() wirft (load() prüft vorher auf null, siehe Zeile 12)",
  ].join("\n");
  const { body, prompt } = await runReview({
    buildConclusion: null,
    commits: [commit],
    finding: { datei: "src/lib/storage/x.ts", text: "load() wirft bei Nullzugriff" },
  });
  assert.match(body, /review-severe: false/);
  assert.match(body, /Schon geprüft/);
  assert.match(prompt, /schon geprüft und mit Begründung widerlegt/);
  assert.match(prompt, /Nullzugriff in load\(\)/);
});

test("Review (SIN-381): anderer Fund in derselben Datei bleibt schwer", () => {
  const widerlegt = parseWiderlegt(["Fund geprüft, keine Änderung nötig\n- src/a.ts: Nullzugriff in load() wirft"]);
  const r = applyRefutations([{ schwere: "schwer", datei: "src/a.ts", text: "SQL-Injection im Suchparameter" }], { widerlegt });
  assert.equal(r[0].schwere, "schwer");
  assert.equal(sameFinding(widerlegt[0], { datei: "src/b.ts", text: "Nullzugriff in load() wirft" }), false);
});

test("Review (SIN-381): Kennzahl gesamt / widerlegt aus dem Ledger", () => {
  const a = formatComment({ result: null, funde: [], ledger: [{ d: "2026-10-08", usd: 0, sha: "aaaaaaa", gesamt: 2, widerlegt: 1 }] });
  const b = formatComment({ result: null, funde: [], ledger: [{ d: "2026-10-08", usd: 0, sha: "bbbbbbb", gesamt: 1, widerlegt: 1 }] });
  assert.deepEqual(sumStats([a, b, "fremd"]), { gesamt: 3, widerlegt: 2 });
});
