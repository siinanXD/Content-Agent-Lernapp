import assert from "node:assert/strict";
import { test } from "node:test";
import { ClipFehler, DECKEL_EUR, ProduktDeckelError, assertWithinProductCap, authHeader, erzeugeClip, ladeHerunter, lauf, plane, planText, promptAus, werbeclipZeile } from "../../../scripts/autonomy/werbeclip.mjs";

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

type Init = RequestInit;
const apiCfg = { ...cfg(), basisUrl: "https://api.test", pfadStatus: "/requests/{request_id}/status", stufen: { entwurf: { ...cfg().stufen.entwurf, parameter: { duration: 5 } }, final: { ...cfg().stufen.final, parameter: { duration: 8 } } } };
const clip = { stufe: "entwurf", nr: 1, modell: "m/x", prompt: "p" };
const antwort = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;

test("Erzeugen: POST mit Key-Header und Idempotency-Key, Statusschleife bis completed", async () => {
  const aufrufe: { url: string; init?: Init }[] = [];
  const stati = ["queued", "in_progress", "completed"];
  const fetchImpl = async (url: string | URL | Request, init?: Init) => {
    aufrufe.push({ url: String(url), init });
    if (init?.method === "POST") return antwort({ request_id: "r1", status_url: "https://api.test/s/r1" });
    const status = stati.shift();
    return antwort(status === "completed" ? { status, video: { url: "https://cdn.test/v.mp4" } } : { status });
  };
  const waits: number[] = [];
  const r = await erzeugeClip({ cfg: apiCfg, clip, auth: authHeader({ HIGGSFIELD_KEY_ID: "id", HIGGSFIELD_KEY_SECRET: "sec" }), idempotenzKey: "k1", fetchImpl, warte: async (s: number) => { waits.push(s); } });
  assert.equal(r.url, "https://cdn.test/v.mp4");
  assert.equal(aufrufe[0].url, "https://api.test/m/x");
  const kopf = new Headers(aufrufe[0].init?.headers);
  assert.equal(kopf.get("Authorization"), "Key id:sec");
  assert.equal(kopf.get("Idempotency-Key"), "k1");
  assert.deepEqual(JSON.parse(String(aufrufe[0].init?.body ?? "{}")),{ duration: 5, prompt: "p" });
  assert.equal(aufrufe[1].url, "https://api.test/s/r1");
  assert.deepEqual(waits, [2, 3]);
});

test("Fehlerfälle: failed/nsfw, HTTP-Fehler, ohne video.url, Zeitüberschreitung, fehlende Secrets", async () => {
  const mit = (antworten: unknown[]) => async () => antworten.shift() as ReturnType<typeof antwort>;
  const args = { cfg: apiCfg, clip, auth: "Key a:b", idempotenzKey: "k", warte: async () => {} };
  for (const s of ["failed", "nsfw"]) {
    await assert.rejects(() => erzeugeClip({ ...args, fetchImpl: mit([antwort({ request_id: "r" }), antwort({ status: s })]) }), ClipFehler);
  }
  await assert.rejects(() => erzeugeClip({ ...args, fetchImpl: mit([antwort({ error: "x" }, false, 401)]) }), /HTTP 401/);
  await assert.rejects(() => erzeugeClip({ ...args, fetchImpl: mit([antwort({ request_id: "r" }), antwort({ status: "completed" })]) }), /video\.url/);
  const endlos = async () => antwort({ status: "in_progress", request_id: "r" });
  await assert.rejects(() => erzeugeClip({ ...args, fetchImpl: endlos }), /noch nicht fertig/);
  assert.throws(() => authHeader({ HIGGSFIELD_KEY_ID: "id" }), /fehlt/);
});

test("Deckel stoppt vor dem API-Aufruf", async () => {
  let aufrufe = 0;
  const fetchImpl = async () => { aufrufe++; return antwort({}); };
  await assert.rejects(
    () => lauf({ cfg: { ...apiCfg, deckelEur: 0.01 }, erzeugen: (c: typeof clip) => erzeugeClip({ cfg: apiCfg, clip: c, auth: "Key a:b", idempotenzKey: "k", fetchImpl }) }),
    ProduktDeckelError,
  );
  assert.equal(aufrufe, 0);
});

test("Download liefert Bytes, HTTP-Fehler wirft", async () => {
  const ok = await ladeHerunter("u", async () => ({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2]).buffer }) as unknown as Response);
  assert.equal(ok.length, 2);
  await assert.rejects(() => ladeHerunter("u", async () => ({ ok: false, status: 404 }) as unknown as Response), /404/);
});
