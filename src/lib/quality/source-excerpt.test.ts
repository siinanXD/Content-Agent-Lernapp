import assert from "node:assert/strict";
import { test } from "node:test";
import { judgeUserContent, type EvalItem } from "./evaluate-agent";
import { createSourceTextLoader, decodeBody, detectCharset, excerptFor, htmlToText, queryTerms, withSourceExcerpts } from "./source-excerpt";

const P14 = `<html><head><title>§ 14</title><script>var x = 1;</script></head><body>
<div class="nav">Nichtamtliches Inhaltsverzeichnis</div>
<div class="jnnorm"><h3>&sect; 14 Gewichtung der Pr&uuml;fungsbereiche und Anforderungen f&uuml;r das Bestehen der Abschlusspr&uuml;fung</h3>
<p>(1) Die Bewertungen der einzelnen Pr&uuml;fungsbereiche sind wie folgt zu gewichten:</p>
<p>1. &bdquo;Leistungserstellung, Logistik, Beschaffung und Buchhaltung&ldquo; mit 25 Prozent,</p>
<p>2. &bdquo;Marketing, Vertrieb, Personalwesen und kaufm&auml;nnische Steuerung und Kontrolle&ldquo; mit 35 Prozent,</p>
</div></body></html>`;

test("SIN-456: HTML wird lesbarer Text mit Umlauten, ohne Skripte", () => {
  const t = htmlToText(P14);
  assert.match(t, /§ 14 Gewichtung der Prüfungsbereiche/);
  assert.match(t, /„Leistungserstellung, Logistik, Beschaffung und Buchhaltung“ mit 25 Prozent/);
  assert.doesNotMatch(t, /var x/);
  assert.doesNotMatch(t, /<p>/);
});

test("SIN-456: Zeichensatz aus Header oder meta, ISO-8859-1 wird richtig gelesen", () => {
  assert.equal(detectCharset("text/html; charset=ISO-8859-1", ""), "iso-8859-1");
  assert.equal(detectCharset(null, '<meta charset="windows-1252">'), "windows-1252");
  assert.equal(detectCharset(null, "<html>"), "utf-8");
  const latin = Buffer.from("Prüfung § 14", "latin1");
  const buf = latin.buffer.slice(latin.byteOffset, latin.byteOffset + latin.byteLength) as ArrayBuffer;
  assert.equal(decodeBody(buf, "text/html; charset=iso-8859-1"), "Prüfung § 14");
});

test("SIN-456: Auszug wählt die passenden Absätze, kurze Texte bleiben ganz", () => {
  assert.ok(queryTerms("Mit wie viel Prozent geht Teil 1 ein? 40 Prozent").includes("40"));
  const long = ["Einleitung über die Ausbildung und den Betrieb im Allgemeinen ohne Zahlen.", ...Array.from({ length: 40 }, (_, i) => `Absatz ${i} über Ausbildungsinhalte, Betriebsorganisation und allgemeine Hinweise zur Durchführung.`), "§ 14 Teil 1 der Abschlussprüfung wird mit 25 Prozent gewichtet, Teil 2 mit 75 Prozent."].join("\n\n");
  const ex = excerptFor(long, "Mit wie viel Prozent geht Teil 1 in das Gesamtergebnis ein? Mit 40 Prozent", 300);
  assert.match(ex, /25 Prozent gewichtet/);
  assert.ok(ex.length <= 300);
  assert.equal(excerptFor("kurz", "egal"), "kurz");
});

test("SIN-456: Lader holt jede URL einmal, PDF und Fehler ergeben null", async () => {
  let calls = 0;
  const fake = (async (url: string) => {
    calls += 1;
    if (url.includes("kaputt")) return new Response("weg", { status: 404 });
    return new Response(P14, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }) as unknown as typeof fetch;
  const load = createSourceTextLoader(fake);
  const a = await load("https://www.gesetze-im-internet.de/indkflausbv/__14.html");
  await load("https://www.gesetze-im-internet.de/indkflausbv/__14.html");
  assert.match(a!, /25 Prozent/);
  assert.equal(calls, 1);
  assert.equal(await load("https://www.kmk.org/x/rlp.pdf"), null);
  assert.equal(calls, 1);
  assert.equal(await load("https://x.de/kaputt"), null);
});

test("SIN-456: Auszug geht an den Richter, abschaltbar über JUDGE_QUELLENAUSZUG=0", async () => {
  const item: EvalItem = { id: "ik-x01", unitId: "ik-vo", prompt: "Mit wie viel Prozent geht Teil 1 ein?", correct: "Mit 40 Prozent", explanation: "Laut § 14 zählt Teil 1 mit 40 Prozent.", sourceUrl: "https://www.gesetze-im-internet.de/indkflausbv/__14.html" };
  const load = async () => htmlToText(P14);
  const [withEx] = await withSourceExcerpts([item], load, {});
  assert.match(withEx!.sourceExcerpt!, /25 Prozent/);
  assert.match(judgeUserContent([withEx!]), /"sourceExcerpt":".*25 Prozent/);
  assert.doesNotMatch(judgeUserContent([item]), /sourceExcerpt/);
  const [off] = await withSourceExcerpts([item], load, { JUDGE_QUELLENAUSZUG: "0" });
  assert.equal(off!.sourceExcerpt, undefined);
});
