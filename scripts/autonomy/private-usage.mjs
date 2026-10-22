// SIN-911: structured usage is private; public markers remain a read-only legacy fallback.
import { linear } from "./linear.mjs";
import { appendUsage, parseUsageMarks, weekUsage } from "./sparen.mjs";

async function issueComments(identifier, call) {
  let after = null, issueId;
  const comments = [];
  do {
    const data = await call(`query($id:String!,$after:String) { issue(id:$id) { id comments(first:250,after:$after) { nodes { id body } pageInfo { hasNextPage endCursor } } } }`, {id:identifier,after});
    if (!data.issue) throw new Error("private usage issue unavailable");
    issueId = data.issue.id;
    comments.push(...data.issue.comments.nodes);
    const page = data.issue.comments.pageInfo;
    if (page?.hasNextPage && (!page.endCursor || page.endCursor === after)) throw new Error("private usage pagination incomplete");
    after = page?.hasNextPage ? page.endCursor : null;
  } while (after);
  return {issueId,comments};
}

export async function recordPrivateUsage(issues, usage, meta, call = linear) {
  if (!issues.length || issues.some(id => !/^SIN-\d+$/.test(id)) || !meta.run || !meta.branch || !meta.at) throw new Error("private usage needs issue and run");
  const {issueId,comments} = await issueComments(issues[0],call);
  if (comments.some(c => parseUsageMarks(c.body).some(m => m.run === meta.run && m.repository === meta.repository))) return;
  await call(`mutation($id:String!,$b:String!) { commentCreate(input:{issueId:$id,body:$b}) { success } }`,
    {id:issueId,b:appendUsage(`Verbrauch für ${issues.join(", ")} (SIN-911):`,usage,{...meta,issues})});
}

export async function privateWeekUsage(prs, repository, call = linear) {
  const cache = new Map(), seen = new Set(), rows = [];
  for (const pr of prs) {
    const ids = [...new Set(pr.title.match(/SIN-\d+/g) ?? [])];
    const marks = new Map(parseUsageMarks(pr.body).filter(m => m.run).map(m => [m.run,m]));
    for (const id of ids) {
      if (!cache.has(id)) cache.set(id,await issueComments(id,call));
      for (const c of cache.get(id).comments) for (const m of parseUsageMarks(c.body)) {
        if (m.repository === repository && m.run && m.branch === pr.head?.ref
          && Date.parse(m.at) >= Date.parse(pr.created_at) && Date.parse(m.at) <= Date.parse(pr.merged_at)) marks.set(m.run,m);
      }
    }
    const body = [...marks.values()].filter(m => !seen.has(m.run) && seen.add(m.run))
      .map(m => `<!-- usage: ${JSON.stringify(m)} -->`).join("\n");
    rows.push({title:pr.title,body});
  }
  return weekUsage(rows);
}
