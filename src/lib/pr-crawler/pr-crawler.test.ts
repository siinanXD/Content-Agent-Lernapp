import assert from "node:assert/strict";
import { test } from "node:test";
import { MARKER, baueKommentar } from "../../../scripts/pr-crawler/kommentar.mjs";
import { MAX_ROUTEN, betroffeneRouten, importe, loese } from "../../../scripts/pr-crawler/routen.mjs";

const routen = ["/", "/lernpfad", "/profil", "/einheit/unit-03", "/impressum"];
/** Fixture: zwei Seiten teilen eine Komponente, die eine `lib`-Datei nutzt; `einheit/[unitId]` ist dynamisch. */
const dateien: Record<string, string> = {
  "src/app/layout.tsx": 'import "./globals.css";\nimport { Kopf } from "@/components/ui/Kopf";',
  "src/app/globals.css": "",
  "src/app/page.tsx": 'import { Kopf } from "@/components/ui/Kopf";',
  "src/app/lernpfad/page.tsx": 'import { Pfad } from "@/components/learner/Pfad";',
  "src/app/profil/page.tsx": 'import { Pfad } from "@/components/learner/Pfad";\nimport { Stand } from "./Stand";',
  "src/app/profil/Stand.tsx": "export const Stand = () => null;",
  "src/app/einheit/[unitId]/page.tsx": 'import { Frage } from "../../../components/learner/Frage";',
  "src/app/impressum/page.tsx": "export default () => null;",
  "src/app/api/x/route.ts": 'import { fortschritt } from "@/lib/plan/fortschritt";',
  "src/components/ui/Kopf.tsx": "export const Kopf = () => null;",
  "src/components/learner/Pfad.tsx": 'import { fortschritt } from "@/lib/plan/fortschritt";',
  "src/components/learner/Frage.tsx": "export const Frage = () => null;",
  "src/lib/plan/fortschritt.ts": "export const fortschritt = () => 0;",
  "src/lib/unbenutzt.ts": "export const x = 1;",
};

test("Seite: geänderte page.tsx → ihre Route", () => {
  assert.deepEqual(betroffeneRouten(["src/app/lernpfad/page.tsx"], dateien, routen).routen, ["/lernpfad"]);
});

test("Seitenverzeichnis: Nachbardatei einer Seite → ihre Route", () => {
  assert.deepEqual(betroffeneRouten(["src/app/profil/Stand.tsx"], dateien, routen).routen, ["/profil"]);
});

test("Komponente → alle Seiten, die sie importieren", () => {
  const r = betroffeneRouten(["src/components/learner/Pfad.tsx"], dateien, routen).routen;
  assert.deepEqual([...r].sort(), ["/lernpfad", "/profil"]);
});

test("lib-Datei → Seiten über die Komponente, die sie nutzt (nicht über die API-Route)", () => {
  const r = betroffeneRouten(["src/lib/plan/fortschritt.ts"], dateien, routen).routen;
  assert.deepEqual([...r].sort(), ["/lernpfad", "/profil"]);
});

test("dynamische Seite mit relativem Import → Beispielroute", () => {
  assert.deepEqual(betroffeneRouten(["src/components/learner/Frage.tsx"], dateien, routen).routen, ["/einheit/unit-03"]);
});

test("Layout und Stile erreichen jede Seite", () => {
  const r = betroffeneRouten(["src/app/globals.css"], dateien, routen);
  assert.equal(r.routen.length, 5);
  assert.equal(betroffeneRouten(["src/components/ui/Kopf.tsx"], dateien, routen).routen.length, 5);
});

test("Obergrenze: höchstens MAX_ROUTEN, der Rest steht in mehr", () => {
  const viele: Record<string, string> = { "src/app/layout.tsx": "" };
  const liste: string[] = [];
  for (let i = 0; i < MAX_ROUTEN + 2; i++) {
    viele[`src/app/s${i}/page.tsx`] = "";
    liste.push(`/s${i}`);
  }
  const r = betroffeneRouten(["src/app/layout.tsx"], viele, liste);
  assert.equal(r.routen.length, MAX_ROUTEN);
  assert.equal(r.mehr, 2);
});

test("ohne Frontend-Änderung: Grund statt Routen", () => {
  const r = betroffeneRouten(["docs/PRODUCT.md", ".github/workflows/x.yml", "src/app/api/x/route.ts", "src/lib/a.test.ts"], dateien, routen);
  assert.deepEqual(r.routen, []);
  assert.match(r.grund, /Keine Frontend-Änderung/);
});

test("Datei ohne Seite (lib, nur von der API genutzt) → Grund", () => {
  const r = betroffeneRouten(["src/lib/unbenutzt.ts"], dateien, routen);
  assert.deepEqual(r.routen, []);
  assert.match(r.grund, /keiner Seite/);
});

test("importe und loese lesen @/, relative Pfade und Index-Dateien", () => {
  assert.deepEqual(importe('import a from "@/x/a";\nimport "./b.css";\nconst c = await import("../c");'), ["@/x/a", "./b.css", "../c"]);
  assert.equal(loese("src/app/p/page.tsx", "../../lib/m", { "src/lib/m/index.ts": "" }), "src/lib/m/index.ts");
  assert.equal(loese("src/app/p/page.tsx", "react", {}), null);
});

test("Kommentar: Marker, Bild je Route; Video nur mit Datei", () => {
  const ergebnis = {
    routen: ["/lernpfad", "/profil"],
    bilder: [
      { route: "/lernpfad", viewport: "handy", bild: "lernpfad-handy.png" },
      { route: "/lernpfad", viewport: "desktop", bild: "lernpfad-desktop.png" },
    ],
    funde: [{ kategorie: "a11y", route: "/profil", viewport: "handy", text: "kaputt" }],
    video: { datei: "ablauf.webm", mb: 1.2 },
    rot: 1,
    grund: "",
  };
  const t = baueKommentar({ ergebnis, bilderBasis: "https://raw/x", artefakt: "https://a", sha: "abcdef123" });
  assert.ok(t.startsWith(MARKER));
  assert.match(t, /<img src="https:\/\/raw\/x\/lernpfad-handy\.png"/);
  assert.match(t, /Rot:/);
  assert.match(t, /ablauf\.webm/);
  assert.match(t, /abcdef1/);
});

test("Kommentar: Übersprungen nennt den Grund", () => {
  const t = baueKommentar({ skip: "Keine Frontend-Änderung (nur Doku)." });
  assert.ok(t.startsWith(MARKER));
  assert.match(t, /Übersprungen: Keine Frontend-Änderung/);
});
