import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";
import { handlePublish } from "@/lib/pipeline/mock-handlers";
import { createCourse, getCourse, setEvaluation, setGenerated, setSources } from "@/lib/pipeline/mock-store";
import { REGELN } from "../../../scripts/autonomy/review.mjs";
import { aehnlichkeit, mitKiKennzeichnung, pruefeVeroeffentlichung } from "./content-guard";
import { INHALTS_REGELN, VERBOTEN_REGELN } from "./regeln";

const quelle = { title: "AO", url: "https://www.gesetze-im-internet.de/maschf_ausbv/", fetchedAt: "2026-10-02T00:00:00.000Z" };
const arten = (c: Parameters<typeof pruefeVeroeffentlichung>[0]) => pruefeVeroeffentlichung(c).map((v) => v.regel);
const vollstaendig = () => ({ sources: [quelle], generated: mitKiKennzeichnung(mafSeedLernfeldSicherheit()) });

describe("Recht-und-Inhalt-Wächter (SIN-297)", () => {
  it("lässt einen vollständigen Kurs durch", () => {
    assert.deepEqual(pruefeVeroeffentlichung(vollstaendig()), []);
  });

  it("blockiert ohne Quelle am Kurs", () => {
    assert.ok(arten({ ...vollstaendig(), sources: [] }).includes("quelle"));
  });

  it("blockiert ohne Abrufdatum", () => {
    const c = vollstaendig();
    assert.ok(arten({ ...c, sources: [{ ...quelle, fetchedAt: "" }] }).includes("abrufdatum"));
    const lf = structuredClone(c.generated);
    lf.units[0].sourceFetchedAt = "kein Datum";
    assert.ok(arten({ ...c, generated: lf }).includes("abrufdatum"));
  });

  it("blockiert ohne KI-Kennzeichnung", () => {
    const ohne = structuredClone(vollstaendig().generated) as Partial<ReturnType<typeof mafSeedLernfeldSicherheit>>;
    delete ohne.aiDisclosure;
    assert.deepEqual(arten({ sources: [quelle], generated: ohne }), ["ki-kennzeichnung"]);
  });

  it("blockiert Personendaten, nennt den Wert aber nie", () => {
    const lf = structuredClone(vollstaendig().generated);
    lf.units[0].explanation = "Fragen an max.mustermann@example.com oder DE89 3704 0044 0532 0130 00.";
    const v = pruefeVeroeffentlichung({ sources: [quelle], generated: lf });
    const arten = v.filter((x) => x.regel === "personendaten").map((x) => x.hinweis);
    assert.ok(arten.includes("E-Mail-Adresse im Text.") && arten.includes("IBAN im Text."));
    assert.doesNotMatch(JSON.stringify(v), /mustermann|DE89/);
  });

  it("blockiert IHK-Aufgaben als Vorlage und zu große Ähnlichkeit", () => {
    const lf = structuredClone(vollstaendig().generated);
    lf.units[0].questions[0].prompt = "Übernommen aus der IHK Prüfungsaufgabe Frühjahr.";
    assert.ok(arten({ sources: [quelle], generated: lf }).includes("ihk-aehnlichkeit"));

    const ref = "Welche Schutzmaßnahme ist vor Beginn von Wartungsarbeiten an einer Presse zuerst durchzuführen";
    const lf2 = structuredClone(vollstaendig().generated);
    lf2.units[0].questions[0].prompt = ref;
    const v = pruefeVeroeffentlichung({ sources: [quelle], generated: lf2 }, { ihkReferenz: [ref] });
    assert.ok(v.some((x) => x.regel === "ihk-aehnlichkeit"));
    assert.equal(aehnlichkeit("ganz anderer Text über Rechnen mit Prozenten im Betrieb", ref), 0);
  });

  it("publish blockiert bei fehlender Quelle und fehlender KI-Kennzeichnung (422)", async () => {
    const passed = { passed: true, scores: {}, questions: [{ passed: true }] };

    const ohneQuelle = createCourse("ohne Quelle");
    setGenerated(ohneQuelle.id, mafSeedLernfeldSicherheit());
    setEvaluation(ohneQuelle.id, passed);
    const r1 = await handlePublish(ohneQuelle.id);
    assert.equal(r1.status, 422);
    const b1 = (await r1.json()) as { reason: string; violations: Array<{ regel: string }> };
    assert.equal(b1.reason, "content_guard");
    assert.ok(b1.violations.some((v) => v.regel === "quelle"));

    // Der Speicher kennzeichnet beim Ablegen selbst: ohne Kennzeichnung kommt nur ein Kurs, der am Speicher vorbei entstand.
    const gespeichert = createCourse("Kennzeichnung durch Speicher");
    setGenerated(gespeichert.id, mafSeedLernfeldSicherheit());
    assert.ok((getCourse(gespeichert.id)?.generated as { aiDisclosure?: unknown }).aiDisclosure);

    const ok = createCourse("vollständig");
    setSources(ok.id, [quelle]);
    setGenerated(ok.id, mafSeedLernfeldSicherheit());
    setEvaluation(ok.id, passed);
    assert.equal((await handlePublish(ok.id)).status, 200);
  });

  it("Regelliste deckt den Abschnitt „Verboten“ in AGENTS.md und das Review-Skript", () => {
    const md = readFileSync(join(process.cwd(), "AGENTS.md"), "utf8");
    const abschnitt = md.split("### Verboten")[1].split(/\n#{1,3} /)[0];
    const verbote = abschnitt.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
    assert.deepEqual(VERBOTEN_REGELN.map((r) => r.verbot), verbote);
    assert.deepEqual(REGELN, [...VERBOTEN_REGELN.map((r) => r.verbot), ...INHALTS_REGELN]);
  });
});
