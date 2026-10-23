#!/usr/bin/env node
/**
 * SIN-538: Führt docs/api/postman-collection.json mit Newman gegen die laufende App aus.
 * Usage: node scripts/api-test.mjs [--base http://127.0.0.1:43123] [--serve]
 * --serve startet `next start` selbst (vorher `npm run build`), sonst muss der Server laufen.
 * Jede Anfrage prüft Statuscode und Antwortform; rot (Exit 1) bei jeder fehlgeschlagenen Prüfung.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:43123";
let server;
if (args.includes("--serve")) {
  const { port, hostname } = new URL(base);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", hostname, "--port", port], { stdio: "ignore" });
  for (let i = 0; i < 60 && !(await fetch(base).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 1000));
}

const newman = createRequire(import.meta.url)("newman");
const failed = await new Promise((resolve, reject) =>
  newman.run(
    {
      collection: new URL("../docs/api/postman-collection.json", import.meta.url).pathname,
      envVar: [{ key: "baseUrl", value: `${base}/api` }],
      reporters: "cli",
    },
    (err, summary) => (err ? reject(err) : resolve(summary.run.failures.length)),
  ),
).finally(() => server?.kill());
process.exit(failed ? 1 : 0);
