/**
 * Seed official discovery pages for MAF, verified reachable in AP-03 scaffold.
 * Live Claude web_search/web_fetch replaces/extends these when ANTHROPIC_API_KEY is set.
 * Never IHK exam tasks.
 */
export type ResearchSource = {
  title: string;
  url: string;
  fetchedAt: string;
  kind: "ausbildungsordnung" | "rahmenlehrplan" | "pruefung" | "berufsinformation" | "other";
  note?: string;
};

export function mafSeedSources(now = new Date().toISOString()): ResearchSource[] {
  return [
    {
      title: "BIBB Berufesuche — Maschinen- und Anlagenführer/in",
      url: "https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121",
      fetchedAt: now,
      kind: "berufsinformation",
      note: "HTTP 200 verified 2026-10-02; entry to AO/RLP documents",
    },
    {
      title: "BERUFENET — Maschinen- und Anlagenführer/in",
      url: "https://berufenet.arbeitsagentur.de/berufenet/faces/index?path=null/kurzbeschreibung&dkz=51121",
      fetchedAt: now,
      kind: "berufsinformation",
      note: "HTTP 200 verified 2026-10-02; BA occupational profile",
    },
  ];
}
