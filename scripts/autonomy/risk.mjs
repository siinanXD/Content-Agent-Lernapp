/**
 * Risiko-Gate (SIN-223, gelockert mit SIN-252, SIN-547 und SIN-811): Standard ist `risk:low` (Auto-Merge ohne Frist). `risk:high` gibt es nur bei
 * Secret-Leak, Datenverlust, Auth/RLS/Service-Role-Key im Client, Geld, unbestätigten npm-Abhängigkeiten,
 * `docs/PRODUCT.md`, Fork, `pull_request_target`, neuen Secrets, Drittanbieter-Actions außerhalb der Liste und Branch-Protection.
 * Workflow-Rechte, das Gate selbst und übrige Grundsatz-Änderungen sind `risk:medium` mit Einspruchsfrist
 * (`einspruch` im Ergebnis, `EINSPRUCH_MINUTEN`): Auto-Merge erst danach, Sinan stoppt mit `no-automerge`.
 * Normale Workflow-Änderungen, Design-Tokens aus Figma, Docs und Tests sind `risk:low`: keine Frist.
 * `classifyRisk` ist eine reine Funktion ohne Netz, damit pr-gate sie testbar aus main laden kann.
 * Nur `fetchDependencyInfo` ruft npm und GitHub ab; pr-gate reicht das Ergebnis als `depInfo` herein.
 */

/** @typedef {{ filename: string, previous_filename?: string, status?: string, patch?: string }} GateFile */

export const EINSPRUCH_MINUTEN = 30;
const PRINCIPLE_PATHS = [/^docs\/PRODUCT\.md$/];
// Das Gate selbst: Frist statt Freigabe (SIN-547). Branch-Protection als Datei bleibt high.
const GATE_PATHS = [/^\.github\/workflows\/(pr-gate|dispatch)\.ya?ml$/, /^scripts\/autonomy\/risk\.mjs$/];
const PROTECTION_PATHS = [/^\.github\/(rulesets?\/|settings\.ya?ml$)/];
const PAYMENT_PATH = /(billing|payment|stripe|checkout|(^|\/)pricing?(\/|\.)|(^|\/)prices?(\/|\.))/i;
const MONEY_LINE = /\b(sk_live|pk_live|rk_live)\b|STRIPE_[A-Z_]*LIVE|livemode\s*[:=]\s*true/i;
const SERVICE_ROLE = /service_role/i;
const PUBLIC_SERVICE_ROLE = /NEXT_PUBLIC_\w*SERVICE_ROLE/i;
const CLIENT_FILE = /(\.(tsx|jsx)$|(^|\/)components\/)/;
const TRUSTED_ACTION_OWNERS = ["actions", "anthropics"];
const AUTH_PATH = [/(^|\/)(middleware|proxy)\.(ts|js)$/, /(^|\/)auth(\/|\.|-|_)/i];
const ENV_FILE = /(^|\/)\.env(\.[\w.-]+)?$/;
const MIGRATION = /(^|\/)migrations\/.+\.sql$/;
const WORKFLOW = /^\.github\/workflows\/.+\.ya?ml$/;
const FRAMEWORK_DEPS = ["next", "react", "@supabase/supabase-js"];
const SECRET_VALUE = /^(sk-|sk_|pk_live|ghp_|github_pat_|xox[abp]-|eyJ|AKIA|lin_api_)|^[A-Za-z0-9+/_-]{32,}$/;
const WRITE_PERMISSION = /^\s*(permissions:\s*write-all|[a-z-]+:\s*write)\s*$/;
const VERSION_VALUE = /^(npm:.+|latest|[\^~<>=\s]*\d[\w.\-+ |<>=^~]*)$/;

const DATA_LOSS =
  /\b(drop\s+(table|column|schema|view|index|constraint|type|function)|delete\s+from|truncate)\b|\balter\b[^;]*\b(drop|rename)\b/i;
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

