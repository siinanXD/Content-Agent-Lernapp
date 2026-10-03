/**
 * Anthropic HTTP helpers — workspace-scoped keys need anthropic-workspace-id (D-25 / ENV.md).
 * Never log key or workspace values.
 */

export const ANTHROPIC_API_BASE = "https://api.anthropic.com";
export const GENERATOR_MODEL = "claude-sonnet-5-5";

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
