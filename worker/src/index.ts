/**
 * Cloudflare Worker AI proxy for Infernal Codex Mobile.
 *
 * Holds the one shared ANTHROPIC_API_KEY secret so AI features work for
 * every install out of the box, without shipping a key in the app or
 * requiring users to get their own. See docs/cloudflare-backend-plan.md
 * for the full architecture/rationale — this file implements that spec.
 *
 * Scope, deliberately: this proxies POST /v1/messages only, requires an
 * anonymous X-Client-Id header, rate-limits per client ID, pins the model
 * allowlist, and otherwise forwards the request/response essentially
 * unchanged. No prompt/response content is ever logged or persisted —
 * only an ephemeral per-client request counter (see checkRateLimit).
 */

export interface Env {
  // Secret — worker/.dev.vars locally, `wrangler secret put` when deployed.
  ANTHROPIC_API_KEY: string;
  // Ephemeral rate-limit counters only. No prompt/response content ever
  // touches this KV namespace.
  RATE_LIMIT_KV: KVNamespace;
  // Tunable knobs — see wrangler.toml [vars] for the actual values/comments.
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_SECONDS: number;
  ALLOWED_MODEL: string;
}

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_CLIENT_ID_LENGTH = 256;

function corsHeaders(): Record<string, string> {
  // Native fetch from React Native isn't subject to browser CORS (see
  // src/lib/ai.ts), so this is purely a convenience for testing this
  // Worker directly from a browser/curl — it doesn't weaken anything,
  // since the proxy has no cookie/session auth for CORS to protect.
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type, x-client-id",
  };
}

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

interface RateLimitRecord {
  count: number;
  resetAt: number; // epoch ms
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Fixed-window counter per client ID, backed by Workers KV, using KV's
 * own expirationTtl for automatic reset — deliberately NOT Cloudflare's
 * native Workers Rate Limiting binding, whose `period` field is capped at
 * 10 or 60 seconds and so cannot express a 24h window at all (a hard
 * platform limit, not a config choice — see wrangler.toml's comment).
 *
 * This is a fixed window anchored to each client's first request in a
 * given window, not a strict sliding log (which would need a pruned
 * per-request timestamp list) — a client could in theory get a short
 * double-burst right at the window boundary. Acceptable here: this is a
 * soft cost/abuse deterrent for a shared key, not a hard security
 * boundary. KV is also only eventually consistent across edge locations
 * (~60s propagation), which has the same "acceptable for this, not a
 * hard boundary" character.
 */
async function checkRateLimit(
  kv: KVNamespace,
  clientId: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${clientId}`;
  const now = Date.now();
  const existing = await kv.get<RateLimitRecord>(key, "json");

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    const record: RateLimitRecord = { count: 1, resetAt };
    await kv.put(key, JSON.stringify(record), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  const count = existing.count + 1;
  const record: RateLimitRecord = { count, resetAt: existing.resetAt };
  // KV requires expirationTtl >= 60s; guard the tail end of the window.
  const remainingTtl = Math.max(60, Math.ceil((existing.resetAt - now) / 1000));
  await kv.put(key, JSON.stringify(record), { expirationTtl: remainingTtl });
  return { allowed: true, remaining: limit - count, resetAt: existing.resetAt };
}

async function handleMessages(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Use POST." }, 405);
  }

  // --- 1. Client ID (free — no KV read yet) ------------------------------
  const clientId = request.headers.get("X-Client-Id")?.trim();
  if (!clientId) {
    return jsonResponse(
      { error: "missing_client_id", message: "X-Client-Id header is required." },
      400
    );
  }
  if (clientId.length > MAX_CLIENT_ID_LENGTH) {
    return jsonResponse({ error: "invalid_client_id", message: "X-Client-Id header is invalid." }, 400);
  }

  // --- 2. Parse + shape-validate body (free) ------------------------------
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "invalid_json", message: "Request body must be valid JSON." }, 400);
  }
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
    return jsonResponse(
      { error: "invalid_request", message: "Request body must include a messages array." },
      400
    );
  }

  // --- 3. Model allowlist (free) -------------------------------------------
  // The whole point of a shared key is bounded cost — reject anything that
  // explicitly asks for a different model rather than silently swapping it
  // (silent swap would make a client-side model bug quietly serve the
  // wrong model instead of surfacing it). Missing `model` is filled in
  // rather than rejected, since that's a strictly narrower ask than the
  // app already always sends explicitly.
  if (body.model !== undefined && body.model !== env.ALLOWED_MODEL) {
    return jsonResponse(
      {
        error: "model_not_allowed",
        message: `Only ${env.ALLOWED_MODEL} is available through the shared proxy.`,
      },
      400
    );
  }
  body.model = env.ALLOWED_MODEL;

  // --- 4. Server misconfiguration (check before spending the client's quota
  //        — reconsidered from an earlier "rate-limit-first, gateway-style"
  //        ordering after tester correctly pointed out it doesn't actually
  //        buy anything here: neither ordering changes when the real cost —
  //        the forward to Anthropic below — can happen, since both checks
  //        gate it either way. So there's no cost/abuse benefit to going
  //        rate-limit-first, but there IS a real fairness cost: a client
  //        would burn one of its 30 daily slots on a 500 that's the
  //        server's fault whenever the secret is missing/bad. Not worth it
  //        for a benefit that doesn't exist.) -------------------------------
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      { error: "server_misconfigured", message: "AI proxy is not configured. Try again later." },
      500
    );
  }

  // --- 5. Rate limit (only now spend a slot — everything free/cheap to
  //        check has already passed, and we know the server can actually
  //        attempt the call) -------------------------------------------------
  const rl = await checkRateLimit(
    env.RATE_LIMIT_KV,
    clientId,
    Number(env.RATE_LIMIT_MAX),
    Number(env.RATE_LIMIT_WINDOW_SECONDS)
  );
  if (!rl.allowed) {
    return jsonResponse(
      {
        error: "rate_limited",
        message:
          "Daily free AI limit reached. Try again tomorrow, or add your own API key in Settings for unlimited use.",
      },
      429,
      { "retry-after": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) }
    );
  }

  // --- 6. Forward to Anthropic, return its response essentially unchanged -
  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return jsonResponse({ error: "upstream_unreachable", message: "Couldn't reach the AI service. Try again." }, 502);
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({ status: "ok" }, 200);
    }

    if (url.pathname === "/v1/messages") {
      return handleMessages(request, env);
    }

    return jsonResponse({ error: "not_found", message: "Unknown endpoint." }, 404);
  },
} satisfies ExportedHandler<Env>;
