import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import {
  buildDidaktikBlockPrompt,
  buildDidaktikKeywordPrompt,
  generatorSystemText,
  variantRules,
} from "./didaktik-prompts";

describe("didaktik prompts (AP-18e)", () => {
  it("covers all four variants in rules", () => {
    const rules = variantRules();
    for (const v of ["standard", "ablauf", "rechnen", "sicherheit"] as const) {
      assert.ok(rules[v].length > 20, v);
    }
  });

  it("keyword prompt requires sections and bans AI grading", () => {
    const p = buildDidaktikKeywordPrompt("Maschinen- und Anlagenführer", "sicherheit");
    assert.match(p, /sections/);
    assert.match(p, /keine KI-Bewertung/i);
    assert.match(p, /Generated-SVG/);
  });

  it("block prompt uses curriculum map and safety variant for M0-3", () => {
    const c = loadMafCurriculum();
    const mod = c.modules.find((m) => m.id === "M0")!;
    const block = mod.blocks.find((b) => b.id === "M0-3")!;
    const p = buildDidaktikBlockPrompt(c, mod, block);
    assert.match(p, /variant="sicherheit"/);
    assert.match(p, /moduleId="M0"/);
    assert.match(p, /examAreas/);
    assert.match(p, /explanation/);
  });

  it("SIN-432: auswahl/reihenfolge-Regeln stehen im System- und Block-Prompt", () => {
    assert.match(generatorSystemText(), /genau EINE/);
    assert.match(generatorSystemText(), /reihenfolge: 4–6 Schritte/);
    const c = loadMafCurriculum();
    const mod = c.modules[0]!;
    assert.match(buildDidaktikBlockPrompt(c, mod, mod.blocks[0]!), /Distraktoren/);
  });

  it("SIN-433: rechnen verlangt Betriebssituation, Mehrschritt-Rechnung und Einheit", () => {
    const t = generatorSystemText();
    assert.match(t, /rechnen: Betriebssituation mit konkreten Werten und Einheiten/);
    assert.match(t, /Mindestens zwei Rechenschritte/);
    assert.match(t, /Level anwenden, nie erinnern/);
  });

  it("SIN-433: zuordnen verlangt genau ein Gegenstück und gleichartige Begriffe", () => {
    const t = generatorSystemText();
    assert.match(t, /zuordnen: 4–6 Paare, jedes Element passt nach der Quelle zu genau EINEM/);
    assert.match(t, /gleich lange Beschreibungen, die sich nicht überschneiden/);
  });

  it("SIN-433: zuordnen-Niveau verlangt Funktion statt Definition", () => {
    assert.match(generatorSystemText(), /Funktion, Anwendung oder Folge in einer Situation/);
  });

  it("SIN-433: lueckentext verlangt genau ein richtiges Wort und Verständnis", () => {
    const t = generatorSystemText();
    assert.match(t, /lueckentext: .*genau EIN fachlich richtiges Wort/);
    assert.match(t, /Verständnis \(Ursache, Zusammenhang, Wirkung\)/);
  });

  it("SIN-433: Regeln stehen im Block-Prompt und entfallen bei PROMPT_AUSWAHL_REGELN=aus", () => {
    const c = loadMafCurriculum();
    const mod = c.modules[0]!;
    assert.match(buildDidaktikBlockPrompt(c, mod, mod.blocks[0]!), /Fragetyp rechnen, zuordnen und lueckentext/);
    process.env.PROMPT_AUSWAHL_REGELN = "aus";
    try {
      assert.doesNotMatch(generatorSystemText(), /Fragetyp rechnen, zuordnen/);
    } finally {
      delete process.env.PROMPT_AUSWAHL_REGELN;
    }
  });

  it("SIN-432: PROMPT_AUSWAHL_REGELN=aus liefert den alten Prompt", () => {
    process.env.PROMPT_AUSWAHL_REGELN = "aus";
    try {
      assert.doesNotMatch(generatorSystemText(), /Distraktoren/);
    } finally {
      delete process.env.PROMPT_AUSWAHL_REGELN;
    }
  });
});
