import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";
import type { QuestionEvaluationRecord } from "@/lib/quality/question-evaluations";
import { mitKiKennzeichnung } from "@/lib/review/content-guard";
import type { Course } from "@/lib/storage/types";
import { bericht, publishKurs } from "../../../scripts/content-publish";
import { pruefeKursFuerVeroeffentlichung } from "./veroeffentlichen";

const quelle = { title: "AO", url: "https://www.gesetze-im-internet.de/maschf_ausbv/", fetchedAt: "2026-10-02T00:00:00.000Z" };

function kurs(): Course {
  return { id: "c1", keyword: "Industriemechaniker", status: "researched", createdAt: "2026-10-01T00:00:00.000Z", mock: false, variants: 2, sources: [quelle], generated: mitKiKennzeichnung(mafSeedLernfeldSicherheit()) };
}

function bewertungen(c: Course, passed = true): QuestionEvaluationRecord[] {
  const lf = c.generated as ReturnType<typeof mafSeedLernfeldSicherheit>;
  return lf.units.flatMap((u) =>
    u.questions.map((q, i) => ({
      id: `${u.id}-${q.id}-${i}`, questionId: q.id, unitId: u.id, courseId: c.id, runId: "r", judgeModel: "m", promptVersion: "v",
      quellentreue: 1, eindeutigkeit: 1, niveau: 1, sprache: 1, sicherheitFlag: false, passed, createdAt: "2026-10-03T00:00:00.000Z",
    })),
  );
}

function speicher(c: Course, evals: QuestionEvaluationRecord[]) {
  const gesetzt: string[] = [];
  return {
    gesetzt,
    storage: {
      listCourses: async () => [c],
      listQuestionEvaluations: async () => evals,
      setStatus: async (_id: string, status: string) => {
        gesetzt.push(status);
        return c;
      },
    },
  };
}

describe("Veröffentlichen-Prüfung (SIN-796)", () => {
  it("lässt einen vollständigen, bewerteten Kurs durch", () => {
    const c = kurs();
    assert.deepEqual(pruefeKursFuerVeroeffentlichung(c, bewertungen(c)), []);
  });

  it("meldet fehlende Quelle und Abrufdatum", () => {
    const c = kurs();
    const lf = structuredClone(c.generated) as ReturnType<typeof mafSeedLernfeldSicherheit>;
    lf.units[0].sourceFetchedAt = "";
    const m = pruefeKursFuerVeroeffentlichung({ ...c, sources: [], generated: lf }, bewertungen(c));
    assert.ok(m.every((x) => x.pruefung === "quelle") && m.length >= 2);
  });

  it("meldet Fragen ohne Bewertung des Richters", () => {
    const c = kurs();
    const alle = bewertungen(c);
    assert.equal(pruefeKursFuerVeroeffentlichung(c, alle.slice(1)).filter((x) => x.pruefung === "richter").length, 1);
  });

  it("nicht bestandene und geflaggte Fragen sind ausgeblendet und zählen nicht (SIN-808)", () => {
    const c = kurs();
    const alle = bewertungen(c);
    const mit = alle.map((r, i) => (i === 0 ? { ...r, passed: false } : i === 1 ? { ...r, sicherheitFlag: true } : r));
    assert.deepEqual(pruefeKursFuerVeroeffentlichung(c, mit), []);
  });

  it("ohne eine sichtbare bestandene Frage ist der Kurs nicht freigabefähig", () => {
    const c = kurs();
    assert.deepEqual(pruefeKursFuerVeroeffentlichung(c, bewertungen(c, false)).map((x) => x.ort), ["Kurs"]);
  });

  it("Bewertungen mit Einheiten-Präfix in der Fragen-ID passen zu den heutigen Fragen (SIN-808)", () => {
    const c = kurs();
    const mitPraefix = bewertungen(c).map((r) => ({ ...r, questionId: `${r.unitId}-${r.questionId}` }));
    assert.deepEqual(pruefeKursFuerVeroeffentlichung(c, mitPraefix), []);
  });

  it("meldet Treffer der Verbotsliste, ohne den Wert zu nennen", () => {
    const c = kurs();
    const lf = structuredClone(c.generated) as ReturnType<typeof mafSeedLernfeldSicherheit>;
    lf.units[0].explanation = "Fragen an test@example.com";
    const m = pruefeKursFuerVeroeffentlichung({ ...c, generated: lf }, bewertungen(c));
    assert.deepEqual(m.map((x) => x.pruefung), ["verbotsliste"]);
    assert.ok(!JSON.stringify(m).includes("test@example.com"));
  });

  it("Entwurfs-Einheiten zählen nicht mit", () => {
    const c = kurs();
    const lf = structuredClone(c.generated) as ReturnType<typeof mafSeedLernfeldSicherheit>;
    lf.units[0] = { ...lf.units[0], status: "entwurf", sourceUrl: "" };
    assert.deepEqual(pruefeKursFuerVeroeffentlichung({ ...c, generated: lf }, bewertungen(c)), []);
  });
});

describe("content-publish (SIN-796)", () => {
  it("setzt bei allen Prüfungen grün published", async () => {
    const c = kurs();
    const s = speicher(c, bewertungen(c));
    const e = await publishKurs(s.storage, "industriemechaniker", false);
    assert.equal(e.veroeffentlicht, true);
    assert.deepEqual(s.gesetzt, ["published"]);
  });

  it("Trockenlauf schreibt nichts und zeigt das Ergebnis", async () => {
    const c = kurs();
    const s = speicher(c, bewertungen(c));
    const e = await publishKurs(s.storage, "Industriemechaniker", true);
    assert.equal(e.veroeffentlicht, false);
    assert.deepEqual(s.gesetzt, []);
    assert.match(bericht(e, true), /Trockenlauf.*\n.*Mängel: 0/);
  });

  it("bricht bei Mängeln ab, ohne zu schreiben, und listet sie", async () => {
    const c = kurs();
    const s = speicher(c, bewertungen(c).slice(1));
    const e = await publishKurs(s.storage, "Industriemechaniker", false);
    assert.equal(e.veroeffentlicht, false);
    assert.ok(e.mangel.length > 0);
    assert.deepEqual(s.gesetzt, []);
    assert.match(bericht(e, false), /richter:/);
  });

  it("bricht bei unbekanntem Stichwort ab", async () => {
    const c = kurs();
    const s = speicher(c, []);
    const e = await publishKurs(s.storage, "Gärtner", false);
    assert.ok(e.fehler);
    assert.deepEqual(s.gesetzt, []);
  });
});
