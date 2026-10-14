import assert from "node:assert/strict";
import test from "node:test";
import { blockSources, loadAllCurricula } from "@/lib/content/curriculum";
import { berufDerQuelle, quelleGehoertZuBeruf, trenneFremdeQuellen } from "./quellen-beruf";

const IM_RLP =
  "https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf";
const MAF_AUSBV = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
const BIBB = "https://www.bibb.de/dokumente/pdf/HA172.pdf";

test("Quelle gehört dem Beruf, dessen Merkmal sie trägt", () => {
  assert.equal(berufDerQuelle(IM_RLP), "industriemechaniker");
  assert.equal(berufDerQuelle(MAF_AUSBV), "maf");
  assert.equal(berufDerQuelle("https://www.gesetze-im-internet.de/indkflausbv/__4.html"), "indkfl");
  assert.equal(berufDerQuelle(BIBB), null);
});

test("Industriemechaniker-Quelle passt nicht zu MAF, aber zum Kurs Industriemechaniker/in", () => {
  assert.equal(quelleGehoertZuBeruf(IM_RLP, "maf"), false);
  assert.equal(quelleGehoertZuBeruf(IM_RLP, "industriemechaniker"), true);
  assert.equal(quelleGehoertZuBeruf(MAF_AUSBV, "maf"), true);
  assert.equal(quelleGehoertZuBeruf(MAF_AUSBV, "industriemechaniker"), false);
  assert.equal(quelleGehoertZuBeruf(BIBB, "maf"), true);
});

test("Einheiten mit fremder Quelle werden abgetrennt, nicht verändert", () => {
  const units = [
    { id: "a-u1", sourceUrl: MAF_AUSBV },
    { id: "b-u1", sourceUrl: IM_RLP },
  ];
  const { passend, fremd } = trenneFremdeQuellen(units, "maf");
  assert.deepEqual(passend.map((u) => u.id), ["a-u1"]);
  assert.deepEqual(fremd.map((u) => u.id), ["b-u1"]);
});

test("Prompt-Quellen der MAF-Maps enthalten keine Industriemechaniker-Quelle", () => {
  for (const c of loadAllCurricula().filter((x) => x.family === "maf")) {
    for (const m of c.modules) {
      for (const b of m.blocks) {
        assert.ok(
          blockSources(c, b).every((s) => berufDerQuelle(s.url) !== "industriemechaniker"),
          `${c.id} ${b.id}`,
        );
      }
    }
  }
});
