import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isPaused, parsePausedUntil } from "../../../scripts/autonomy/budget.mjs";
import { buildDigest, needsYou } from "../../../scripts/autonomy/digest.mjs";
import { MAX_PAUSE_HOURS, planPause } from "../../../scripts/autonomy/pause.mjs";
import { analyze } from "../../../scripts/autonomy/status.mjs";
import { daysLeft, describeExpiry, expiringSoon, parseExpiry, parseTokens, renderTokens } from "../../../scripts/autonomy/tokens.mjs";

const NOW = new Date("2026-10-06T12:00:00Z");
const limits = JSON.parse(readFileSync("docs/autonomy/free-tier-limits.json", "utf8"));
const statusFixture = () => JSON.parse(readFileSync("docs/autonomy/fixture-status.json", "utf8"));
const tokenMd = readFileSync("docs/autonomy/tokens.md", "utf8");

test("Notbremse: pausieren setzt eine Zeit in der Zukunft, die der Dispatcher respektiert", () => {
  const { until } = planPause("pausieren", "6", NOW);
  assert.equal(until, "2026-10-06T18:00:00.000Z");
  assert.equal(isPaused(until, NOW), true);
  assert.equal(isPaused(until, new Date("2026-10-06T18:00:01Z")), false);
  assert.equal(planPause("pausieren", "", NOW).until, "2026-10-07T12:00:00.000Z");
  assert.equal(planPause("pausieren", undefined, NOW).until, "2026-10-07T12:00:00.000Z");
  assert.equal(planPause("pausieren", "1,5", NOW).until, "2026-10-06T13:30:00.000Z");
});

test("Notbremse: fortsetzen leert den Wert, die Pause ist aus", () => {
  const { until } = planPause("fortsetzen", "6", NOW);
  assert.equal(until, "");
  assert.equal(isPaused(until, NOW), false);
  assert.equal(parsePausedUntil(until), null);
});

test("Notbremse: ungültige Aktion oder Dauer wird abgelehnt", () => {
  assert.throws(() => planPause("löschen", "", NOW), /Unbekannte Aktion/);
  assert.throws(() => planPause("pausieren", "abc", NOW), /ungültig/);
  assert.throws(() => planPause("pausieren", "0", NOW), /ungültig/);
  assert.throws(() => planPause("pausieren", "-3", NOW), /ungültig/);
  assert.throws(() => planPause("pausieren", String(MAX_PAUSE_HOURS + 1), NOW), /ungültig/);
});

test("Notbremse: Status-Seite zeigt „Pausiert bis …“", () => {
  const snap = statusFixture();
  snap.paused = "2026-10-05T15:00:00Z";
  assert.match(analyze(snap, limits, {}).body, /Pausiert bis 2026-10-05T15:00:00\.000Z/);
  snap.paused = "";
  assert.doesNotMatch(analyze(snap, limits, {}).body, /Pausiert bis/);
});

test("Token-Liste: enthält cron-takt und Figma agents-read mit 03.01.2027, ohne Werte", () => {
  const tokens = parseTokens(tokenMd);
  const byName = Object.fromEntries(tokens.map((t: { name: string; ablauf: string }) => [t.name, t]));
  assert.equal(byName["cron-takt"].ablauf, "ca. 03.01.2027");
  assert.equal(byName["Figma agents-read"].ablauf, "03.01.2027");
  assert.equal(byName["agent-workflows"].ablauf, "03.01.2027");
  assert.equal(byName["AGENT_VARIABLES_TOKEN"].ablauf, "ca. 03.01.2027");
  for (const t of tokens) assert.ok(t.name && t.ort && t.ablauf && t.rechte, `Zeile unvollständig: ${t.name}`);
  assert.doesNotMatch(tokenMd, /ghp_|github_pat_|sk-ant|figd_/);
});

test("Token-Ablauf: Tage, Texte und 14-Tage-Schwelle", () => {
  assert.equal(parseExpiry("03.01.2027")?.toISOString(), "2027-01-03T23:59:59.000Z");
  assert.equal(parseExpiry("31.02.2027"), null);
  assert.equal(parseExpiry("unbekannt"), null);
  const t = (ablauf: string) => ({ name: "x", ort: "o", ablauf, rechte: "r" });
  assert.equal(daysLeft(t("03.01.2027"), NOW), 89);
  assert.equal(describeExpiry(t("03.01.2027"), NOW), "läuft in 89 Tagen ab");
  assert.equal(describeExpiry(t("07.10.2026"), NOW), "läuft in 1 Tag ab");
  assert.equal(describeExpiry(t("06.10.2026"), NOW), "läuft heute ab");
  assert.equal(describeExpiry(t("01.10.2026"), NOW), "seit 5 Tagen abgelaufen");
  assert.equal(describeExpiry(t("unbekannt"), NOW), "Ablauf unbekannt");
  const list = [t("03.01.2027"), t("20.10.2026"), t("21.10.2026"), t("unbekannt"), t("01.10.2026")];
  assert.deepEqual(expiringSoon(list, NOW).map((x: { ablauf: string }) => x.ablauf), ["01.10.2026", "20.10.2026"]);
});

test("Token-Ablauf: Status-Seite zeigt „läuft in X Tagen ab“", () => {
  const snap = statusFixture();
  snap.tokens = parseTokens(tokenMd);
  const body = analyze(snap, limits, {}).body;
  assert.match(body, /## Token-Ablauf/);
  assert.match(body, /cron-takt: läuft in 90 Tagen ab \(ca\. 03\.01\.2027\)/);
  assert.match(body, /agent-workflows: läuft in 90 Tagen ab \(03\.01\.2027\)/);
  assert.match(renderTokens([], NOW), /nicht lesbar/);
});

test("Token-Ablauf: Tages-Update nennt Token erst 14 Tage vorher unter „Braucht dich“", () => {
  const tokens = parseTokens(tokenMd);
  assert.deepEqual(needsYou({ tokens, now: NOW }), []);
  const late = new Date("2026-12-20T12:00:00Z");
  const need = needsYou({ tokens, now: late });
  assert.equal(need.filter((n: string) => /^Token (cron-takt|Figma agents-read) läuft in 14 Tagen ab/.test(n)).length, 2);
  const digest = buildDigest({ now: late.toISOString(), slot: "morgen", tokens, issues: [], openPrs: [], mergedPrs: [], decisions: [] }).text;
  assert.match(digest, /\*\*Braucht dich\*\*\n- Token cron-takt läuft in 14 Tagen ab/);
});
