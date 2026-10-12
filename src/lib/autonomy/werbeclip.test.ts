import assert from "node:assert/strict";
import { test } from "node:test";
import { DECKEL_EUR, ProduktDeckelError, assertWithinProductCap, lauf, plane, planText, promptAus, werbeclipZeile } from "../../../scripts/autonomy/werbeclip.mjs";

const cfg = (preisEntwurf = 0.05, preisFinal = 0.2) => ({
  basisUrl: "https://x.test",
  pfadErzeugen: "/a",
  pfadStatus: "/b",
  entwuerfe: 3,
  sekundenEntwurf: 5,
  sekundenFinal: 8,
  deckelEur: 5,
  stufen: {
    entwurf: { modell: "test-entwurf", preisProSekundeUsd: preisEntwurf, nutzungsrechteWerbung: "ja" },
    final: { modell: "test-final", preisProSekundeUsd: preisFinal, nutzungsrechteWerbung: "ja" },
  },
});

test("Trockenlauf: Clips und Schätzung, Lücken werden genannt statt geraten", () => {
  const p = plane(cfg());
  assert.equal(p.clips.length, 4);
  assert.ok(p.summeEur! > 0 && p.summeEur! < DECKEL_EUR);
  assert.match(planText(p), /Schätzung/);
  const leer = plane({ ...cfg(), basisUrl: null, stufen: { entwurf: { modell: null, preisProSekundeUsd: null, nutzungsrechteWerbung: null }, final: cfg().stufen.final } });
  assert.equal(leer.summeEur, null);
  assert.ok(leer.luecken.includes("basisUrl") && leer.luecken.includes("stufen.entwurf.preisProSekundeUsd"));
});

test("Deckel stoppt vor dem Aufruf, der ihn überschreiten würde", async () => {
  assert.throws(() => assertWithinProductCap(4.9, 0.2), ProduktDeckelError);
  assertWithinProductCap(4.8, 0.2);
  let aufrufe = 0;
  const teuer = cfg(0.5, 0.5);
  await assert.rejects(
    () => lauf({ cfg: teuer, erzeugen: async () => { aufrufe++; return { url: "u", bewertung: 1 }; } }),
    ProduktDeckelError,
  );
  assert.ok(aufrufe < 4);
});

test("Lauf unter Deckel: 3 Entwürfe, 1 Final aus bestem Entwurf; ohne Belege kein Aufruf", async () => {
  const aufrufe: { referenz?: string }[] = [];
  const r = await lauf({
    cfg: cfg(),
    erzeugen: async (c: { referenz?: string }) => {
      aufrufe.push(c);
      return { url: `u${aufrufe.length}`, bewertung: aufrufe.length === 2 ? 9 : 1 };
    },
  });
  assert.equal(aufrufe.length, 4);
  assert.equal(aufrufe[3].referenz, "u2");
  assert.ok(r.ausgegebenEur < DECKEL_EUR);
  await assert.rejects(() => lauf({ cfg: { ...cfg(), basisUrl: null }, erzeugen: async () => { throw new Error("darf nicht"); } }));
});

test("Prompt ohne Personen/Marken, Zeile mit KI-Kennzeichnung und Freigabe-Status", () => {
  assert.match(promptAus(), /Keine Personen/);
  const z = werbeclipZeile({ produkt: "lern-app", pfad: "p", sekunden: 8, modell: "m", kosten: 1.234 });
  assert.equal(z.status, "wartet_auf_freigabe");
  assert.equal(z.kosten_eur, 1.23);
  assert.equal(z.ki_kennzeichnung, "Mit KI erstellt");
  assert.equal(z.art, "werbeclip");
});
