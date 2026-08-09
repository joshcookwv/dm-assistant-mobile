import { callAnthropic, textFromMessage, toolInputFromMessage } from "./anthropic";
import { buildPromptRequest } from "./prompts";
import type { RateLimiter } from "./rate-limit";
import { isPremiumEntitled } from "./revenuecat";
import type { GenerateContext, GenerateRequestBody, GenerateRequestType, GenerateResponseBody, LinkSuggestion } from "./types";

export interface Env {
  ANTHROPIC_API_KEY: string;
  REVENUECAT_SECRET_KEY: string;
}

export interface HandlerDeps {
  env: Env;
  rateLimiter: RateLimiter;
}

const VALID_TYPES: ReadonlySet<GenerateRequestType> = new Set([
  "campaign_recap",
  "session_summary",
  "npc_name",
  "npc_description",
  "link_suggestions",
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isValidType(value: unknown): value is GenerateRequestType {
  return typeof value === "string" && VALID_TYPES.has(value as GenerateRequestType);
}

/**
 * The portable core of POST /generate. Depends only on standard Web APIs
 * (Request/Response/fetch), so it runs unchanged on Cloudflare Workers,
 * Vercel Edge Functions, Deno, or behind the small Node adapter in
 * adapters/node.ts — see server/README.md for per-host wiring once a host
 * is chosen. This function itself never needs to change for that decision.
 */
export async function handleGenerateRequest(request: Request, { env, rateLimiter }: HandlerDeps): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: Partial<GenerateRequestBody>;
  try {
    body = (await request.json()) as Partial<GenerateRequestBody>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.appUserId || typeof body.appUserId !== "string") {
    return json({ error: "appUserId is required" }, 400);
  }
  if (!isValidType(body.type)) {
    return json({ error: `Unknown type "${String(body.type)}"` }, 400);
  }
  if (!body.context || typeof body.context !== "object") {
    return json({ error: "context is required" }, 400);
  }

  const withinLimit = await rateLimiter.consume(body.appUserId);
  if (!withinLimit) {
    return json({ error: "Rate limit exceeded — try again shortly." }, 429);
  }

  let entitled: boolean;
  try {
    entitled = await isPremiumEntitled(env.REVENUECAT_SECRET_KEY, body.appUserId);
  } catch {
    return json({ error: "Could not verify subscription status. Try again shortly." }, 502);
  }
  if (!entitled) {
    return json({ error: "An active Premium subscription is required for this feature." }, 403);
  }

  const promptRequest = buildPromptRequest(body.type, body.context as GenerateContext);

  let message;
  try {
    message = await callAnthropic(env.ANTHROPIC_API_KEY, promptRequest);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "AI request failed" }, 502);
  }

  if (body.type === "link_suggestions") {
    const input = toolInputFromMessage(message, "record_link_suggestions") as { suggestions?: LinkSuggestion[] } | undefined;
    const response: GenerateResponseBody = { suggestions: input?.suggestions ?? [] };
    return json(response);
  }

  const response: GenerateResponseBody = { text: textFromMessage(message) };
  return json(response);
}
