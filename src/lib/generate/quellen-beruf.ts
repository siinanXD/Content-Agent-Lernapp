/**
 * SIN-621: Die Quelle einer Einheit muss zum Beruf des Kurses passen.
 * Industriemechaniker/in ist ein eigener Beruf, kein Schwerpunkt von Maschinen- und Anlagenführer/in.
 */
export type Beruf = "maf" | "indkfl" | "industriemechaniker";

/** Merkmal der Quell-URL je Beruf; eine Quelle gehört dem Beruf, dessen Merkmal sie trifft. */
const QUELLE_VON: ReadonlyArray<{ beruf: Beruf; merkmal: RegExp }> = [
  { beruf: "industriemechaniker", merkmal: /industriemechaniker/i },
  { beruf: "indkfl", merkmal: /indkfl|industriekaufleute/i },
  { beruf: "maf", merkmal: /maschf_ausbv|maschinen-?_?und_?anlagenf/i },
];

/** Beruf, dem eine amtliche Quelle gehört; `null` bei Quellen ohne Berufsbezug (z. B. BIBB, WiSo). */
export function berufDerQuelle(url: string): Beruf | null {
  return QUELLE_VON.find((q) => q.merkmal.test(url))?.beruf ?? null;
}

/** Passt die Quelle zum Beruf des Kurses? Quellen ohne Berufsbezug passen immer. */
export function quelleGehoertZuBeruf(url: string, beruf: string): boolean {
  const eigen = berufDerQuelle(url);
  return eigen === null || eigen === beruf;
}

/** Trennt Einheiten mit Quelle eines fremden Berufs ab (sie werden nicht gespeichert). */
export function trenneFremdeQuellen<T extends { id: string; sourceUrl: string }>(
  units: readonly T[],
  beruf: string,
): { passend: T[]; fremd: T[] } {
  const passend = units.filter((u) => quelleGehoertZuBeruf(u.sourceUrl, beruf));
  return { passend, fremd: units.filter((u) => !passend.includes(u)) };
}
