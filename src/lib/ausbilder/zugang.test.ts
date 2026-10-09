import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCode, checkZugangInput, parseZugangPreview } from "./zugang";

const CODE = "ABCDEF123456XYZ";

test("Code: zu kurz, zu lang oder mit Sonderzeichen ist ungültig", () => {
  assert.equal(checkCode(CODE).ok, true);
  assert.equal(checkCode("kurz").ok, false);
  assert.equal(checkCode("A".repeat(65)).ok, false);
  assert.equal(checkCode("ABCDEF 123456;--").ok, false);
  assert.equal(checkCode(undefined).ok, false);
});

test("Eingabe: E-Mail wird bereinigt und klein geschrieben", () => {
  assert.deepEqual(checkZugangInput({ code: CODE, email: "  Name@Traeger.DE " }), {
    ok: true,
    value: { code: CODE, email: "name@traeger.de" },
  });
});

test("Eingabe: ungültige E-Mail oder fehlender Code werden abgelehnt", () => {
  assert.equal(checkZugangInput({ code: CODE, email: "kein-at" }).ok, false);
  assert.equal(checkZugangInput({ code: CODE, email: "" }).ok, false);
  assert.equal(checkZugangInput({ code: "x", email: "a@b.de" }).ok, false);
  assert.equal(checkZugangInput(null).ok, false);
});

test("Vorschau: nur vollständige Angaben", () => {
  assert.deepEqual(parseZugangPreview({ organisation: "T", trainerQuota: 3, memberQuota: 40 }), {
    organisation: "T",
    trainerQuota: 3,
    memberQuota: 40,
  });
  assert.equal(parseZugangPreview({ organisation: "T" }), null);
  assert.equal(parseZugangPreview(null), null);
});
