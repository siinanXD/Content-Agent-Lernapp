/**
 * Anthropic HTTP helpers — workspace-scoped keys need anthropic-workspace-id (D-25 / ENV.md).
 * Never log key or workspace values.
 */

export const ANTHROPIC_API_BASE = "https://api.anthropic.com";

/** Default generator (D-06). Override with env GENERATOR_MODEL (AP-22 A/B, D-37). */
export const DEFAULT_GENERATOR_MODEL = "claude-sonnet-5-5";
/** Haiku candidate for AP-22 — allowed only if the quality threshold holds (D-06). */
export const HAIKU_GENERATOR_MODEL = "claude-haiku-4-5";
export const ALLOWED_GENERATOR_MODELS = [
  DEFAULT_GENERATOR_MODEL,
  HAIKU_GENERATOR_MODEL,
] as const;
export type GeneratorModel = (typeof ALLOWED_GENERATOR_MODELS)[number];

/** Pure model choice: unknown or empty values fall back to the default. */
export function resolveGeneratorModel(raw: string | undefined | null): GeneratorModel {
  const v = raw?.trim();
  return (ALLOWED_GENERATOR_MODELS as readonly string[]).includes(v ?? "")
    ? (v as GeneratorModel)
    : DEFAULT_GENERATOR_MODEL;
}

/** Generator model from env, read at call time so scripts/tests can switch it. */
export function generatorModel(): GeneratorModel {
  return resolveGeneratorModel(process.env.GENERATOR_MODEL);
}

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function anthropicHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    ...extra,
  };
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  if (workspace) headers["anthropic-workspace-id"] = workspace;
  return headers;
}

export async function anthropicFetch(
  path: string,
  init?: RequestInit & { body?: string },
): Promise<Response> {
  return fetch(`${ANTHROPIC_API_BASE}${path}`, {
    ...init,
    headers: {
      ...anthropicHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}
