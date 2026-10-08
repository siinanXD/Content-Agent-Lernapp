import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { berlinDay, buildDigest, decisionLine, groupOf, lastDigest, markOf, needsYou, plainLine, sendTelegram } from "../../../scripts/autonomy/digest.mjs";

const fixture = () => JSON.parse(readFileSync("docs/autonomy/fixture-digest.json", "utf8"));

test("Digest morgen: Spuren, Entscheidung, Plan, Braucht dich, Kennzahlen, Phase", () => {
  const { text } = buildDigest({ ...fixture(), slot: "morgen" });
  assert.match(text, /^@siinanXD \*\*Update 10:00\*\*/);
  assert.match(text, /- Frontend: Lernpfad: Tagesziel als Ring \(SIN-201\)/);
  assert.match(text, /- Infrastruktur: Autonomie: Free-Tier-Wächter im Planer \(SIN-225\)/);
  assert.doesNotMatch(text, /SIN-1\)/, "älter als das letzte Update");
  assert.match(text, /SIN-246: Zweimal täglich ein Kommentar im Loop-Status\./);
  assert.match(text, /\*\*Heute geplant\*\*\n- SIN-250/);
  assert.doesNotMatch(text, /SIN-252 Neues Design-Paket \(/, "Design-Issues stehen nicht in der Schlange");
  assert.match(text, /Freigabe PR #80/);
  assert.match(text, /Design SIN-252/);
  assert.match(text, /Kontingente über 50 %: GitHub Actions: Läufe heute 62.5 %/);
  assert.match(text, /Phase: bauen · Produktreife 6 von 19 Punkten/);
  assert.ok(text.split("\n").length <= 30);
});

test("Digest abend: „Über Nacht geplant“, ohne offene Punkte „Nichts zu tun.“", () => {
  const { text } = buildDigest({ ...fixture(), slot: "abend", openPrs: [], issues: [], mergedPrs: [], decisions: [], readiness: { green: 19, total: 19 } });
  assert.match(text, /Update 20:00/);
  assert.match(text, /\*\*Über Nacht geplant\*\*\n- nichts in der Schlange/);
  assert.match(text, /Nichts zu tun\./);
  assert.match(text, /- nichts Neues/);
  assert.match(text, /Phase: beobachten/);
});

test("Digest: nicht lesbare Kennzahlen heißen „nicht verfügbar“", () => {
  const { text } = buildDigest({ ...fixture(), slot: "morgen", content: null, readiness: null });
  assert.match(text, /Content: nicht verfügbar/);
  assert.match(text, /Phase und Produktreife: nicht verfügbar/);
});

test("Digest: Merker mit Tag und Slot verhindert Doppelmeldung, letzter Merker ist der Beginn", () => {
  const first = buildDigest({ ...fixture(), slot: "morgen" });
  const day = berlinDay(new Date(fixture().now));
  assert.equal(day, "2026-10-05");
  const now = new Date(fixture().now);
  const seen = lastDigest(["Hallo", first.text], now, "morgen");
  assert.equal(seen.already, true);
  assert.equal(seen.last?.at, fixture().now);
  assert.equal(lastDigest([first.text], now, "abend").already, false);
  assert.equal(lastDigest([first.text], new Date(now.getTime() + 7 * 3600_000), "morgen").already, false);
  assert.equal(lastDigest([], now, "morgen").last, null);
  assert.ok(first.text.includes(markOf(day, "morgen", fixture().now)));
});

test("Digest: Tag folgt Europe/Berlin, nicht UTC", () => {
  assert.equal(berlinDay(new Date("2026-10-05T22:30:00Z")), "2026-10-06");
});

test("Digest: Spur und Klartext aus dem PR-Titel", () => {
  assert.equal(groupOf("feat(content): X (SIN-1)"), "Content");
  assert.equal(groupOf("feat(lernpfad): X (SIN-1)"), "Frontend");
  assert.equal(groupOf("chore(ci): X (SIN-1)"), "Infrastruktur");
  assert.equal(groupOf("fix(generate): X (SIN-1)"), "Backend");
  assert.equal(plainLine("feat(lernpfad): Fortschrittsbalken (SIN-123)"), "Lernpfad: Fortschrittsbalken (SIN-123)");
  assert.equal(plainLine("feat(lernpfad): Fortschrittsbalken (SIN-123)", "Frontend"), "Lernpfad: Fortschrittsbalken (SIN-123)");
  assert.equal(plainLine("feat(content): Modul (SIN-2)", "Content"), "Modul (SIN-2)");
});

test("Digest: Entscheidung ein Satz, Links ohne Markdown", () => {
  const t = "# SIN-9 — Titel\n\n- **Entscheidung:** Nutze [Hermes](https://x.y) für alles. Zweiter Satz.\n";
  assert.equal(decisionLine("docs/decisions/SIN-9-kurz.md", t), "SIN-9: Nutze Hermes für alles.");
  assert.equal(decisionLine("docs/decisions/SIN-9-kurz.md", "# SIN-9 — Nur Titel"), "SIN-9: Nur Titel");
});

test("Digest: freigegebene High-PRs brauchen Sinan nicht mehr", () => {
  const open = [{ number: 1, title: "a", labels: ["risk:high", "freigegeben"] }, { number: 2, title: "b", labels: ["needs-human"] }];
  assert.deepEqual(needsYou({ openPrs: open }), ["Blocker PR #2: b"]);
});

test("Digest: Telegram nur mit Token und Chat, ohne Erwähnung und Merker", async () => {
  assert.equal(await sendTelegram("x", {}), false);
  let body: { text: string; chat_id: string } | null = null;
  const fetchImpl = (async (_u: string, init: { body: string }) => {
    body = JSON.parse(init.body);
    return { ok: true };
  }) as unknown as typeof fetch;
  assert.equal(await sendTelegram("@siinanXD **Update**\n<!-- digest: {} -->", { TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "7" }, fetchImpl), true);
  assert.deepEqual(body, { chat_id: "7", text: "Update" });
});

const at = (iso: string, slot: string, force = false) => `x\n${markOf(berlinDay(new Date(iso)), slot, iso, force)}`;

test("Digest SIN-267: Testläufe um 00:00 Berlin sperren 10:00 und 20:00 nicht", () => {
  const tests = [at("2026-10-05T22:00:00Z", "morgen", true), at("2026-10-05T22:05:00Z", "abend", true)];
  assert.equal(lastDigest(tests, new Date("2026-10-06T08:00:00Z"), "morgen").already, false);
  assert.equal(lastDigest(tests, new Date("2026-10-06T18:00:00Z"), "abend").already, false);
  assert.equal(lastDigest(tests, new Date("2026-10-06T08:00:00Z"), "morgen").last, null);
});

test("Digest SIN-267: auch ohne force sperrt ein Lauf von 00:00 den Slot um 10:00 nicht", () => {
  const early = [at("2026-10-05T22:00:00Z", "morgen")];
  assert.equal(lastDigest(early, new Date("2026-10-06T08:00:00Z"), "morgen").already, false);
});

test("Digest SIN-267: Doppel-Lauf 10:00 + 10:05 sendet nur einmal", () => {
  const first = [at("2026-10-06T08:00:00Z", "morgen")];
  assert.equal(lastDigest(first, new Date("2026-10-06T08:05:00Z"), "morgen").already, true);
  assert.equal(lastDigest(first, new Date("2026-10-06T08:05:00Z"), "abend").already, false);
});

test("Tages-Update nennt geänderte Diagramme (SIN-376)", () => {
  const mit = buildDigest({ ...fixture(), slot: "morgen", diagramme: ["docs/diagramme/pipeline.mmd"] }).text;
  assert.match(mit, /\*\*Diagramme geändert:\*\* docs\/diagramme\/pipeline\.mmd/);
  assert.ok(!buildDigest({ ...fixture(), slot: "morgen" }).text.includes("Diagramme geändert"));
});
