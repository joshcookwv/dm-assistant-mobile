import { getApiKey } from "./secure-settings";

export const AI_MODEL = "claude-haiku-4-5-20251001";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("No Claude API key configured yet. Add one in Settings.");
    this.name = "AiNotConfiguredError";
  }
}

export async function isAiConfigured(): Promise<boolean> {
  return Boolean(await getApiKey());
}

/**
 * Marks a block of text as cacheable so repeated calls that share this exact
 * prefix (e.g. static instructions/tool schemas sent on every request) are
 * served from Anthropic's prompt cache instead of being recomputed/rebilled
 * each time.
 */
export function cachedText(text: string) {
  return { type: "text" as const, text, cache_control: { type: "ephemeral" as const } };
}

interface MessagesParams {
  max_tokens: number;
  system?: unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
  messages: unknown[];
}

/**
 * Raw fetch straight to the Anthropic API from the device — no server proxy.
 * Plain fetch rather than @anthropic-ai/sdk to avoid the SDK's Node-oriented
 * assumptions; React Native isn't subject to browser CORS, so an
 * authenticated POST works directly.
 */
export async function callMessages(params: MessagesParams): Promise<any> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AiNotConfiguredError();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: AI_MODEL, ...params }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (HTTP ${res.status})`);
  }
  return body;
}
