import { mafSeedSources } from "@/lib/research/maf-seed-sources";

/**
 * Lesbarer Name einer Quelle für die Anzeige (SIN-1581): Titel der bekannten amtlichen Quelle,
 * sonst der Anbieter. Nie die rohe Adresse; die steht nur im `href`.
 */
export function quellenName(url: string): string {
  const bekannt = mafSeedSources().find((s) => s.url === url);
  if (bekannt) return bekannt.title.replace(/ \(HTML\)$/, "");
  try {
    return `Quelle bei ${new URL(url).hostname.replace(/^www\./, "")}`;
  } catch {
    return "Amtliche Quelle";
  }
}
