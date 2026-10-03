# Goldset restore

**DO NOT** push `docs/quality/maf-goldset-phase-a.json` as a single ~45k MCP embed.
Large embeds are rewritten to literal `$file:...` stubs by the MCP client.

Canonical 90-item SoT: `maf-goldset-phase-a.json.zlib.b64`

Materialize into the JSON path:

```bash
npm run goldset:materialize
```

(`pretest` runs this automatically.)

Grow the committed JSON via ≤~32k incremental **real JSON** embeds only.
