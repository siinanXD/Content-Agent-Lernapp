/**
 * Risiko-Gate (SIN-223): Standard ist `risk:medium`. `risk:high` gibt es nur bei
 * Secret-Leak, Datenverlust, geschwächter Sicherheit, Zahlungen, Grundsatz-Entscheidungen und
 * jeder Änderung unter `.github/workflows/` (SIN-234).
 * Reine Funktionen ohne Netz, damit pr-gate sie testbar aus main laden kann.
 */

/** @typedef {{ filename: string, previous_filename?: string, status?: string, patch?: string }} GateFile */

const PRINCIPLE_PATHS = [/^docs\/PRODUCT\.md$/, /^docs\/ARCHITECTURE\.md$/, /^docs\/design\//];
const PAYMENT_PATH = /(billing|payment|stripe|checkout)/i;
const AUTH_PATH = [/(^|\/)(middleware|proxy)\.(ts|js)$/, /(^|\/)auth(\/|\.|-|_)/i];
const ENV_FILE = /(^|\/)\.env(\.[\w.-]+)?$/;
const MIGRATION = /(^|\/)migrations\/.+\.sql$/;
const WORKFLOW = /^\.github\/workflows\/.+\.ya?ml$/;
const FRAMEWORK_DEPS = ["next", "react", "@supabase/supabase-js"];
const SECRET_VALUE = /^(sk-|sk_|pk_live|ghp_|github_pat_|xox[abp]-|eyJ|AKIA|lin_api_)|^[A-Za-z0-9+/_-]{32,}$/;
const WRITE_PERMISSION = /^\s*(permissions:\s*write-all|[a-z-]+:\s*write)\s*$/;

const DATA_LOSS =
  /\b(drop\s+(table|column|schema|view|index|constraint|type|function)|delete\s+from|truncate)\b|\balter\b[^;]*\bdrop\b/i;
const SECURITY_SQL = [
  /\bdisable\s+row\s+level\s+security\b/i,
  /\bno\s+force\s+row\s+level\s+security\b/i,
  /\bdrop\s+policy\b/i,
  /\bgrant\b[^;]*\bto\b[^;]*\b(anon|public)\b/i,
  /\bsecurity_invoker\s*=\s*(false|off)\b/i,
  /\bcreate\s+policy\b[^;]*\b(using|with\s+check)\s*\(\s*true\s*\)/i,
];

/** Zeilen eines Unified-Diffs: hinzugefügt und entfernt (ohne Header). */
export function patchLines(patch = "") {
  const added = [];
  const removed = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) added.push(line.slice(1));
    else if (line.startsWith("-") && !line.startsWith("---")) removed.push(line.slice(1));
  }
  return { added, removed };
}

function stripSqlComments(line) {
  return line.replace(/--.*$/, "").trim();
}

function depKeys(lines) {
  const keys = new Set();
  for (const l of lines) {
    const m = l.match(/^\s*"([^"]+)"\s*:\s*"[^"]*",?\s*$/);
    if (m && FRAMEWORK_DEPS.includes(m[1])) keys.add(m[1]);
  }
  return keys;
}

/**
 * @param {{ files: GateFile[], labels?: string[], isFork?: boolean, secretLeak?: boolean }} input
 * @returns {{ risk: "risk:medium" | "risk:high", reasons: { key: string, category: string, text: string }[] }}
 */
export function classifyRisk({ files, labels = [], isFork = false, secretLeak = false }) {
  const reasons = [];
  const add = (category, detail) =>
    reasons.push({ key: `${category}:${detail}`, category, text: `${category}: ${detail}` });

  if (secretLeak) add("secret", "gitleaks hat einen Fund gemeldet");
  if (isFork) add("sicherheit", "PR kommt aus einem Fork");
  if (labels.includes("owner-approval-required")) add("grundsatz", "Label `owner-approval-required`");

  for (const f of files) {
    const paths = [f.filename, f.previous_filename].filter(Boolean);
    const { added, removed } = patchLines(f.patch);

    for (const p of paths) {
      if (PRINCIPLE_PATHS.some((r) => r.test(p))) add("grundsatz", p);
      if (PAYMENT_PATH.test(p)) add("zahlung", p);
      if (AUTH_PATH.some((r) => r.test(p))) add("sicherheit", `Auth/Middleware ${p}`);
    }

    if (ENV_FILE.test(f.filename)) {
      const isExample = /\.(example|sample|template)$/.test(f.filename);
      for (const l of added) {
        const m = l.match(/^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*["']?([^"'#\s]+)/);
        if (!m) continue;
        if (!isExample || SECRET_VALUE.test(m[1])) add("secret", `Wert in ${f.filename}`);
      }
    }

    if (MIGRATION.test(f.filename)) {
      // Migrationen nur hinzufügen: Ändern, Löschen oder Umbenennen einer bestehenden ist ein Datenrisiko.
      if (f.status && f.status !== "added") add("datenverlust", `bestehende Migration ${f.status}: ${f.filename}`);
      for (const raw of added) {
        const l = stripSqlComments(raw);
        if (DATA_LOSS.test(l)) add("datenverlust", `${f.filename}: ${l.slice(0, 80)}`);
        if (SECURITY_SQL.some((r) => r.test(l))) add("sicherheit", `${f.filename}: ${l.slice(0, 80)}`);
      }
    }

    // SIN-234: Agenten dürfen Workflows pushen, jede Änderung braucht aber Sinans Freigabe.
    const workflowPath = paths.find((p) => WORKFLOW.test(p));
    if (workflowPath) add("workflow", workflowPath);

    if (WORKFLOW.test(f.filename)) {
      const before = new Set(removed.map((l) => l.trim()));
      for (const l of added) {
        if (before.has(l.trim())) continue;
        if (WRITE_PERMISSION.test(l)) add("sicherheit", `Workflow-Recht erweitert in ${f.filename}: ${l.trim()}`);
        if (/^\s*pull_request_target\s*:/.test(l)) add("sicherheit", `pull_request_target neu in ${f.filename}`);
      }
    }

    if (f.filename === "package.json") {
      const a = depKeys(added);
      const r = depKeys(removed);
      for (const k of FRAMEWORK_DEPS) {
        if (a.has(k) !== r.has(k)) add("grundsatz", `Framework/DB-Abhängigkeit ${k} hinzugefügt oder entfernt`);
      }
    }
  }

  const unique = [...new Map(reasons.map((r) => [r.key, r])).values()];
  return { risk: unique.length ? "risk:high" : "risk:medium", reasons: unique };
}

/**
 * Die Freigabe überlebt Folge-Commits, solange kein neuer High-Grund dazukommt.
 * @param {string[] | null} approvedKeys Gründe, die bei der Freigabe galten (null = keine Freigabe)
 * @param {{ key: string }[]} current aktuelle High-Gründe
 */
export function approvalStillValid(approvedKeys, current) {
  if (!approvedKeys) return false;
  const known = new Set(approvedKeys);
  return current.every((r) => known.has(r.key));
}
