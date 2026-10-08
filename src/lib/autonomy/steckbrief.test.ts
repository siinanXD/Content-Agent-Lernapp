import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSteckbrief, diagrammHinweis, laneFromFiles, parseBody } from "../../../scripts/autonomy/steckbrief.mjs";

const green = { build: "ok", tests: "ok", a11y: "ok", prTitle: "ok" };
const base = {
  title: "feat(lernpfad): Fortschrittsbalken (SIN-123)",
  branch: "claude/sin-123",
  body: "Part of SIN-123\n\n## Was ändert sich\n- Lernpfad zeigt jetzt einen Fortschrittsbalken.\n\n## Ausprobieren\nStartseite → Los geht’s → Einverstanden\n",
  labels: [] as string[],
  files: [{ filename: "src/app/lernpfad/page.tsx" }],
  risk: "risk:medium" as const,
  reasons: [] as { category: string; text: string }[],
  approved: false,
  checks: green,
  previewUrl: "https://vorschau.example/pr-1",
};

test("Steckbrief: ✅ nichts nötig, keine Erwähnung", () => {
  const r = buildSteckbrief(base);
  assert.equal(r.status, "ok");
  assert.equal(r.mention, false);
  assert.ok(!r.body.includes("@siinanXD"));
  assert.match(r.body, /✅ \*\*Nichts\.\*\*/);
  assert.match(r.body, /Frontend · \[SIN-123\]\(https:\/\/linear\.app\/sinan-kahraman\/issue\/SIN-123\)/);
  assert.match(r.body, /\[Vorschau\]\(https:\/\/vorschau\.example\/pr-1\) · Startseite/);
});

test("Steckbrief: ⏳ solange Checks laufen, Reparatur-Runde aus Label", () => {
  const run = buildSteckbrief({ ...base, checks: { ...green, build: "run", tests: "run" } });
  assert.equal(run.status, "run");
  assert.match(run.body, /Checks laufen/);
  const repair = buildSteckbrief({ ...base, labels: ["repair:2"], checks: { ...green, build: "fail" } });
  assert.match(repair.body, /Runde 2\/3/);
  assert.equal(repair.mention, false);
});

test("Steckbrief: 🟠 bei risk:high ohne Freigabe, Gate gelb statt rot, danach ✅", () => {
  const reasons = [{ category: "workflow", text: "workflow: .github/workflows/pr-gate.yml" }];
  const wait = buildSteckbrief({ ...base, risk: "risk:high", reasons });
  assert.equal(wait.status, "wait");
  assert.equal(wait.mention, true);
  assert.match(wait.body, /@siinanXD/);
  assert.match(wait.body, /🟠 merge-gate \(wartet auf Freigabe, nicht rot\)/);
  const done = buildSteckbrief({ ...base, risk: "risk:high", reasons, approved: true, approvedKeys: ["workflow:x"] });
  assert.equal(done.status, "ok");
  assert.ok(!done.body.includes("@siinanXD"));
  assert.match(done.body, /approved-keys: \["workflow:x"\]/);
});

test("Steckbrief: 🔴 bei Entscheidung nötig, Grundsatz markiert", () => {
  const body = `${base.body}\n## Entscheidung nötig\nA oder B?\n- A: schnell\n- B: sauber\n`;
  const r = buildSteckbrief({
    ...base, body, risk: "risk:high", reasons: [{ category: "grundsatz", text: "grundsatz: docs/PRODUCT.md" }],
  });
  assert.equal(r.status, "decision");
  assert.equal(r.mention, true);
  assert.match(r.body, /🔴 \*\*Entscheidung nötig:\*\* A oder B\?/);
  assert.match(r.body, /Grundsatz-Änderung/);
});

test("Steckbrief: Backend-only ohne Vorschau, Migration → Hinweis", () => {
  const r = buildSteckbrief({ ...base, files: [{ filename: "supabase/migrations/001_x.sql" }] });
  assert.match(r.body, /\*\*Ansehen:\*\* Nichts sichtbar\./);
  assert.match(r.body, /Die Migration läuft\./);
  assert.match(r.body, /Nicht trivial/);
});

test("Body-Abschnitte und Spuren", () => {
  const s = parseBody("x\n## Kosten\n\n## Rückgängig\nNur Revert.\n");
  assert.deepEqual(s, { revert: "Nur Revert." });
  assert.equal(laneFromFiles([{ filename: ".github/workflows/a.yml" }, { filename: "docs/x.md" }]), "Infra");
  assert.equal(laneFromFiles([{ filename: "docs/content/MAF.md" }]), "Content");
  assert.equal(laneFromFiles([{ filename: "src/lib/a.ts" }]), "Backend");
});

test("Diagramme (SIN-376): Hinweis, wenn Workflow ohne pipeline.mmd geändert wird", () => {
  const r = buildSteckbrief({ ...base, files: [{ filename: ".github/workflows/dispatch.yml" }] });
  assert.match(r.body, /\*\*Diagramme:\*\* Hinweis, kein Blocker: docs\/diagramme\/pipeline\.mmd/);
  const ok = buildSteckbrief({
    ...base,
    files: [{ filename: ".github/workflows/dispatch.yml" }, { filename: "docs/diagramme/pipeline.mmd" }],
  });
  assert.ok(!ok.body.includes("**Diagramme:**"));
  assert.deepEqual(diagrammHinweis([{ filename: "src/app/ergebnis/page.tsx" }]), ["docs/diagramme/nutzerwege.mmd"]);
  assert.deepEqual(diagrammHinweis([{ filename: "src/lib/x.ts" }]), []);
});

test("Diagramme (SIN-376): README enthält pipeline.mmd unverändert", () => {
  const mmd = readFileSync("docs/diagramme/pipeline.mmd", "utf8");
  assert.ok(readFileSync("README.md", "utf8").includes("```mermaid\n" + mmd + "```"));
});
