/**
 * AP-18e: Generate prompt templates for the four didactic variants.
 * AP-14 generate-agent calls buildDidaktikBlockPrompt for each curriculum block.
 */

import {
  variantFromBlock,
  type UnitVariant,
} from "@/lib/content/didaktik";
import {
  blockSources,
  type Curriculum,
  type CurriculumBlock,
  type CurriculumModule,
  type QuestionMix,
} from "@/lib/content/curriculum";

const VARIANT_RULES: Record<UnitVariant, string> = {
  standard:
    "Variante standard: sections.einstieg (1 Satz Praxis), sections.kern (≤120 Wörter), sections.beispiel (≤60 Wörter), sections.merksatz (≤15 Wörter).",
  ablauf:
    "Variante ablauf: sections.kern als nummerierte Schritte (3–7). image.kind=flow aus genau diesen Schritten (Mermaid → SVG). generatedFrom = Mermaid-Quelltext.",
  rechnen:
    "Variante rechnen: sections.kern nennt Größen, Einheiten und Formel; sections.beispiel ist vollständiger Rechenweg; sections.merksatz = Formel in Worten. Rechenfragen mit Toleranz/Rundung und sampleSolution.",
  sicherheit:
    "Variante sicherheit: sections.kern in Folge Gefahr → Regel → Folge bei Verstoß. image.kind=sign wenn sinnvoll. safetyFlag=true auf jeder Einheit. 10 % menschliche Stichprobe vor publish.",
};

export function formatMix(mix: QuestionMix): string {
  return (Object.entries(mix) as Array<[keyof QuestionMix, number]>)
    .map(([k, v]) => `${k}=${v}%`)
    .join(", ");
}

export function didaktikSchemaHint(): string {
  return `Schema je Einheit: {"id","title","minutes","moduleId","blockId","variant","sections":{"einstieg","kern","beispiel","merksatz"},"explanation":"Zusammenfassung der sections (Fallback)","explanationSimple?","image?":{"src","alt","longDescription?","kind","source":{"url","license","attribution?"},"generatedFrom?"},"safetyFlag?","questions":[{"id","type","level":"erinnern|verstehen|anwenden","prompt","choices?","pairs?","steps?","blanks?","correct","explanation","sourceUrl","examAreas","image?","sampleSolution?","sampleChecklist?"}]}.
Stufenmix pro Einheit: 2 erinnern / 3 verstehen / 2 anwenden (bei 7 Fragen; bei 5–8 anpassen). Rückmeldung ≤60 Wörter mit Quelle.
Offene Aufgaben (rechnen/kurze Begründung): nur sampleSolution + sampleChecklist zur Selbstkontrolle — keine KI-Bewertung.
Phase A: nur generierte SVG (license Generated-SVG), keine Commons-/KI-Bilder.
explanation muss immer gesetzt sein (Fallback aus sections).`;
}

/** Full block prompt with variant rules (AP-14/AP-15 contract). */
export function buildDidaktikBlockPrompt(
  c: Curriculum,
  mod: CurriculumModule,
  block: CurriculumBlock,
): string {
  const sources = blockSources(c, block);
  const fetchedAt = sources[0]?.fetchedAt ?? c.version;
  const sourceUrls =
    sources.map((s) => s.url).join(" | ") || "(amtliche AO/RLP-Quellen)";
  const variant = variantFromBlock({
    rechnen: block.rechnen,
    safety: block.safety || mod.safety,
    topics: block.topics,
  });
  const examAreas = mod.examAreas.join(", ") || "(keine)";

  return `Erzeuge ${block.units} Lerneinheiten (je 5–10 Minuten) für den Block "${block.title}" im Modul "${mod.title}"
der Ausbildung ${c.keyword}${c.variantLabel ? `, ${c.variantLabel}` : ""}, Ausbildungsjahr ${mod.year}.
Niveau: ${mod.niveau}. Themen: ${block.topics.join("; ")}.
Erlaubte Quellen (nur diese zitieren, URL in sourceUrl, Abrufdatum ${fetchedAt} in sourceFetchedAt): ${sourceUrls}.
Fragetypen-Mix in Prozent: ${formatMix(mod.questionMix)}.
examAreas je Frage aus dem Modul: [${examAreas}].
Didaktik-Variante für diesen Block: ${variant}.
${VARIANT_RULES[variant]}
Verboten: IHK-Prüfungsaufgaben oder Umformulierung, Personendaten, Inhalte ohne Quelle, KI-Bewertung von Lernenden.
Jede Einheit trägt moduleId="${mod.id}", blockId="${block.id}", variant="${variant}".
${didaktikSchemaHint()}
Antworte nur mit JSON: {"id","title","focus","moduleId","blockId","units":[...]}`;
}

/**
 * Fixed prefix for Batch requests (AP-22): identical for every request of a course, so it is
 * cached via cache_control. Holds Didaktik rules (all four variants, schema) and the
 * curriculum map; per-chunk text (block, topics, sources, unit range) stays in the user turn.
 */
export function buildDidaktikFixedBlock(c: Curriculum): string {
  const map = [...c.modules]
    .sort((a, b) => a.order - b.order)
    .map(
      (m) =>
        `- ${m.id} (Jahr ${m.year}, ${m.niveau}, ${m.unitsTarget} Einheiten): ${m.title}; Blöcke: ${m.blocks
          .map((b) => `${b.id} "${b.title}" (${b.units})`)
          .join(", ")}`,
    )
    .join("\n");
  const rules = (Object.values(VARIANT_RULES) as string[]).join("\n");
  return `Du erzeugst Lerneinheiten für die Ausbildung ${c.keyword}${c.variantLabel ? `, ${c.variantLabel}` : ""}.
Curriculum-Map (Module und Blöcke):
${map}

Didaktik-Varianten:
${rules}
Verboten: IHK-Prüfungsaufgaben oder Umformulierung, Personendaten, Inhalte ohne Quelle, KI-Bewertung von Lernenden.
${didaktikSchemaHint()}
Antworte nur mit JSON: {"id","title","focus","moduleId","blockId","units":[...]}`;
}

/** system content for Batch params: fixed block with 1h cache breakpoint (batches can exceed 5 min). */
export function cachedSystemBlocks(c: Curriculum): Array<{
  type: "text";
  text: string;
  cache_control: { type: "ephemeral"; ttl: "1h" };
}> {
  return [
    {
      type: "text",
      text: buildDidaktikFixedBlock(c),
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ];
}

/** Lightweight keyword prompt (seed/live without map block) — still enforces 4 variants. */
export function buildDidaktikKeywordPrompt(keyword: string, variant: UnitVariant = "sicherheit"): string {
  return `Erzeuge EIN vollständiges Lernfeld als JSON für "${keyword}", Fokus Sicherheit und Gesundheitsschutz.
3 Einheiten, Variante ${variant}. ${VARIANT_RULES[variant]}
Je Einheit sections + explanation-Fallback, 5–8 Fragen mit level und examAreas (z.B. WISO-1).
Typen: auswahl|zuordnen|lueckentext|reihenfolge|rechnen. Bildfragen als auswahl/zuordnen mit image.
${didaktikSchemaHint()}
Keine IHK-Originalprüfungen, keine Personendaten. Nur JSON.`;
}

export function variantRules(): Record<UnitVariant, string> {
  return { ...VARIANT_RULES };
}
