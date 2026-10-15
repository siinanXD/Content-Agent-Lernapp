/**
 * SIN-672: Eine Summe für kosten_woche (Planer) und den Wochendeckel der Fabrik.
 * Zählt alle Zeilen von pipeline_run_costs (auch judge-backfill, goldset-regression) der letzten 7 Tage.
 * @param {Array<{ cost_eur?: unknown, created_at: string }>} rows
 */
export function weekCost(rows, now = new Date()) {
  const since = now.getTime() - 7 * 864e5;
  const week = rows.filter((r) => new Date(r.created_at).getTime() >= since);
  return { sumEur: week.reduce((a, r) => a + Number(r.cost_eur ?? 0), 0), runs: week.length };
}
