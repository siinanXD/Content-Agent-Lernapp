/**
 * Official MAF (Maschinen- und Anlagenführer) sources harvested 2026-10-02.
 * Acceptance (SIN-181 / AP-03): AO + RLP + Prüfungsanforderungen with links.
 * Never IHK exam task copies — only Verordnung / KMK / BIBB / BERUFENET.
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
      title:
        "MaschFüAusbV — Verordnung über die Berufsausbildung zum Maschinen- und Anlagenführer/zur Maschinen- und Anlagenführerin (HTML)",
      url: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html",
      fetchedAt: now,
      kind: "ausbildungsordnung",
      note: "Stand: zuletzt geändert Art. 2 V v. 14.6.2023 I Nr. 151; verified via web fetch 2026-10-02",
    },
    {
      title: "MaschFüAusbV — konsolidierte PDF (gesetze-im-internet.de)",
      url: "https://www.gesetze-im-internet.de/maschf_ausbv/MaschF%C3%BCAusbV.pdf",
      fetchedAt: now,
      kind: "ausbildungsordnung",
      note: "Official PDF of the Ausbildungsordnung including Ausbildungsrahmenplan",
    },
    {
      title: "BIBB — MaschFüAusbV regulation PDF mirror",
      url: "https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/regulation/maschinen_und_anlagenfuehrer.pdf",
      fetchedAt: now,
      kind: "ausbildungsordnung",
      note: "BIBB-hosted Verordnung text; HTTP reachable 2026-10-02",
    },
    {
      title:
        "KMK Rahmenlehrplan Maschinen- und Anlagenführer/in (Beschluss 25.03.2004 i. d. F. 31.03.2023)",
      url: "https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf",
      fetchedAt: now,
      kind: "rahmenlehrplan",
      note: "HTTP 200 verified 2026-10-02; points to related Metall/Kunststoff RLPs for Lernfelder",
    },
    {
      title: "MaschFüAusbV § 9 Abschlussprüfung — Prüfungsanforderungen (Struktur)",
      url: "https://www.gesetze-im-internet.de/maschf_ausbv/__9.html",
      fetchedAt: now,
      kind: "pruefung",
      note: "Official exam structure/weights only — not IHK task copies",
    },
    {
      title: "MaschFüAusbV § 8 Zwischenprüfung — Prüfungsanforderungen (Struktur)",
      url: "https://www.gesetze-im-internet.de/maschf_ausbv/__8.html",
      fetchedAt: now,
      kind: "pruefung",
      note: "Official intermediate exam structure — not IHK task copies",
    },
    {
      title: "BIBB Berufesuche — Maschinen- und Anlagenführer/in",
      url: "https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121",
      fetchedAt: now,
      kind: "berufsinformation",
      note: "HTTP 200 verified 2026-10-02; entry to AO/RLP documents",
    },
    {
      title: "BIBB Berufesuche profile (alt path) — Maschinen- und Anlagenführer/in",
      url: "https://www.bibb.de/dienst/berufesuche/profile/apprenticeship/87iz96t0",
      fetchedAt: now,
      kind: "berufsinformation",
      note: "HTTP 200 verified 2026-10-02",
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

/** True when seed covers all three required kinds for AP-03 acceptance. */
export function seedCoversAcceptance(sources: ResearchSource[] = mafSeedSources()): boolean {
  const kinds = new Set(sources.map((s) => s.kind));
  return (
    kinds.has("ausbildungsordnung") &&
    kinds.has("rahmenlehrplan") &&
    kinds.has("pruefung")
  );
}
