import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BILDER, bildFuer, pruefeBilder, type BildEintrag } from "./bilder";

const ok: BildEintrag = { src: "/generated/a.svg", alt: "Skizze", kind: "sketch", source: { url: "local", license: "Generated-SVG" } };

describe("bilder.json (SIN-1543)", () => {
  it("die Datei im Repo ist gültig", () => assert.deepEqual(pruefeBilder(BILDER), []));

  it("lehnt Einträge ohne Alt-Text, Quelle oder Lizenz ab", () => {
    const fehler = pruefeBilder({
      a: { ...ok, alt: "" },
      b: { ...ok, source: { url: "", license: "CC0" } },
      c: { ...ok, source: { url: "x", license: " " } },
    });
    assert.equal(fehler.length, 3);
    assert.equal(bildFuer("a", { a: { ...ok, alt: "" } }), undefined);
  });

  it("zeigt Normsymbole nur mit freigegeben: true", () => {
    const zeichen = { ...ok, kind: "sign" as const, src: "/generated/z.svg" };
    assert.equal(bildFuer("z", { z: zeichen }), undefined);
    assert.equal(bildFuer("z", { z: { ...zeichen, freigegeben: false } }), undefined);
    assert.equal(bildFuer("g", { g: { ...ok, normsymbol: true } }), undefined);
    assert.deepEqual(bildFuer("z", { z: { ...zeichen, freigegeben: true } }), zeichen);
  });

  it("gibt normale Bilder ohne Freigabe-Feld zurück", () => assert.deepEqual(bildFuer("x", { x: ok }), ok));
});
