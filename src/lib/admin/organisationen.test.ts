import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aktionsText,
  checkOrganisationInput,
  einladungsLink,
  neuerCode,
  orgStatus,
  summe,
  type OrganisationZeile,
} from "./organisationen";
import { checkCode } from "@/lib/ausbilder/zugang";

const ok = { name: " Träger A ", contactEmail: "Kontakt@Traeger.de", trainerQuota: "3", memberQuota: 40 };

test("Organisation: Eingaben werden bereinigt und gelesen", () => {
  const r = checkOrganisationInput(ok);
  assert.ok(r.ok);
  assert.deepEqual(r.value, { name: "Träger A", contactEmail: "kontakt@traeger.de", trainerQuota: 3, memberQuota: 40 });
});

test("Organisation: ungültige Angaben werden abgelehnt", () => {
  for (const bad of [
    { ...ok, name: "  " },
    { ...ok, contactEmail: "kaputt" },
    { ...ok, trainerQuota: 0 },
    { ...ok, trainerQuota: 1.5 },
    { ...ok, memberQuota: -1 },
    { ...ok, memberQuota: 501 },
    null,
  ]) {
    assert.equal(checkOrganisationInput(bad).ok, false);
  }
});

test("Status: Eingeladen, Aktiv, Voll wie in Figma", () => {
  const z = { trainerQuota: 3, trainersUsed: 2, memberQuota: 40, membersUsed: 28 };
  assert.equal(orgStatus(z), "Aktiv");
  assert.equal(orgStatus({ ...z, trainersUsed: 0, membersUsed: 0 }), "Eingeladen");
  assert.equal(orgStatus({ trainerQuota: 1, trainersUsed: 1, memberQuota: 12, membersUsed: 12 }), "Voll");
  assert.equal(aktionsText("Eingeladen"), "Link erneut");
  assert.equal(aktionsText("Voll"), "Erhöhen");
  assert.equal(aktionsText("Aktiv"), "Link senden");
});

test("Summe über alle Organisationen", () => {
  const row = (t: number, tq: number, m: number, mq: number): OrganisationZeile => ({
    id: "x", name: "x", trainersUsed: t, trainerQuota: tq, membersUsed: m, memberQuota: mq, status: "Aktiv",
  });
  assert.deepEqual(summe([row(2, 3, 28, 40), row(1, 1, 12, 12)]), {
    trainersUsed: 3, trainerQuota: 4, membersUsed: 40, memberQuota: 52,
  });
});

test("Einladungslink: der erzeugte Code ist für G0 gültig", () => {
  const code = neuerCode();
  assert.ok(checkCode(code).ok);
  assert.notEqual(code, neuerCode());
  assert.equal(einladungsLink("https://app.example", code), `https://app.example/ausbilder/zugang?code=${code}`);
});
