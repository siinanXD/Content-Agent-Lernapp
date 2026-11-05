import assert from "node:assert/strict";
import test from "node:test";
import { GEBIETE_TABELLEN, gebietFuerEinheit, tabelleFuerKurs, unbekannteBloecke } from "./pruefungsgebiete";

/** Einheiten-IDs, die die Tabelle abdeckt: je Block `einheiten` Stück (u1..un) plus die Ausnahmen. */
function alleEinheiten(t: (typeof GEBIETE_TABELLEN)[number]): string[] {
  const ids = Object.entries(t.bloecke).flatMap(([b, row]) => Array.from({ length: row.einheiten }, (_, i) => `${b}-u${i + 1}`));
  return [...new Set([...ids, ...Object.keys(t.ausnahmen)])];
}

test("Jede Einheit von MAF und Kaufmann bekommt genau ein Gebiet, Summen wie im Bericht (SIN-1534)", () => {
  const erwartet = { "Maschinen- und Anlagenführer": 701, Industriekaufmann: 1140 };
  for (const t of GEBIETE_TABELLEN) {
    const ids = alleEinheiten(t);
    assert.equal(ids.length, erwartet[t.kurs as keyof typeof erwartet], t.kurs);
    const proGebiet: Record<string, number> = {};
    for (const id of ids) {
      const g = gebietFuerEinheit(t, id);
      assert.ok(g, `${id} ohne Gebiet`);
      assert.ok(t.gebiete[g.gebiet], `${id}: Gebiet ${g.gebiet} unbekannt`);
      proGebiet[g.gebiet] = (proGebiet[g.gebiet] ?? 0) + 1;
    }
    for (const [id, row] of Object.entries(t.gebiete)) assert.equal(proGebiet[id] ?? 0, row.einheiten, `${t.kurs} ${id}`);
  }
  const maf = tabelleFuerKurs("e22073de-7020-4380-9002-c70d46c25e25")!;
  const kfm = tabelleFuerKurs("5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31")!;
  assert.equal(maf.gebiete["PT-d"]!.einheiten, 113);
  assert.equal(kfm.gebiete["T2A-4"]!.einheiten, 172);
});

test("Unsichere Zuordnungen bleiben markiert: MAF 253, Kaufmann 166", () => {
  const unsicher = (t: (typeof GEBIETE_TABELLEN)[number]) => alleEinheiten(t).filter((id) => gebietFuerEinheit(t, id)!.unsicher).length;
  assert.equal(unsicher(tabelleFuerKurs("e22073de-7020-4380-9002-c70d46c25e25")!), 253);
  assert.equal(unsicher(tabelleFuerKurs("5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31")!), 166);
});

test("Unbekannter Block: kein Gebiet, Warnung statt Raten; Industriemechaniker ohne Tabelle", () => {
  const maf = tabelleFuerKurs("e22073de-7020-4380-9002-c70d46c25e25")!;
  assert.equal(gebietFuerEinheit(maf, "XYZ-9-u1"), undefined);
  assert.equal(gebietFuerEinheit(maf, "unit-01"), undefined);
  assert.deepEqual(unbekannteBloecke(maf, ["LF1-1-u1", "XYZ-9-u1", "XYZ-9-u2"]), ["XYZ-9"]);
  assert.equal(tabelleFuerKurs("00000000-0000-0000-0000-000000000000"), undefined);
});
