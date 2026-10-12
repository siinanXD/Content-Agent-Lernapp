import assert from "node:assert/strict";
import { test } from "node:test";
import { erzeuge, faktenAus, pruefeText, werbemittelZeile, STATUS_NEU, MODELL_STANDARD, MODELL_STARK } from "../../../scripts/autonomy/marketing.mjs";

const fakten = faktenAus({
  kurs: { id: "k1", keyword: "MAF", status: "published", lernfeld: { id: "LF3", title: "Werkstoffe" } },
  units: [{ minutes: 20 }, { minutes: 25 }],
  sources: [{}, {}, {}],
  fragen: 8,
});
const gut = (extra = "") =>
  `Für Bildungsträger: Der Kurs MAF enthält 2 Lerneinheiten mit 45 Minuten Lernzeit und 3 amtlichen Quellen. Inhalte mit KI erstellt, vor Nutzung durch Ausbilder geprüft. ${extra}`;

test("Fakten kommen aus den Datenbankzeilen", () => {
  assert.equal(fakten.einheiten, 2);
  assert.equal(fakten.minuten, 45);
  assert.equal(fakten.quellen, 3);
});

test("guter Text besteht", () => assert.deepEqual(pruefeText(gut(), fakten), []));

test("verbotene Formulierungen werden verworfen", () => {
  for (const bad of [
    "Prüfung garantiert bestanden.",
    "Mit uns bestehen Sie die Prüfung.",
    "Original IHK-Aufgaben inklusive.",
    "Mit IHK-Logo und IHK-zertifiziert.",
    "ZFU-zugelassen.",
    "Lerne jetzt für deine Prüfung.",
  ]) {
    assert.notDeepEqual(pruefeText(gut(bad), fakten), [], bad);
  }
});

test("Kennzeichnung, Zielgruppe und fremde Zahlen werden geprüft", () => {
  assert.ok(pruefeText(gut().replace("mit KI erstellt", "automatisch"), fakten).some((f: string) => f.includes("Kennzeichnung")));
  assert.ok(
    pruefeText(gut().replaceAll("Bildungsträger", "Firmen").replaceAll("Ausbilder", "Leute"), fakten).some((f: string) => f.includes("Zielgruppe")),
  );
  assert.ok(pruefeText(gut("Über 500 Teilnehmer."), fakten).some((f: string) => f.includes("500")));
});

test("erzeuge: schlechte Texte werden verworfen, Eskalation aufs stärkere Modell", async () => {
  const modelle: string[] = [];
  const r = await erzeuge({
    fakten,
    schreibe: async (m: string) => {
      modelle.push(m);
      const linkedin = m === MODELL_STANDARD ? `Prüfung garantiert bestanden, Bildungsträger, mit KI erstellt.${" x".repeat(50)}` : gut();
      return { text: JSON.stringify({ linkedin, website: gut(), email: gut() }), tokensIn: 500, tokensOut: 600 };
    },
  });
  assert.deepEqual(modelle, [MODELL_STANDARD, MODELL_STARK]);
  assert.equal(r.modell, MODELL_STARK);
  assert.deepEqual(Object.keys(r.texte).sort(), ["email", "linkedin", "website"]);
  assert.ok(r.kosten < 1);
});

test("erzeuge: bleibt alles verboten, kommt nichts heraus", async () => {
  const r = await erzeuge({
    fakten,
    schreibe: async () => ({ text: JSON.stringify({ linkedin: "garantiert", website: "x", email: "y" }), tokensIn: 1, tokensOut: 1 }),
  });
  assert.deepEqual(r.texte, {});
  assert.ok(r.verworfen.length > 0);
});

test("erzeuge: Deckel stoppt vor dem zweiten Modell", async () => {
  let n = 0;
  const r = await erzeuge({
    fakten,
    deckel: 0.0001,
    schreibe: async () => {
      n++;
      return { text: "{}", tokensIn: 100000, tokensOut: 100000 };
    },
  });
  assert.equal(n, 1);
  assert.deepEqual(r.texte, {});
});

test("Zeile: Status wartet_auf_freigabe, mit KI", () => {
  const z = werbemittelZeile({ kanal: "linkedin", text: gut(), fakten, modell: MODELL_STANDARD, kosten: 0.01 });
  assert.equal(z.status, STATUS_NEU);
  assert.equal(z.art, "text_linkedin");
  assert.equal(z.mit_ki, true);
  assert.throws(() => werbemittelZeile({ kanal: "tv", text: "", fakten, modell: "m", kosten: 0 }));
});
