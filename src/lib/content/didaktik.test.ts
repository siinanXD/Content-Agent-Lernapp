import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  altTextOk,
  examQuestionTarget,
  explanationFromSections,
  LEITNER_INTERVALS_DAYS,
  parseDurationMinutes,
  resolveExplanation,
  trafficLight,
  variantFromBlock,
  wordCount,
} from "./didaktik";

describe("didaktik schema helpers (AP-18a)", () => {
  it("builds explanation fallback from sections", () => {
    const sections = {
      einstieg: "Du rüstest die Anlage um.",
      kern: "Rüstzeit ist Stillstand ohne Stück.",
      beispiel: "20 Minuten Rüstzeit plus 100 mal 2 Minuten.",
      merksatz: "Rüstzeit so kurz wie möglich halten.",
    };
    const text = explanationFromSections(sections);
    assert.match(text, /Rüstzeit/);
    assert.equal(
      resolveExplanation({ sections, explanation: "legacy" }, false),
      text,
    );
    assert.equal(
      resolveExplanation(
        { sections, explanation: "legacy", explanationSimple: "Kurzfassung." },
        true,
      ),
      "Kurzfassung.",
    );
    assert.equal(
      resolveExplanation({ explanation: "nur legacy" }, false),
      "nur legacy",
    );
  });

  it("keeps Leitner 1/3/7/14 and traffic 80/60", () => {
    assert.deepEqual(LEITNER_INTERVALS_DAYS, { 1: 1, 2: 3, 3: 7, 4: 14 });
    assert.equal(trafficLight(0.85), "green");
    assert.equal(trafficLight(0.7), "yellow");
    assert.equal(trafficLight(0.5), "red");
  });

  it("infers variants and parses MAF exam times", () => {
    assert.equal(variantFromBlock({ safety: true }), "sicherheit");
    assert.equal(variantFromBlock({ rechnen: true }), "rechnen");
    assert.equal(
      variantFromBlock({ topics: ["Rüsten und Umrüsten nach Vorgaben"] }),
      "ablauf",
    );
    assert.equal(variantFromBlock({}), "standard");
    assert.equal(parseDurationMinutes("120 Minuten"), 120);
    assert.equal(parseDurationMinutes("60 Minuten"), 60);
    assert.equal(examQuestionTarget("PT", 120), 30);
    assert.equal(examQuestionTarget("PP", 60), 15);
    assert.equal(examQuestionTarget("WISO", 60), 15);
  });

  it("enforces kern word budget and alt length", () => {
    const kern =
      "Rüsten ist das Einrichten einer Maschine für ein anderes Teil. " +
      "Während der Rüstzeit läuft keine Produktion. " +
      "Darum plant man Rüstzeit und Stückzeit gemeinsam.";
    assert.ok(wordCount(kern) <= 120);
    assert.equal(altTextOk("Flussdiagramm Rüstvorgang"), true);
    assert.equal(altTextOk("x".repeat(126)), false);
  });
});
