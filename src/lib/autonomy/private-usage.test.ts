import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../../scripts/autonomy/verbrauch.mjs";
import { buildDigest } from "../../../scripts/autonomy/digest.mjs";
import { buildSteckbrief } from "../../../scripts/autonomy/steckbrief.mjs";
import { privateWeekUsage, recordPrivateUsage } from "../../../scripts/autonomy/private-usage.mjs";
import { appendUsage } from "../../../scripts/autonomy/sparen.mjs";

test("worker usage stays in private Linear, never GitHub or stdout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "usage-"));
  const file = join(dir, "execution.json");
  writeFileSync(file, JSON.stringify([{type:"result",total_cost_usd:1.234,usage:{input_tokens:17}}]));
  const logs: string[] = [], writes: string[] = [];
  const oldLog = console.log, oldFetch = globalThis.fetch;
  console.log = (...args) => { logs.push(args.join(" ")); };
  globalThis.fetch = async () => { throw new Error("public network forbidden"); };
  const call = async (query: string, vars: Record<string, string>) => {
    if (query.includes("commentCreate")) { writes.push(vars.b); return {}; }
    return {issue:{id:"private-id",comments:{nodes:[],pageInfo:{hasNextPage:false}}}};
  };
  try {
    await main(["--file",file,"--run","123","--branch","claude/sin-1"],
      {NODE_ENV:"test",LINEAR_API_KEY:"test",GITHUB_REPOSITORY:"owner/repo",GH_TOKEN:"test",USAGE_ISSUES:"fix: repair (SIN-1)"}, call);
    assert.equal(writes.length, 1);
    assert.match(writes[0], /"usd":1\.234/);
    assert.doesNotMatch(logs.join("\n"), /1[.,]23|API-Gegenwert|usage:|public network forbidden/);
  } finally { console.log=oldLog; globalThis.fetch=oldFetch; rmSync(dir,{recursive:true,force:true}); }
});

test("public digest excludes amounts and quota information, private digest preserves them", () => {
  const snap = {now:"2026-10-22T00:00:00Z",slot:"morgen",content:{einheitenNeuWoche:3,bestehensquote:90,kostenWocheEur:12.34},quotas:[{name:"internal",pct:71}]};
  assert.doesNotMatch(buildDigest(snap).text, /12[.,]34|€|\$|internal|71 %/);
  assert.match(buildDigest({...snap,privateDetails:true}).text, /12[.,]34/);
});

test("public PR summary excludes legacy cost and usage sections", () => {
  for (const heading of ["## Verbrauch", "**Verbrauch**", "###### Verbrauch", "## Verbrauch\r"]) {
    const r=buildSteckbrief({title:"fix(a): test (SIN-1)",body:`${heading}\n- API-Gegenwert 12,34 $\n\n## Kosten\n12,34 €`,risk:"risk:medium",reasons:[],approved:false});
    assert.doesNotMatch(r.body, /12,34|API-Gegenwert/);
  }
});

const usage = {input:17,output:2,cacheRead:0,cacheWrite:0,turns:1,durationMs:100,costUsd:1.234};
const mark = appendUsage("",usage,{run:"123",repository:"owner/repo",branch:"claude/sin-1",at:"2026-10-21T12:00:00Z",label:"worker"});
test("weekly reader paginates private records and deduplicates legacy and retry copies", async () => {
  const cursors: unknown[] = [];
  const call = async (_q: string, vars: Record<string, unknown> = {}) => {
    cursors.push(vars.after);
    return {issue:{id:"id",comments:{nodes:vars.after ? [{id:"2",body:mark}] : [],pageInfo:vars.after ? {hasNextPage:false} : {hasNextPage:true,endCursor:"next"}}}};
  };
  const window = {head:{ref:"claude/sin-1"},created_at:"2026-10-21T00:00:00Z",merged_at:"2026-10-21T23:00:00Z"};
  const result = await privateWeekUsage([{...window,title:"fix(a): a (SIN-1)",body:mark},{...window,title:"fix(a): b (SIN-1)",body:mark}],"owner/repo",call);
  assert.equal(result?.total.usd,1.234);
  assert.equal(result?.total.tokens,19);
  assert.deepEqual(cursors,[null,"next"]);
});

test("private recording retry is idempotent and a missing private issue fails closed", async () => {
  let writes = 0;
  const call = async (q: string) => {
    if(q.includes("commentCreate")) writes++;
    return {issue:{id:"id",comments:{nodes:[{id:"1",body:mark}],pageInfo:{hasNextPage:false}}}};
  };
  await recordPrivateUsage(["SIN-1"],usage,{run:"123",repository:"owner/repo",branch:"claude/sin-1",at:"2026-10-21T12:00:00Z"},call);
  assert.equal(writes,0);
  await assert.rejects(privateWeekUsage([{title:"fix: (SIN-1)"}],"owner/repo",async()=>({issue:null})),/unavailable/);
});

test("reopened issue excludes earlier PRs and later active work from weekly totals", async () => {
  const make = (branch: string, at: string) => appendUsage("",usage,{run:branch+at,repository:"owner/repo",branch,at});
  const bodies = [make("claude/sin-1","2026-09-01T12:00:00Z"),make("claude/sin-1","2026-10-21T12:00:00.100Z"),make("claude/sin-1","2026-10-22T12:00:00Z"),make("other-branch","2026-10-21T12:00:00Z")];
  const call = async () => ({issue:{id:"id",comments:{nodes:bodies.map(body=>({body})),pageInfo:{hasNextPage:false}}}});
  const result=await privateWeekUsage([{title:"fix(a): (SIN-1)",head:{ref:"claude/sin-1"},created_at:"2026-10-21T12:00:00Z",merged_at:"2026-10-21T23:00:00Z"}],"owner/repo",call);
  assert.equal(result?.total.usd,1.234);
});
