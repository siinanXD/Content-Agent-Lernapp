import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SourceChip } from "./source-chip";

const render = (source: string) =>
  renderToStaticMarkup(createElement(SourceChip, { source }));

test("Quellen-Chip: Webadresse wird Link mit Hostname", () => {
  const html = render("https://www.gesetze-im-internet.de/maschfausbv/");
  assert.match(html, /<a /);
  assert.match(html, /gesetze-im-internet\.de/);
  assert.match(html, /rel="noopener noreferrer"/);
});

// SIN-841: axe 4.14 `label-content-name-mismatch`. Der zugängliche Name beginnt mit dem sichtbaren Text
// („Quelle <host>“, echtes Leerzeichen dazwischen) und endet mit dem nur vorgelesenen Tab-Hinweis.
test("Quellen-Chip: zugänglicher Name = sichtbarer Text + Tab-Hinweis, kein aria-label", () => {
  const html = render("https://www.gesetze-im-internet.de/maschfausbv/");
  assert.doesNotMatch(html, /aria-label/);
  const name = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  assert.ok(name.startsWith("Quelle gesetze-im-internet.de"), name);
  assert.ok(name.endsWith("(öffnet in neuem Tab)"), name);
  assert.match(html, /class="sr-only"> \(öffnet in neuem Tab\)<\/span>/);
});

test("Quellen-Chip: Text bleibt Text, Präfix entfällt", () => {
  const html = render("Quelle: MaschFüAusbV · KMK RLP MAF");
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /MaschFüAusbV/);
});

test("Quellen-Chip: javascript-Adresse wird kein Link", () => {
  assert.doesNotMatch(render("javascript:alert(1)"), /<a /);
});

test("Quellen-Chip: leer ergibt nichts", () => {
  assert.equal(render(""), "");
});
