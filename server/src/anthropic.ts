const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Plain fetch rather than the Anthropic SDK — mirrors the app's own
 * src/lib/ai.ts, and here it's also what keeps this handler runnable
 * unchanged on Cloudflare Workers, Vercel Edge, and Node alike (all of
 * them have global fetch; not all of them are a great fit for the SDK's
 * Node-oriented runtime detection).
 */
export interface AnthropicMessageParams {
  model: string;
  max_tokens: number;
  system?: unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
  output_config?: { effort?: "low" | "medium" | "high" | "xhigh" | "max" };
  messages: unknown[];
}

export interface AnthropicContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

export interface AnthropicMessage {
  content: AnthropicContentBlock[];
  stop_reason?: string;
}

export async function callAnthropic(apiKey: string, params: AnthropicMessageParams): Promise<AnthropicMessage> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(params),
  });
  const body = await res.json();
  if (!res.ok) {
    const message = (body as { error?: { message?: string } })?.error?.message;
    throw new Error(message ?? `Anthropic request failed (HTTP ${res.status})`);
  }
  return body as AnthropicMessage;
}

/** Marks a system block cacheable so the fixed instructions aren't repriced/recomputed on every call. */
export function cachedText(text: string) {
  return { type: "text" as const, text, cache_control: { type: "ephemeral" as const } };
}

export function textFromMessage(message: AnthropicMessage): string {
  return message.content
    .map((block) => (block.type === "text" ? (block.text ?? "") : ""))
    .join("")
    .trim();
}

export function toolInputFromMessage(message: AnthropicMessage, toolName: string): unknown {
  const block = message.content.find((b) => b.type === "tool_use" && b.name === toolName);
  return block?.input;
}
