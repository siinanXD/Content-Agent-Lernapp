import { anthropicHeaders } from "@/lib/anthropic/headers";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import { outputConfig } from "@/lib/generate/api-schema";
import {
  mafSeedPlanVariants,
  planMeetsAcceptance,
  type PlanVariant,
} from "./maf-plan-seed";

export type PlanAgentResult = {
  variants: PlanVariant[];
  mode: "live" | "seed";
  modelId?: string;
  warning?: string;
};

const GENERATOR_MODEL = "claude-sonnet-5-5";

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const planUnit = {
  type: "object",
  properties: { id: str, title: str, minutes: num, sourceKind: str, moduleId: str, blockId: str, niveau: str },
  required: ["id", "title", "minutes", "sourceKind", "moduleId", "blockId", "niveau"],
  additionalProperties: false,
};
const planDay = {
  type: "object",
  properties: { day: num, targetMinutes: num, units: { type: "array", items: planUnit } },
  required: ["day", "targetMinutes", "units"],
  additionalProperties: false,
};
const planVariant = {
  type: "object",
  properties: { name: str, durationDays: num, hoursPerDay: num, days: { type: "array", items: planDay } },
  required: ["name", "durationDays", "hoursPerDay", "days"],
  additionalProperties: false,
};

/** Antwortschema des Plan-Agenten (SIN-1036): `{ variants: [...] }`. */
export const PLAN_API_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: { variants: { type: "array", items: planVariant } },
  required: ["variants"],
  additionalProperties: false,
};

/**
 * Build day plans for 2 learning variants (5–10 min units, ~2–3 h/day).
 * Reads docs/content/maf-metall.json via loadMafCurriculum (AP-14 / D-32).
 * Live: Claude structured JSON when ANTHROPIC_API_KEY set.
 * Seed: deterministic map-based day plans.
 */
export async function runPlanAgent(keyword: string): Promise<PlanAgentResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const variants = mafSeedPlanVariants();
    return {
      variants,
      mode: "seed",
      warning: planMeetsAcceptance(variants)
        ? "ANTHROPIC_API_KEY missing — using MAF curriculum seed day plans (2 variants). Set key for live structured plan."
        : "ANTHROPIC_API_KEY missing and seed plan invalid.",
    };
  }

  try {
    const live = await runLivePlan(key, keyword);
    if (live.variants.length >= 2 && planMeetsAcceptance(live.variants)) return live;
    return {
      variants: mafSeedPlanVariants(),
      mode: "seed",
      modelId: GENERATOR_MODEL,
      warning: live.warning ?? "Live plan incomplete; curriculum seed fallback.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      variants: mafSeedPlanVariants(),
      mode: "seed",
      modelId: GENERATOR_MODEL,
      warning: `Live plan failed: ${msg.slice(0, 200)}. Curriculum seed fallback.`,
    };
  }
}

async function runLivePlan(key: string, keyword: string): Promise<PlanAgentResult> {
  const c = loadMafCurriculum();
  const focus = c.variantLabel ?? c.keyword;
  const moduleOutline = [...c.modules]
    .sort((a, b) => a.order - b.order)
    .map(
      (m) =>
        `${m.order}. ${m.id} (${m.unitsTarget} units, year ${m.year}): ${m.title} — niveau: ${m.niveau}; blocks: ${m.blocks.map((b) => b.id).join(", ")}`,
    )
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: anthropicHeaders({ apiKey: key }),
    body: JSON.stringify({
      model: GENERATOR_MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Erzeuge einen Lernplan als JSON für die Ausbildung "${keyword}" (${focus}).
Nutze ausschließlich diese Curriculum-Module in order (M0-Querschnitt etwa jede fünfte Einheit einstreuen):
${moduleOutline}

Genau 2 Varianten: (1) Prüfungsvorbereitung 2 Monate / ~40 Tage / 2.5 h/Tag, (2) Weiterbildung 3 Monate / ~60 Tage / 2 h/Tag.
Einheiten 5–10 Minuten. Keine Personendaten, keine IHK-Originalprüfungen.
Jede Einheit MUSS moduleId, blockId, sourceKind (ausbildungsordnung|rahmenlehrplan|pruefung|berufsinformation|empfehlung) und niveau tragen.
Antwortformat ist per Schema festgelegt.`,
        },
      ],
      output_config: outputConfig(PLAN_API_SCHEMA),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      variants: [],
      mode: "live",
      modelId: GENERATOR_MODEL,
      warning: `Claude API ${res.status}: ${text.slice(0, 200)}`,
    };
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") ?? "";
  const variants = parseVariantsJson(text);
  return { variants, mode: "live", modelId: GENERATOR_MODEL };
}

/** Antwort laut `PLAN_API_SCHEMA` (`{ variants }`); kein Regex, Verstoß = leere Liste und Warnung beim Aufrufer. */
export function parseVariantsJson(text: string): PlanVariant[] {
  try {
    const arr = (JSON.parse(text) as { variants?: PlanVariant[] }).variants;
    if (!Array.isArray(arr)) return [];
    return arr.filter((v) => v?.name && Array.isArray(v.days));
  } catch {
    return [];
  }
}
