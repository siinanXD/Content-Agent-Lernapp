import assert from "node:assert/strict";
import { test } from "node:test";
import { listFrames } from "../../../scripts/autonomy/figma.mjs";
import {
  baueNachricht,
  betroffeneRouten,
  formatKommentar,
  kosten,
  leseRouten,
  MAX_PUNKTE,
  parseSicht,
  routeFuer,
} from "../../../scripts/autonomy/sichtpruefung.mjs";

const routen = ["/", "/lernpfad", "/einheit/unit-03", "/ausbilder/gruppen"];
const seiten = [
  { verz: "", quelle: "" },
  { verz: "lernpfad", quelle: 'import { ConsentBanner } from "@/components/learner/consent-banner";' },
  { verz: "einheit/[unitId]", quelle: "" },
  { verz: "ausbilder/gruppen", quelle: "" },
];

test("routeFuer: dynamische Segmente passen auf Beispiel-Routen", () => {
  assert.equal(routeFuer("einheit/[unitId]", routen), "/einheit/unit-03");
  assert.equal(routeFuer("lernpfad", routen), "/lernpfad");
  assert.equal(routeFuer("gibt-es-nicht", routen), null);
});

test("betroffeneRouten: Seiten und direkt importierte Komponenten, API und Tests nicht", () => {
  const r = betroffeneRouten(
    ["src/app/einheit/[unitId]/page.tsx", "src/components/learner/consent-banner.tsx", "src/app/api/health/route.ts", "src/components/x.test.tsx", "README.md"],
    seiten,
    routen,
  );
  assert.deepEqual(r.sort(), ["/einheit/unit-03", "/lernpfad"]);
  assert.deepEqual(betroffeneRouten(["docs/a.md"], seiten, routen), []);
});

test("leseRouten liest e2e/routes.ts", () => {
  assert.deepEqual(leseRouten('export const routes = [\n  "/",\n  "/start",\n];\n'), ["/", "/start"]);
});

test("parseSicht: höchstens 5 Punkte, leere Texte fallen weg", () => {
  const punkte = Array.from({ length: 8 }, (_, i) => ({ seite: "/lernpfad", viewport: "handy", text: `Punkt ${i}` }));
  const r = parseSicht(`Hier: ${JSON.stringify({ zusammenfassung: " ok ", punkte: [...punkte, { text: " " }] })}`);
  assert.equal(r.punkte.length, MAX_PUNKTE);
  assert.equal(r.zusammenfassung, "ok");
  assert.throws(() => parseSicht("kein json"));
});

test("kosten rechnen mit Token-Preisen", () => {
  assert.equal(kosten({ input_tokens: 1_000_000, output_tokens: 1_000_000 }), 0.6);
  assert.equal(kosten({}), 0);
});

test("baueNachricht: Bilder je Seite, Figma nur wenn vorhanden", () => {
  const m = baueNachricht([{ route: "/lernpfad", figmaName: "02 Lernpfad", handy: "aa", desktop: "bb", figma: null }]);
  const bilder = m[0].content.filter((c: { type: string }) => c.type === "image");
  assert.equal(bilder.length, 2);
  assert.ok(m[0].content.some((c: { text?: string }) => c.text?.includes("02 Lernpfad")));
});

test("formatKommentar: Marker, Kosten, Bilder-Link", () => {
  const t = formatKommentar({ ergebnis: { zusammenfassung: "Eine Abweichung.", punkte: [{ seite: "/lernpfad", viewport: "handy", text: "Knopf überlappt." }] }, usd: 0.0123, lauf: "https://x/runs/1", sha: "abcdef123" });
  assert.match(t, /<!-- sichtpruefung -->/);
  assert.match(t, /0\.0123 USD/);
  assert.match(t, /Knopf überlappt/);
  assert.match(t, /runs\/1/);
});

test("listFrames: oberste Frames aller Seiten", () => {
  const doc = { children: [{ children: [{ type: "FRAME", name: "01 Start", id: "1:2" }, { type: "TEXT", name: "x", id: "1:3" }] }] };
  assert.deepEqual(listFrames(doc), [{ name: "01 Start", id: "1:2" }]);
});
