import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { needsYou, openLegalItems } from "../../../scripts/autonomy/digest.mjs";
import { LEGAL_SLUGS, loadLegalDocument, parseInline, parseLegal, slugify } from "./legal-content";
import { legalMetadata } from "./legal-metadata";

test("Parser: Kopf, Abschnitte, Zeilenumbrüche, Karten, Link und Platzhalter", () => {
  const doc = parseLegal(
    "---\ntitel: T\nentwurf: Hinweis mit [ ]\ninhalt: ja\n---\n\n## 1 Ärger Übung\n\n[Name]\nStraße\n\n- A | Zweck | [Region prüfen]\n- B | Zweck | EU\n\nSiehe [KI](/ki-hinweis).\n",
  );
  assert.equal(doc.title, "T");
  assert.equal(doc.toc, true);
  assert.deepEqual(doc.placeholders, ["[Name]", "[Region prüfen]"], "[ ] im Kopf und Links zählen nicht");
  assert.equal(doc.draft, true);
  assert.deepEqual(doc.blocks[0], { type: "heading", id: "1-aerger-uebung", text: "1 Ärger Übung" });
  assert.equal(doc.blocks[1].type === "paragraph" && doc.blocks[1].lines.length, 2);
  assert.equal(doc.blocks[2].type === "cards" && doc.blocks[2].items.length, 2);
  assert.deepEqual(parseInline("a [b](/c) [d]"), [
    { type: "text", text: "a " },
    { type: "link", text: "b", href: "/c" },
    { type: "text", text: " " },
    { type: "placeholder", text: "[d]" },
  ]);
  assert.equal(slugify("4 Empfänger und Auftragsverarbeiter"), "4-empfaenger-und-auftragsverarbeiter");
});

test("Ohne Platzhalter kein Entwurf und kein noindex", () => {
  const doc = parseLegal("---\ntitel: T\nentwurf: x\n---\n## A\nText\n");
  assert.equal(doc.draft, false);
  assert.equal(legalMetadata(doc).robots, undefined);
  assert.deepEqual(legalMetadata({ ...doc, draft: true }).robots, { index: false, follow: false });
});

test("Rechtsseiten: alle drei Dateien laden; Impressum und Datenschutz sind Entwurf, KI-Hinweis nicht", () => {
  const docs = Object.fromEntries(LEGAL_SLUGS.map((s) => [s, loadLegalDocument(s)]));
  assert.equal(docs.impressum.draft, true);
  assert.equal(docs.datenschutz.draft, true);
  assert.equal(docs["ki-hinweis"].draft, false);
  assert.equal(docs.datenschutz.toc, true);
  const sprung = docs.datenschutz.blocks.filter((b) => b.type === "heading");
  assert.equal(sprung.length, 7);
});

test("Auftragsverarbeiter passen zur Konfiguration im Repo", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")).dependencies as Record<string, string>;
  const env = readFileSync(".env.example", "utf8");
  const vercel = readFileSync("vercel.json", "utf8");
  const dsb = loadLegalDocument("datenschutz");
  const cards = dsb.blocks.flatMap((b) => (b.type === "cards" ? b.items : []));
  const listed = cards.map((c) => c.name).join(" | ");

  const used: [string, boolean][] = [
    ["Vercel", vercel.includes('"framework": "nextjs"')],
    ["Supabase", "@supabase/supabase-js" in pkg],
    ["Sentry", "@sentry/nextjs" in pkg],
    ["PostHog", "posthog-js" in pkg],
    ["Langfuse", "@langfuse/client" in pkg],
    ["Anthropic", env.includes("ANTHROPIC_API_KEY=")],
    ["OpenAI", env.includes("OPENAI_API_KEY=")],
  ];
  for (const [name, inUse] of used) {
    assert.ok(inUse, `${name} ist nicht mehr in der Konfiguration: Eintrag und Checkliste anpassen`);
    assert.ok(listed.includes(name), `${name} fehlt in content/legal/datenschutz.md (Abschnitt 4)`);
  }

  // Regionen: „EU“ nur, wo der Code den EU-Host vorgibt; sonst bleibt der Platzhalter.
  const region = (name: string) => cards.find((c) => c.name === name)?.region.map((r) => r.text).join("");
  const code = (f: string) => readFileSync(f, "utf8");
  assert.ok(code("src/components/analytics/posthog-provider.tsx").includes("https://eu.i.posthog.com"));
  assert.equal(region("PostHog"), "EU");
  assert.ok(code("src/lib/quality/langfuse-client.ts").includes("LANGFUSE_EU_HOST"));
  assert.equal(region("Langfuse"), "EU");
  assert.ok(!vercel.includes('"regions"'), "vercel.json setzt jetzt eine Region: Datenschutz Abschnitt 4 nachtragen");
  for (const name of ["Vercel", "Supabase", "Sentry"]) assert.match(region(name) ?? "", /^\[Region prüfen\]$/, name);
});

test("Rechts-Checkliste: offene Punkte erscheinen unter „Braucht dich“, abgehakte nicht", () => {
  const md = readFileSync("docs/legal/checkliste-demo-zugang.md", "utf8");
  const open = openLegalItems(md);
  assert.ok(open.length >= 11);
  assert.deepEqual(openLegalItems("- [x] fertig\n- [ ] offen\n"), ["offen"]);
  assert.match(needsYou({ legalOpen: open })[0], /^Recht: \d+ Punkte offen vor dem Demo-Zugang/);
  assert.deepEqual(needsYou({ legalOpen: [] }), []);
});
