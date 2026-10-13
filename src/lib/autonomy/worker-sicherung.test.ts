import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { main } from "../../../scripts/autonomy/dispatch.mjs";

// SIN-587: „Fehler auswerten“ (--no-pr) darf die Sicherung (--repeat-fail) nicht mitreißen.
test("SIN-587: --no-pr scheitert an Linear → kein Wurf, Grund im Log; 3 Fehlläufe setzen trotzdem die Pause", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sin587-"));
  const exec = join(dir, "execution.json");
  const runs = join(dir, "runs.json");
  const out = join(dir, "github-output");
  writeFileSync(exec, JSON.stringify([{ type: "result", subtype: "success", is_error: false, result: "fertig", num_turns: 3 }]));
  const minAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  writeFileSync(runs, JSON.stringify([{ display_title: "worker SIN-587", created_at: minAgo(6) }, { display_title: "worker SIN-587", created_at: minAgo(3) }]));
  writeFileSync(out, "");

  const saved = { ...process.env };
  // Ohne Linear-Schlüssel scheitert findByIdentifier; ohne Supabase-Secrets bleibt das Ereignis eine Warnung.
  for (const k of ["LINEAR_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) delete process.env[k];
  process.env.GITHUB_OUTPUT = out;
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => void lines.push(a.join(" "));
  try {
    await main(["--no-pr", "SIN-587", exec]);
    await main(["--repeat-fail", "SIN-587", "--runs", runs]);
  } finally {
    console.log = orig;
    process.env = saved;
  }
  assert.ok(lines.some((l) => l.includes("Fehler auswerten gescheitert")), lines.join("\n"));
  assert.ok(lines.some((l) => l.includes("Leitstand: Ereignis nicht gespeichert")), lines.join("\n"));
  assert.match(readFileSync(out, "utf8"), /until<<(\S+)\n\d{4}-\d{2}-\d{2}T/);
});
