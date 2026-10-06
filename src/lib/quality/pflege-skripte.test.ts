import assert from "node:assert/strict";
import { test } from "node:test";
import { deadDependencies, duplicateBlocks, importsOf, largeFiles, unusedFiles } from "../../../scripts/autonomy/cleanup-scan.mjs";
import { parseSubject, render as renderChangelog } from "../../../scripts/changelog.mjs";
import { parseNameStatus, readmeReasons } from "../../../scripts/readme-check.mjs";
import { renderVisualReport } from "../../../scripts/autonomy/visual-report.mjs";

test("Aufräum-Scan: Importe relativ und mit @/ lösen auf", () => {
  assert.deepEqual(importsOf("src/app/a/page.tsx", `import x from "../../lib/x";\nimport y from "@/lib/y.ts";\nimport z from "react";`), ["src/lib/x", "src/lib/y"]);
});

test("Aufräum-Scan: ungenutzte Datei, Einstiegsdateien und Tests ausgenommen", () => {
  const files = [
    { file: "src/app/page.tsx", source: `import { a } from "../lib/a";` },
    { file: "src/lib/a.ts", source: "export const a = 1;" },
    { file: "src/lib/tot.ts", source: "export const t = 1;" },
    { file: "src/lib/tot.test.ts", source: `import "./tot";` },
  ];
  assert.deepEqual(unusedFiles(files), ["src/lib/tot.ts"]);
});

test("Aufräum-Scan: Paket ohne Verwendung, Peers und overrides bleiben", () => {
  const pkg = { dependencies: { next: "1", lodash: "4", "react-dom": "1", "@x/core": "1" }, overrides: { "@x/core": "2" } };
  assert.deepEqual(deadDependencies(pkg, `import next from "next/server"`), ["lodash"]);
});

test("Aufräum-Scan: große Dateien und doppelte Blöcke", () => {
  const block = Array.from({ length: 12 }, (_, i) => `const wert${i} = berechne(${i});`).join("\n");
  const files = [
    { file: "src/a.ts", source: `${block}\nexport {};` },
    { file: "src/b.ts", source: `// anders\n${block}` },
  ];
  assert.equal(duplicateBlocks(files).length, 1);
  assert.deepEqual(largeFiles([{ file: "src/a.ts", source: "x\n".repeat(600) }], 500), [{ file: "src/a.ts", lines: 601 }]);
});

test("README-Erinnerung: Auslöser, Entwarnung bei geänderter README", () => {
  const diff = parseNameStatus("A\tsrc/app/neu/page.tsx\nM\tpackage.json\nM\tsrc/lib/x.ts\nA\tscripts/neu.mjs");
  assert.equal(readmeReasons(diff).length, 3);
  assert.deepEqual(readmeReasons([...diff, { status: "M", file: "README.md" }]), []);
  assert.deepEqual(readmeReasons(parseNameStatus("M\tsrc/lib/x.ts\nM\tsrc/app/a/page.tsx")), []);
});

test("Changelog: Conventional-Commit-Titel, Monat und Art", () => {
  assert.deepEqual(parseSubject("feat(lernpfad): Serie (SIN-290) (#123)"), { type: "feat", scope: "lernpfad", breaking: false, text: "Serie", issue: "SIN-290", pr: "123" });
  assert.equal(parseSubject("Merge branch main"), null);
  const md = renderChangelog([
    { date: "2026-10-05", subject: "fix(app): Fehler (SIN-1) (#2)" },
    { date: "2026-09-30", subject: "feat!: Neu (#1)" },
  ]);
  assert.match(md, /## 2026-10\n\n### Behoben\n\n- app: Fehler \(SIN-1, #2\)/);
  assert.match(md, /- \*\*Bruch:\*\* Neu \(#1\)/);
  assert.ok(md.indexOf("2026-10") < md.indexOf("2026-09"));
});

test("Bildvergleich-Bericht: ohne und mit Abweichung", () => {
  const spec = (title: string, status: string, projectName: string, attachments: { path: string }[] = []) => ({
    title,
    tests: [{ projectName, results: [{ status, attachments }] }],
  });
  const ok = { suites: [{ specs: [spec("Bild /lernpfad", "passed", "handy")] }] };
  assert.match(renderVisualReport(ok), /Keine Abweichung zu main \(1 Bilder/);
  const diff = { suites: [{ suites: [{ specs: [spec("Bild /lernpfad", "failed", "handy", [{ path: "x/lernpfad-diff.png" }]), spec("Bild /profil", "passed", "handy")] }] }] };
  const md = renderVisualReport(diff);
  assert.match(md, /1 von 2 Bildern weichen von main ab/);
  assert.match(md, /`\/lernpfad` \(handy\): diff/);
});
