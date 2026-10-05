/**
 * Anthropic HTTP helpers — workspace-scoped keys need anthropic-workspace-id (D-25 / ENV.md).
 * Never log key or workspace values.
 */

export const ANTHROPIC_API_BASE = "https://api.anthropic.com";

/** Model IDs aus der offiziellen Anthropic-Preisseite / Modell-Übersicht (geprüft 2026-10-05, D-41). */
export const KNOWN_GENERATOR_MODELS = ["claude-sonnet-5-5", "claude-haiku-4-5-20251001"] as const;
export type GeneratorModel = (typeof KNOWN_GENERATOR_MODELS)[number];
export const DEFAULT_GENERATOR_MODEL: GeneratorModel = "claude-sonnet-5-5";

/** Env `GENERATOR_MODEL` überschreibt den Default; unbekannte IDs scheitern laut statt falsch abzurechnen. */
export function resolveGeneratorModel(raw: string | undefined): GeneratorModel {
  const value = raw?.trim();
  if (!value) return DEFAULT_GENERATOR_MODEL;
  const hit = KNOWN_GENERATOR_MODELS.find((m) => m === value);
  if (!hit) {
    throw new Error(
      `GENERATOR_MODEL "${value}" unbekannt. Erlaubt: ${KNOWN_GENERATOR_MODELS.join(", ")}`,
    );
  }
  return hit;
}

export const GENERATOR_MODEL: GeneratorModel = resolveGeneratorModel(process.env.GENERATOR_MODEL);

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