/** Wörter einer Zeile, um zu sehen, ob eine Liste (z. B. allowedTools) wächst. */
const tokens = (l) => l.split(/[\s,"'=:;()]+/).filter(Boolean);

/** Neu hinzugefügte npm-Abhängigkeiten (Name nicht in den entfernten Zeilen) aus der package.json. */
export function newDependencies(files) {
  const names = new Set();
  for (const f of files) {
    if (f.filename !== "package.json") continue;
    const { added, removed } = patchLines(f.patch);
    const had = new Set();
    for (const l of removed) {
      const m = l.match(/^\s*"([^"]+)"\s*:/);
      if (m) had.add(m[1]);
    }
    for (const l of added) {
      const m = l.match(/^\s*"([^"]+)"\s*:\s*"([^"]*)",?\s*$/);
      if (m && VERSION_VALUE.test(m[2]) && !had.has(m[1])) names.add(m[1]);
    }
  }
  return [...names];
}

/** Regel aus AGENTS.md: Lizenz MIT oder Apache und mehr als 500 Sterne. */
export function dependencyOk(info) {
  return Boolean(info && /^(MIT|Apache-2\.0)\b/i.test(info.license ?? "") && Number(info.stars) > 500);
}

/** Holt Lizenz (npm) und Sterne (GitHub) je Paket. Jeder Fehler ergibt `null` und damit risk:high. */
export async function fetchDependencyInfo(names, fetchFn = fetch, githubToken = "") {
  const out = {};
  for (const name of names) {
    try {
      const res = await fetchFn(`https://registry.npmjs.org/${name.replaceAll("/", "%2F")}/latest`);
      if (!res.ok) {
        out[name] = null;
        continue;
      }
      const pkg = await res.json();
      const license = typeof pkg.license === "string" ? pkg.license : (pkg.license?.type ?? "");
      const repoUrl = typeof pkg.repository === "string" ? pkg.repository : (pkg.repository?.url ?? "");
      const m = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.#]+)/);
      let stars = 0;
      if (m) {
        const gh = await fetchFn(`https://api.github.com/repos/${m[1]}/${m[2]}`, {
          headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : {},
        });
        if (gh.ok) stars = (await gh.json()).stargazers_count ?? 0;
      }
      out[name] = { license, stars };
    } catch {
      out[name] = null;
    }
  }
  return out;
}

/** SIN-516: Secret-Namen (nie Werte) aus Workflow-Texten, z. B. aller Dateien unter .github/workflows/ auf main. */
export function secretNames(texts) {
  const names = new Set();
  for (const t of texts) for (const m of t.matchAll(/\bsecrets\.([A-Za-z0-9_]+)/g)) names.add(m[1]);
  return [...names];
}

/**
 * @param {{ files: GateFile[], labels?: string[], isFork?: boolean, secretLeak?: boolean, depInfo?: Record<string, { license: string, stars: number } | null>, knownSecrets?: string[], trustedOwners?: string[] }} input
 * @returns {{ risk: "risk:low" | "risk:medium" | "risk:high", reasons: { key: string, category: string, text: string }[], einspruch: { key: string, category: string, text: string }[] }}
 *   `reasons` sind nur High-Gründe; `einspruch` sind die Gründe, die medium bleiben, aber die Frist auslösen.
 */
export function classifyRisk({ files, labels = [], isFork = false, secretLeak = false, depInfo = {}, knownSecrets = [], trustedOwners = [] }) {
  const known = new Set(knownSecrets);
  const owners = new Set([...TRUSTED_ACTION_OWNERS, ...trustedOwners]);
  const reasons = [];
  const einspruch = [];
  const mk = (category, detail) => ({ key: `${category}:${detail}`, category, text: `${category}: ${detail}` });
  const add = (category, detail) => reasons.push(mk(category, detail));
  const addFrist = (category, detail) => einspruch.push(mk(category, detail));

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
      if (GATE_PATHS.some((r) => r.test(p))) addFrist("gate", `Das Gate selbst: ${p}`);
      if (PROTECTION_PATHS.some((r) => r.test(p))) add("sicherheit", `Branch-Protection ${p}`);
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

    // SIN-252: Workflow-Änderungen sind normal (medium). High nur bei mehr Rechten (Punkt 6).
    if (WORKFLOW.test(f.filename)) {
      const before = new Set(removed.map((l) => l.trim()));
      const beforeTokens = new Set(removed.flatMap(tokens));
      const beforeText = removed.join("\n");
      for (const l of added) {
        if (before.has(l.trim())) continue;
        if (WRITE_PERMISSION.test(l)) addFrist("workflow-recht", `Workflow-Recht erweitert in ${f.filename}: ${l.trim()}`);
        if (/^\s*pull_request_target\s*:/.test(l)) add("workflow-recht", `pull_request_target neu in ${f.filename}`);
        for (const m of l.matchAll(/\bsecrets\.([A-Za-z0-9_]+)/g)) {
          const wasUsed = new RegExp(`secrets\\.${m[1]}\\b`).test(beforeText);
          if (m[1] === "GITHUB_TOKEN" || wasUsed) continue;
          if (known.has(m[1])) addFrist("workflow-recht", `Secret ${m[1]} in ${f.filename}`);
          else add("workflow-recht", `neues Secret ${m[1]} in ${f.filename}`);
        }
        if (/allowed[_-]?(tools|bots)/i.test(l) && tokens(l).some((t) => !beforeTokens.has(t))) {
          addFrist("workflow-recht", `allowedTools/allowed_bots erweitert in ${f.filename}: ${l.trim().slice(0, 80)}`);
        }
        const u = l.match(/^\s*-?\s*uses:\s*([^\s@#]+)/);
        if (u && !u[1].startsWith("./")) {
          const seen = removed.some((r) => r.includes(u[1]));
          const owner = u[1].split("/")[0];
          if (!seen && !TRUSTED_ACTION_OWNERS.includes(owner)) {
            if (owners.has(owner)) addFrist("workflow-recht", `Action ${u[1]} in ${f.filename}`);
            else add("workflow-recht", `neue Drittanbieter-Action ${u[1]} in ${f.filename}`);
          }
        }
      }
    }

    // Geld (Live-Schalter) und Service-Role-Key im Client.
    for (const l of added) {
      if (MONEY_LINE.test(l)) add("zahlung", `Live-Schalter in ${f.filename}`);
      if (PUBLIC_SERVICE_ROLE.test(l)) add("sicherheit", `Service-Role-Key öffentlich in ${f.filename}`);
      else if (SERVICE_ROLE.test(l) && CLIENT_FILE.test(f.filename)) {
        add("sicherheit", `Service-Role-Key im Client ${f.filename}`);
      }
    }

    if (f.filename === "package.json") {
      const a = depKeys(added);
      const r = depKeys(removed);
      for (const k of FRAMEWORK_DEPS) {
        if (a.has(k) !== r.has(k)) addFrist("grundsatz", `Framework/DB-Abhängigkeit ${k} hinzugefügt oder entfernt`);
      }
    }
  }

  // Neue npm-Abhängigkeiten: nur mit MIT/Apache und mehr als 500 Sternen medium, sonst (oder ungeprüft) high.
  for (const name of newDependencies(files)) {
    if (!dependencyOk(depInfo[name])) {
      add("abhaengigkeit", `neue npm-Abhängigkeit ${name} (Lizenz/Sterne nicht bestätigt)`);
    }
  }

  const uniq = (list) => [...new Map(list.map((r) => [r.key, r])).values()];
  const unique = uniq(reasons);
  const frist = uniq(einspruch);
  return { risk: unique.length ? "risk:high" : frist.length ? "risk:medium" : "risk:low", reasons: unique, einspruch: frist };
}

const FRIST_RE = /<!-- pr-gate-einspruch sha=(\w+) bis=(\d+)(?: gruende=(\w+))? -->/;

/** Kurzer, stabiler Fingerabdruck der Frist-Gründe (Reihenfolge egal). */
const gruendeHash = (keys) => [...new Set(keys)].sort().join("|").split("").reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 7).toString(36);

/**
 * Einspruchsfrist (SIN-547): Zeitstempel `bis` (ms) im Fristkommentar. Ein neuer Commit startet die Frist nur neu,
 * wenn sich die Frist-Gründe ändern. Ein Commit, der nur main einmergt, behält die Frist; sonst lief sie bei
 * jedem Merge von main erneut 2 h und der PR mergte nie (#425/#426 am 19.10.).
 * @param {string | undefined} body Text des Fristkommentars (oder undefined)
 * @param {string[]} [gruende] Schlüssel der aktuellen Frist-Gründe (`einspruch[].key`)
 * @returns {{ bis: number, comment: string, neu: boolean, vorbei: boolean }}
 */
export function einspruchFrist(body, sha, now = Date.now(), gruende) {
  const m = body?.match(FRIST_RE);
  const hash = gruende ? gruendeHash(gruende) : null;
  const gleicherHead = !!m && m[1] === sha;
  const gleicheGruende = !!m && !!hash && m[3] === hash;
  const neu = !gleicherHead;
  const bis = gleicherHead || gleicheGruende ? Number(m[2]) : now + EINSPRUCH_MINUTEN * 60_000;
  return { bis, neu, vorbei: now >= bis, comment: `<!-- pr-gate-einspruch sha=${sha} bis=${bis}${hash ? ` gruende=${hash}` : ""} -->` };
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

/**
 * Die High-Gründe, die zur Freigabe noch nicht galten (SIN-511). Leer = Freigabe bleibt.
 * @param {string[] | null} approvedKeys
 * @param {{ key: string, text: string }[]} current
 */
export function newReasons(approvedKeys, current) {
  const known = new Set(approvedKeys ?? []);
  return current.filter((r) => !known.has(r.key));
}
