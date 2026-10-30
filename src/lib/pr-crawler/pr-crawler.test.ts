import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { MARKER, baueKommentar } from "../../../scripts/pr-crawler/kommentar.mjs";
import { issueKennung, sollAusIssue } from "../../../scripts/pr-crawler/soll.mjs";
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

test("Kommentar: Seite hinter dem Login zeigt Bild und die Rolle des Testkontos", () => {
  const ergebnis = {
    routen: ["/lernpfad", "/"],
    bilder: [
      { route: "/lernpfad", viewport: "handy", bild: "lernpfad-handy.png", eingeloggt: "Lernende" },
      { route: "/", viewport: "handy", bild: "start-handy.png" },
    ],
    funde: [],
    video: null,
    rot: 0,
    grund: "",
  };
  const t = baueKommentar({ ergebnis, bilderBasis: "https://raw/x" });
  assert.match(t, /Eingeloggt geprüft als Testkonto „Lernende“/);
  assert.equal(t.match(/Eingeloggt geprüft/g)?.length, 1);
  assert.match(t, /<img src="https:\/\/raw\/x\/lernpfad-handy\.png"/);
});

const istErgebnis = {
  routen: ["/lernpfad"],
  bilder: [{ route: "/lernpfad", viewport: "handy", bild: "lernpfad-handy.png" }],
  funde: [],
  video: null,
  rot: 0,
  grund: "",
};

test("SIN-1008: Kommentar enthält Soll- und Ist-Bild, wenn beide vorhanden sind", () => {
  const t = baueKommentar({ ergebnis: istErgebnis, bilderBasis: "https://raw/x", soll: { bild: "https://uploads.linear.app/a/soll.png", frame: "12:34" } });
  assert.match(t, /<img src="https:\/\/uploads\.linear\.app\/a\/soll\.png" alt="Soll/);
  assert.match(t, /<img src="https:\/\/raw\/x\/lernpfad-handy\.png"/);
  assert.match(t, /Frame 12:34/);
  assert.equal(t.match(/alt="Soll/g)?.length, 1);
});

test("SIN-1008: ohne Planungsbild kein Soll und kein Platzhalter", () => {
  for (const soll of [undefined, {}]) {
    const t = baueKommentar({ ergebnis: istErgebnis, bilderBasis: "https://raw/x", soll });
    assert.doesNotMatch(t, /Soll|Planungsbild/);
  }
});

test("SIN-1008: Planungsbild aus Anhang oder Beschreibung, Frame-ID, Kennung aus PR-Titel", () => {
  assert.deepEqual(sollAusIssue({ attachments: { nodes: [{ url: "https://www.figma.com/file/x" }, { url: "https://uploads.linear.app/a/b.png", title: "Frame 5:6" }] } }), { bild: "https://uploads.linear.app/a/b.png", frame: "5:6" });
  assert.deepEqual(sollAusIssue({ description: "Frame-ID: 7-8\n![Soll](https://x.test/plan.png)" }), { bild: "https://x.test/plan.png", frame: "7:8" });
  assert.deepEqual(sollAusIssue({ description: "nur Text", attachments: { nodes: [] } }), {});
  assert.equal(issueKennung("feat(x): Y (SIN-12)", ""), "SIN-12");
  assert.equal(issueKennung("ohne", "Part of SIN-99"), "SIN-99");
  assert.equal(issueKennung("ohne", ""), null);
});

test("Kommentar: Übersprungen nennt den Grund", () => {
  const t = baueKommentar({ skip: "Keine Frontend-Änderung (nur Doku)." });
  assert.ok(t.startsWith(MARKER));
  assert.match(t, /Übersprungen: Keine Frontend-Änderung/);
});

test("SIN-914: UI-PR löst den Crawler selbst aus und baut die Vorschau per CLI (keine Git-Deploys in der Lern-App)", () => {
  const yml = readFileSync(".github/workflows/pr-crawler.yml", "utf8");
  assert.match(yml, /pull_request:\n\s+types: \[opened, synchronize, reopened, ready_for_review\]\n\s+paths: \["src\/app\/\*\*"/);
  assert.match(yml, /name: Vorschau bauen \(Vercel-CLI\)[\s\S]*?if: steps\.routen\.outputs\.routen != '' && github\.event_name == 'pull_request'/);
  assert.match(yml, /head\.repo\.full_name == github\.repository/);
  assert.equal(JSON.parse(readFileSync("vercel.json", "utf8")).git.deploymentEnabled, false);
});

test("Vercel-Schutzseite wird erkannt (SIN-1210)", async () => {
  const { istSchutzseite } = await import("../../../scripts/pr-crawler/lauf.mjs");
  assert.equal(istSchutzseite("https://vercel.com/login?next=%2Fsso-api", ""), true);
  assert.equal(istSchutzseite("https://x-siinanxds-projects.vercel.app/anmelden", "Log in to Vercel"), true);
  assert.equal(istSchutzseite("https://x-siinanxds-projects.vercel.app/anmelden", "Anmelden"), false);
  assert.equal(istSchutzseite("about:blank"), false);
});

test("401er der API hinter dem Login werden zu einem Fund mit Ursache (SIN-1210)", async () => {
  const { sitzungAbgelehnt } = await import("../../../scripts/pr-crawler/lauf.mjs");
  const funde = [
    { kategorie: "http", route: "/ausbilder", viewport: "handy", text: "HTTP 401 bei /api/ausbilder/gruppe" },
    { kategorie: "konsole", route: "/ausbilder", viewport: "handy", text: "Failed to load resource: the server responded with a status of 401 ()" },
    { kategorie: "a11y", route: "/ausbilder", viewport: "handy", text: "color-contrast (serious): x, 1 Stelle(n)" },
  ];
  const aus = sitzungAbgelehnt(funde, "/ausbilder");
  assert.deepEqual(aus.map((f: { kategorie: string }) => f.kategorie), ["a11y", "login"]);
  assert.match(aus[1].text, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.equal(sitzungAbgelehnt([funde[2]], "/ausbilder").length, 1);
});
