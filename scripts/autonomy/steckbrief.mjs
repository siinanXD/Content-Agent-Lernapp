/**
 * PR-Steckbrief (SIN-248): der Gate-Kommentar, lesbar am Handy in 15 Sekunden.
 * Reine Funktionen ohne Netz, damit pr-gate sie testbar aus main laden kann.
 * Feste Reihenfolge: Von dir gebraucht, Was sich ändert, Spur und Issue, Risiko, Checks,
 * Ansehen, Nach dem Merge, Kosten/Folgen, Rückgängig.
 */

export const MARKER = "<!-- pr-gate -->";
export const KEYS_RE = /<!-- pr-gate approved-keys: (\[.*?\]) -->/;
const LINEAR = "https://linear.app/sinan-kahraman/issue";

/** Abschnitte der PR-Beschreibung (Überschrift `## Name` oder `**Name**`), Schlüssel klein geschrieben. */
export const SECTIONS = {
  change: ["was ändert sich"],
  try: ["ausprobieren"],
  after: ["nach dem merge"],
  cost: ["kosten", "kosten/folgen", "kosten und folgen"],
  revert: ["rückgängig"],
  decision: ["entscheidung nötig"],
};

/** Zerlegt den PR-Body in Abschnitte. @returns {Record<string, string>} Schlüssel aus SECTIONS */
export function parseBody(body = "") {
  const text = String(body).replace(/<!--[\s\S]*?-->/g, "").replace(/\r/g, "");
  const found = {};
  let current = null;
  for (const line of text.split("\n")) {
    const head = line.match(/^\s*(?:#{1,6}\s*|\*\*)(.+?)(?:\*\*)?\s*:?\s*$/);
    if (head) {
      const name = head[1].replace(/[*:]/g, "").trim().toLowerCase();
      const key = Object.keys(SECTIONS).find((k) => SECTIONS[k].includes(name));
      if (key) {
        current = key;
        found[key] = "";
        continue;
      }
      if (/^\s*#{1,6}\s/.test(line)) current = null;
    }
    if (current) found[current] += `${line}\n`;
  }
  for (const k of Object.keys(found)) {
    found[k] = found[k].trim();
    if (!found[k] || /^[-*\s]*$/.test(found[k])) delete found[k];
  }
  return found;
}

/** Linear-ID aus Titel, Branch oder Body. */
export function issueId({ title = "", branch = "", body = "" }) {
  return (`${title} ${branch} ${body}`.match(/SIN-\d+/i) ?? [])[0]?.toUpperCase() ?? null;
}

const FRONTEND = /^(src\/app\/|src\/components\/|public\/|src\/.*\.css$)/;
const CONTENT = /^(docs\/content\/|content\/|data\/)/;
const INFRA = /^(\.github\/|scripts\/|vercel\.json|next\.config|infra\/|docker)/;

/** Spur nach den geänderten Dateien: Frontend, Content, Infra, sonst Backend. Frontend zuerst, weil sichtbar. */
export function laneFromFiles(files = []) {
  const names = files.map((f) => f.filename);
  if (names.some((n) => FRONTEND.test(n) && !/\.test\.[tj]sx?$/.test(n) && !/\/api\//.test(n))) return "Frontend";
  if (names.some((n) => CONTENT.test(n))) return "Content";
  if (names.length && names.every((n) => INFRA.test(n) || /^docs\//.test(n))) return "Infra";
  return "Backend";
}

const FIRST_LINES = 4;
const short = (text, max = FIRST_LINES) =>
  text.split("\n").map((l) => l.replace(/^\s*[-*]\s+/, "").trim()).filter(Boolean).slice(0, max);

/**
 * Check-Zustand je Anzeige: ok, run (läuft), wait (wartet auf Freigabe), fail, none.
 * `build` bündelt die Jobs-Schritte: Tests (Unit tests), a11y (Playwright-Schritt).
 * @param {{ name: string, status: string, conclusion: string | null }} run
 */
export function checkState(run) {
  if (!run) return "none";
  if (run.status !== "completed") return "run";
  if (["success", "skipped", "neutral"].includes(run.conclusion)) return "ok";
  return "fail";
}

const ICON = { ok: "✅", run: "⏳", wait: "🟠", fail: "❌", none: "⏳" };

/**
 * @param {{
 *   title: string, branch?: string, body?: string, labels?: string[], files?: { filename: string, status?: string }[],
 *   risk: "risk:medium" | "risk:high", reasons: { category: string, text: string }[], approved: boolean,
 *   checks?: { build?: string, tests?: string, a11y?: string, prTitle?: string },
 *   previewUrl?: string | null, owner?: string, note?: string,
 *   approvedKeys?: string[] | null,
 * }} input
 * @returns {{ status: "ok" | "wait" | "decision" | "run", body: string, mention: boolean }}
 */
export function buildSteckbrief(input) {
  const {
    title, branch = "", body = "", labels = [], files = [], risk, reasons, approved,
    checks = {}, previewUrl = null, owner = "siinanXD", note = "",
  } = input;
  const sec = parseBody(body);
  const high = risk === "risk:high";
  const repairRound = [3, 2, 1].find((n) => labels.includes(`repair:${n}`)) ?? 0;
  const lane = laneFromFiles(files);
  const id = issueId({ title, branch, body });
  const principle = reasons.filter((r) => r.category === "grundsatz");

  // Merge-Gate: bei risk:high ohne Freigabe „wartet“ (gelb), sonst folgt es den übrigen Checks.
  const waiting = high && !approved;
  const base = [checks.build, checks.tests, checks.a11y, checks.prTitle];
  const failing = base.includes("fail");
  const running = base.some((s) => s === "run" || s === "none" || s === undefined);
  const gate = waiting ? "wait" : failing || running ? "run" : "ok";

  let status;
  let need;
  if (sec.decision || labels.includes("needs-human")) {
    status = "decision";
    need = sec.decision
      ? `🔴 **Entscheidung nötig:** ${short(sec.decision, 6).join(" ")}`
      : "🔴 **Entscheidung nötig:** Die Reparatur ist nach 3 Runden gescheitert. Weitermachen, ändern oder verwerfen?";
  } else if (waiting) {
    status = "wait";
    const why = reasons.slice(0, 2).map((r) => r.text).join("; ") || "hohes Risiko";
    need = `🟠 **Freigabe:** Label \`freigegeben\` setzen. Grund: ${why}.`;
  } else if (failing || running || repairRound) {
    status = "run";
    need = failing || repairRound
      ? `⏳ **Noch nichts:** Reparatur läuft (Runde ${Math.max(repairRound, 1)}/3).`
      : "⏳ **Noch nichts:** Checks laufen.";
  } else {
    status = "ok";
    need = "✅ **Nichts.** Mergt automatisch, sobald die Checks grün sind.";
  }

  const change = sec.change ? short(sec.change) : short(body.replace(/^\s*Part of SIN-\d+\s*/im, "")).slice(0, 2);
  const riskLine = high
    ? `**high**: ${reasons.slice(0, 3).map((r) => r.text).join("; ")}`
    : "low/medium: keine High-Gründe";
  const migration = files.some((f) => /(^|\/)migrations\/.+\.sql$/.test(f.filename));
  const visible = lane === "Frontend";
  const tryPath = sec.try ? short(sec.try, 1)[0] : null;

  const lines = [
    MARKER,
    ...(approved ? [`<!-- pr-gate approved-keys: ${JSON.stringify(input.approvedKeys ?? [])} -->`] : []),
    `### ${need}`,
    ...(status === "wait" || status === "decision" ? [`@${owner}`] : []),
    ...(note ? ["", `_${note}_`] : []),
    "",
    "**Was sich ändert**",
    ...(change.length ? change.map((l) => `- ${l}`) : ["- Siehe PR-Titel: " + title]),
    "",
    `**Spur und Issue:** ${lane}${id ? ` · [${id}](${LINEAR}/${id})` : ""}`,
    `**Risiko:** ${riskLine}`,
    ...(principle.length ? ["> ⚠️ **Grundsatz-Änderung:** " + principle.map((r) => r.text).join("; ")] : []),
    `**Checks:** ${ICON[checks.build ?? "none"]} build · ${ICON[checks.tests ?? "none"]} Tests · ${ICON[checks.a11y ?? "none"]} a11y · ${ICON[checks.prTitle ?? "none"]} pr-title · ${ICON[gate]} merge-gate${waiting ? " (wartet auf Freigabe, nicht rot)" : ""}`,
    `**Ansehen:** ${
      visible
        ? `${previewUrl ? `[Vorschau](${previewUrl})` : "Vorschau noch nicht da"}${tryPath ? ` · ${tryPath}` : ""}`
        : "Nichts sichtbar."
    }`,
    `**Nach dem Merge:** ${sec.after ? short(sec.after, 2).join(" ") : migration ? "Die Migration läuft." : "Nichts Besonderes."}`,
    ...(sec.cost ? [`**Kosten/Folgen:** ${short(sec.cost, 3).join(" ")}`] : []),
    `**Rückgängig:** ${sec.revert ? short(sec.revert, 2).join(" ") : migration ? "Nicht trivial: Migration, Revert-PR genügt nicht allein." : "Revert-PR genügt."}`,
    ...(high && reasons.length ? ["", "<details><summary>Gründe für risk:high</summary>", "", ...reasons.slice(0, 15).map((r) => `- ${r.text}`), "", "</details>"] : []),
  ];
  return { status, body: lines.join("\n"), mention: status === "wait" || status === "decision" };
}
