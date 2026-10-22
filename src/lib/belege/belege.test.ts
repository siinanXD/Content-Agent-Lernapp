import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bewerte, fehlendeVariablen, hatOffenenPr, leseHaken, leseProbe, nurBelege, setzeHaken } from "./belege";

describe("Belege-Prüfer Lern-App (SIN-846)", () => {
  it("erkennt nur offene Belege-Haken und übergibt keine Bau-Aufgabe", () => {
    const description = [
      "- [ ] Zählung der Kurse [probe:zaehlung:courses:9]",
      "- [x] Bereits geprüft",
      "- [ ] Run-Link zum Worker [probe:run:worker.yml]",
    ].join("\n");
    assert.equal(nurBelege(description), true);
    assert.equal(leseHaken(description).filter((h) => !h.erledigt).length, 2);
    assert.equal(nurBelege(description + "\n- [ ] Code reparieren"), false);
    assert.equal(nurBelege("- [x] Alles erledigt"), false);
  });

  it("parst nur feste Zählungs- und Workflow-Proben", () => {
    assert.deepEqual(leseProbe("Zählung [probe:zaehlung:courses:9]"), {
      art: "zaehlung", tabelle: "courses", min: 9,
    });
    assert.deepEqual(leseProbe("Run-Link [probe:run:worker.yml]"), {
      art: "run", workflow: "worker.yml",
    });
    assert.equal(leseProbe("Zählung [probe:zaehlung:courses;drop table:1]"), null);
    assert.equal(leseProbe("Run-Link [probe:run:not-a-workflow.txt]"), null);
  });

  it("bewertet Mindestzählung und nur grüne Workflow-Läufe als Beleg", () => {
    const count = leseProbe("Zählung [probe:zaehlung:courses:9]")!;
    const run = leseProbe("Run-Link [probe:run:worker.yml]")!;
    assert.equal(bewerte(count, 9).belegt, true);
    assert.equal(bewerte(count, 8).belegt, false);
    assert.equal(bewerte(run, "success").belegt, true);
    assert.equal(bewerte(run, "failure").belegt, false);
  });

  it("setzt ausschließlich exakt belegte offene Haken", () => {
    const description = "- [ ] Zählung [probe:zaehlung:courses:9]\n- [ ] Code ändern";
    assert.equal(setzeHaken(description, ["Zählung [probe:zaehlung:courses:9]"]), "- [x] Zählung [probe:zaehlung:courses:9]\n- [ ] Code ändern");
  });

  it("lässt Issues mit offenem PR beim PR (Titel, Text oder Branch, nicht SIN-70 für SIN-7)", () => {
    const prs = [
      { title: "feat(x): Dings (SIN-70)", body: null, head: "claude/sin-70-dings" },
      { title: "fix: ohne ID", body: "Part of SIN-8", head: "claude/ohne" },
    ];
    assert.equal(hatOffenenPr("SIN-7", prs), false);
    assert.equal(hatOffenenPr("SIN-70", prs), true);
    assert.equal(hatOffenenPr("SIN-8", prs), true);
    assert.equal(hatOffenenPr("SIN-9", []), false);
  });

  it("meldet fehlende Pflicht-Variablen vor dem Lauf", () => {
    assert.deepEqual(fehlendeVariablen({ LINEAR_API_KEY: "a", GH_TOKEN: "b", SUPABASE_PRUEFER_URL: "c" }), []);
    assert.deepEqual(fehlendeVariablen({ LINEAR_API_KEY: "a", GH_TOKEN: " " }), ["GH_TOKEN", "SUPABASE_PRUEFER_URL"]);
  });
});
