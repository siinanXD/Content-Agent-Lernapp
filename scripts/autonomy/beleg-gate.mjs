/**
 * Prüfer-Beleg-Gate (SIN-1001, Weg A 4b/8): Bei `claude/`- und `codex/`-PRs verlangt `merge-gate` einen
 * Beleg des Leitstand-Prüfers für den aktuellen Head. Rein, kein Netz.
 *
 * shortcut: Kopie der Leitstand-Logik (dort `beleg-gate.mjs`, SIN-939), nicht abgerufen; Formatänderung dort
 * hier nachziehen oder auf Abruf umstellen, sobald der Leitstand sie veröffentlicht.
 *
 * Beleg = PR-Kommentar des Bots mit `<!-- pruefer-beleg sha=<Head> urteil=ok run=<Lauf-Link> -->`
 * oder der Kommentar des Leitstand-Prüfers (`pruefer.yml`, schreibt als Repo-Owner): `pruefer-zweites-modell`,
 * Urteil in der Überschrift, `<!-- pruefer-stand:<Head>:<Hash> -->`.
 */
export const BELEG_BRANCHES = /^(claude|codex)\//;
const BELEG_RE = /<!-- pruefer-beleg sha=([0-9a-f]{7,40}) urteil=(\w+)(?: run=(\S+))? -->/g;
const BELEG_AUTOREN = ["github-actions[bot]", "claude[bot]"];
const STAND_RE = /<!-- pruefer-stand:([0-9a-f]{40}):[0-9a-f]{16} -->/;
const URTEIL_RE = /### Prüfer \(zweites Modell\): ([^\n]+)/;

/** @param {{ branch: string, headSha: string, comments: { user?: string, owner?: boolean, body?: string }[] }} p */
export function belegGate({ branch, headSha, comments }) {
  if (!BELEG_BRANCHES.test(branch ?? "")) return { noetig: false, ok: true, grund: "kein claude/- oder codex/-Branch" };
  let letzter = null;
  for (const c of comments) {
    const stand = c.owner && (c.body ?? "").includes("<!-- pruefer-zweites-modell -->") ? STAND_RE.exec(c.body ?? "") : null;
    if (stand && stand[1] === headSha) letzter = { urteil: URTEIL_RE.exec(c.body ?? "")?.[1].trim() === "bestanden" ? "ok" : "offen", run: null };
    if (!BELEG_AUTOREN.includes(c.user ?? "")) continue;
    for (const m of (c.body ?? "").matchAll(BELEG_RE)) {
      if (headSha.startsWith(m[1]) || m[1] === headSha) letzter = { urteil: m[2], run: m[3] ?? null };
    }
  }
  if (!letzter) return { noetig: true, ok: false, grund: `Kein Prüfer-Beleg für den Head ${headSha.slice(0, 7)}.` };
  if (letzter.urteil !== "ok") return { noetig: true, ok: false, grund: `Prüfer-Urteil für ${headSha.slice(0, 7)}: ${letzter.urteil}.`, run: letzter.run };
  return { noetig: true, ok: true, grund: "Prüfer-Beleg vorhanden", run: letzter.run };
}
