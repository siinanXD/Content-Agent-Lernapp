/**
 * SIN-846: Lese-Prüfer für Content-Agent-Lernapp. Nur feste Belege-Proben;
 * nutzt SUPABASE_PRUEFER_URL (Postgres-Rolle ohne Schreibrechte), nie Service-Role.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { bewerte, leseHaken, leseProbe, nurBelege, setzeHaken } from "../../src/lib/belege/belege";
import { comment, fetchComments, fetchProjectIssues, linear, setState } from "../autonomy/linear.mjs";

const env = process.env;
const DRY = env.DRY_RUN === "1";
const repo = env.GITHUB_REPOSITORY ?? "siinanXD/Content-Agent-Lernapp";
const MARKER = "<!-- belege-pruefer -->";
const sh = promisify(execFile);

async function sql(query: string): Promise<string> {
  if (!env.SUPABASE_PRUEFER_URL) throw new Error("SUPABASE_PRUEFER_URL fehlt");
  const { stdout } = await sh("psql", [env.SUPABASE_PRUEFER_URL, "-v", "ON_ERROR_STOP=1", "-tA", "-c", query]);
  return stdout.trim();
}

/** Vor jedem Lauf sicherstellen, dass das verwendete DB-Konto keine Schreibrechte hat. */
async function leseprobe(): Promise<void> {
  const writeGrants = await sql("select count(*) from information_schema.role_table_grants where grantee = current_user and table_schema = 'public' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')");
  if (writeGrants !== "0") throw new Error(`Prüfer-Rolle hat ${writeGrants} Schreibrechte; Abbruch.`);
}

async function messe(probe: NonNullable<ReturnType<typeof leseProbe>>): Promise<{ wert: number | string; link: string }> {
  if (probe.art === "zaehlung") {
    // leseProbe erlaubt ausschließlich kleingeschriebene SQL-Identifier.
    return { wert: Number(await sql(`select count(*) from public."${probe.tabelle}"`)), link: "" };
  }
  if (!env.GH_TOKEN) throw new Error("GH_TOKEN fehlt");
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${probe.workflow}/runs?per_page=1&status=completed`, {
    headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub ${probe.workflow}: ${res.status}`);
  const runs = (await res.json()) as { workflow_runs?: { conclusion: string; html_url: string }[] };
  const run = runs.workflow_runs?.[0];
  return { wert: run?.conclusion ?? "kein Run", link: run?.html_url ?? "" };
}

async function main(): Promise<void> {
  const issues = await fetchProjectIssues();
  const candidates = issues.filter((issue) => {
    const labels = (issue.labels?.nodes ?? []).map((label) => label.name.toLowerCase());
    return issue.state.type !== "backlog"
      && labels.includes("claude")
      && !labels.includes("needs-human")
      && nurBelege(issue.description);
  });
  console.log(`${candidates.length} Issue(s) mit ausschließlich offenen Belege-Haken`);
  if (!candidates.length) return;

  await leseprobe();
  for (const issue of candidates) {
    const description = issue.description ?? "";
    const belegt: string[] = [];
    const offen: string[] = [];
    const zeilen: string[] = [];

    for (const haken of leseHaken(description).filter((h) => !h.erledigt)) {
      const probe = leseProbe(haken.text);
      if (!probe) {
        offen.push(`${haken.text} (keine Probe im Haken)`);
        continue;
      }
      try {
        const { wert, link } = await messe(probe);
        const result = bewerte(probe, wert);
        const proof = link ? `${result.beleg}, ${link}` : result.beleg;
        (result.belegt ? belegt : offen).push(result.belegt ? haken.text : `${haken.text} (${proof})`);
        if (result.belegt) zeilen.push(`- [x] ${haken.text}: ${proof}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message.split("\n")[0] : "unbekannt";
        offen.push(`${haken.text} (Probe scheiterte: ${reason})`);
      }
    }

    const fertig = offen.length === 0;
    const body = [
      MARKER,
      fertig ? "Prüfer: alle Beleg-Haken belegt, Done." : "Prüfer: offen, weil",
      ...zeilen,
      ...offen.map((reason) => `- [ ] ${reason}`),
    ].join("\n");

    if (DRY) {
      console.log(`[trocken] ${issue.identifier}\n${body}`);
      continue;
    }

    const comments = await fetchComments(issue.id);
    if (belegt.length) {
      const updated = setzeHaken(description, belegt);
      await linear("mutation($id: String!, $d: String!) { issueUpdate(id: $id, input: { description: $d }) { success } }", {
        id: issue.id,
        d: updated,
      });
    }
    if (!comments.some((item) => item.body === body)) await comment(issue.id, body);
    if (fertig) await setState(issue, "Done");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
