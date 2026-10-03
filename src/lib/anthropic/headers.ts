/**
 * Shared Anthropic HTTP headers for Messages / Message Batches.
 * Never log key or workspace values.
 *
 * @see https://platform.claude.com/docs/en/api/overview
 */

export type AnthropicHeaderOpts = {
  apiKey: string;
  /** Extra headers (e.g. anthropic-beta for web_fetch). */
  extra?: Record<string, string>;
};

/**
 * Build request headers. Sends `anthropic-workspace-id` when
 * `ANTHROPIC_WORKSPACE_ID` is set (required for multi-workspace keys; optional otherwise).
 */
export function anthropicHeaders(opts: AnthropicHeaderOpts): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": opts.apiKey,
    "anthropic-version": "2023-06-01",
    ...opts.extra,
  };
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  if (workspaceId) {
    headers["anthropic-workspace-id"] = workspaceId;
  }
  return headers;
}
