import assert from "node:assert/strict";
import { test } from "node:test";
import { istInterneUrl } from "../../../scripts/autonomy/crawler.mjs";
import {
  MAX_NEUE_ISSUES,
  MAX_USD,
  PERSONAS,
  bewerten,
  berichtText,
  buendeln,
  issueVon,
  kosten,
  marker,
  melden,
  ohneDubletten,
  parseFunde,
  serie,
  serieMarker,
  typOf,
} from "../../../scripts/autonomy/testnutzer.mjs";

const funde = [
  { kategorie: "lcp", route: "/lernpfad", viewport: "handy", text: "LCP 3100 ms" },
  { kategorie: "lcp", route: "/lernpfad", viewport: "desktop", text: "LCP 2800 ms" },
  { kategorie: "tot", route: "/ergebnis", viewport: "handy", text: "Link /x führt ins Leere" },
  { kategorie: "verstaendlich", route: "/beruf", viewport: "handy", text: "Text unklar" },
];

test("Funde: ein Bündel je Kategorie und Seite, wichtigste Kategorie zuerst", () => {
  const g = buendeln(funde);
  assert.deepEqual(g.map((x) => x.key), ["tot:/ergebnis", "lcp:/lernpfad", "verstaendlich:/beruf"]);
  assert.deepEqual([...g[1].viewports], ["handy", "desktop"]);
});

test("Label: Inhaltsfunde content, sonst frontend", () => {
  assert.equal(typOf({ kategorie: "verstaendlich" }), "content");
  assert.equal(typOf({ kategorie: "a11y" }), "frontend");
  assert.deepEqual(issueVon(buendeln(funde)[2]).labels, ["content"]);
});

test("Dubletten: offenes oder junges Issue mit Marker verhindert ein neues", () => {
  const g = buendeln(funde);
  const issues = [
    { identifier: "SIN-1", description: `${marker("lcp:/lernpfad")} x`, state: { type: "started" } },
    { identifier: "SIN-2", description: marker("tot:/ergebnis"), state: { type: "completed" }, completedAt: "2020-01-01T00:00:00Z" },
  ];
  const { neu, doppelt } = ohneDubletten(g, issues, new Date("2026-10-14T00:00:00Z"));
  assert.deepEqual(doppelt.map((d) => d.issue), ["SIN-1"]);
  assert.deepEqual(neu.map((n) => n.key), ["tot:/ergebnis", "verstaendlich:/beruf"]);
});

test("melden: Trockenlauf legt nichts an, Deckel begrenzt neue Issues", async () => {
  const viele = Array.from({ length: 9 }, (_, i) => ({ kategorie: "konsole", route: `/s${i}`, viewport: "handy", text: "Fehler" }));
  const call = async (q: string) => (q.includes("issues(") ? { issues: { nodes: [] } } : {});
  const { angelegt, text } = await melden({ quelle: "crawler", funde: viele, dry: true, call });
  assert.equal(angelegt.length, MAX_NEUE_ISSUES);
  assert.match(text, /4 wegen Deckel/);
});

test("Bewertung: gültiges JSON wird geprüft, fremde Kategorien fallen weg", () => {
  const r = parseFunde('Hier: {"zusammenfassung":"ok","funde":[{"kategorie":"tot","schritt":"A","text":"x"},{"kategorie":"quatsch","text":"y"}]}');
  assert.equal(r.funde.length, 1);
  assert.throws(() => parseFunde("kein json"));
});

test("Bewertung: abgebrochener Schritt ist ein toter Weg, Kostendeckel stoppt weitere Aufrufe", async () => {
  const dir = new URL("../../../", import.meta.url).pathname;
  const durch = PERSONAS.map((p) => ({ persona: p.id, ordner: dir, schritte: [{ label: "Start", route: "/", status: p.id === "ausbilder" ? "fehler" : "ok", fehler: "Timeout", ms: 10, text: "", bild: null }] }));
  let aufrufe = 0;
  const ask = async () => {
    aufrufe++;
    return { text: '{"zusammenfassung":"","funde":[]}', usage: { input_tokens: 10_000_000, output_tokens: 0 } };
  };
  const r = await bewerten(durch, { NODE_ENV: "test" }, ask);
  assert.equal(aufrufe, 1);
  assert.ok(r.usd >= MAX_USD && /Kostendeckel/.test(r.notiz));
  assert.ok((r.funde as { kategorie: string }[]).some((f) => f.kategorie === "tot"));
});

test("Kosten: Haiku-Preis, wenige Cent je Persona", () => {
  assert.ok(kosten({ input_tokens: 20_000, output_tokens: 500 }) < 0.01);
});

test("Crawler: nur gleiche Herkunft, keine Anker", () => {
  const base = "https://a.example";
  assert.equal(istInterneUrl("/lernpfad", base), true);
  assert.equal(istInterneUrl("#top", base), false);
  assert.equal(istInterneUrl("https://b.example/x", base), false);
});

test("Serie: zählt Tage in Folge ohne Fund, Lücke oder Fund beendet sie", () => {
  const k = (tag: string, n: number) => ({ body: serieMarker(tag, n), createdAt: `${tag}T21:50:00Z` });
  const alt = [k("2026-10-13", 0), k("2026-10-14", 0)];
  assert.equal(serie(alt, "2026-10-15", true), 3);
  assert.equal(serie(alt, "2026-10-15", false), 0);
  assert.equal(serie(alt, "2026-10-16", true), 1, "Lücke am 15.");
  assert.equal(serie([k("2026-10-14", 2), k("2026-10-14", 0)], "2026-10-15", true), 2, "letzter Lauf des Tages zählt");
  assert.equal(serie([{ body: "kein Marker", createdAt: "2026-10-14T00:00:00Z" }], "2026-10-15", true), 1);
});

test("Bericht: Crawler nennt die Serie mit Marker", () => {
  const t = berichtText({ quelle: "crawler", funde: 0, neu: 0, doppelt: 0, tage: 3, tag: "2026-10-15" });
  assert.match(t, /3 von 3 Tagen in Folge \(Ziel erreicht\)/);
  assert.match(t, /testnutzer-serie:2026-10-15:0/);
});

test("Bericht: Persona-Lauf kennzeichnet die KI im Text, Crawler nicht", () => {
  const p = berichtText({ quelle: "personas", funde: 0, neu: 0, doppelt: 0 });
  assert.match(p, /KI-erzeugt \(Claude\)/);
  assert.doesNotMatch(berichtText({ quelle: "crawler", funde: 0, neu: 0, doppelt: 0 }), /KI-erzeugt/);
});
