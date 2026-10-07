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
