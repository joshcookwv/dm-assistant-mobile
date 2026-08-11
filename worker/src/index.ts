/**
 * Cloudflare Worker AI proxy for Infernal Codex Mobile.
 *
 * Holds the shared ANTHROPIC_API_KEY secret so Pro AI features work without
 * shipping a key in the app or requiring subscribers to get their own. Every
 * proxied request is independently verified against RevenueCat before shared
 * quota is spent. See docs/cloudflare-backend-plan.md for the full plan.
 *
 * Proxies two Anthropic endpoints: POST /v1/messages, and (as of the
 * 2026-08-09 "PDF import too" update) file uploads/deletes at
 * /v1/files[/:id], since PDF import now goes through this proxy as well.
 * Both require an anonymous X-Client-Id header and draw from the SAME
 * shared per-client rate limit (see gateRequest) — Josh's own words were
 * "the rate limiter enabled across the board", so one upload counts the
 * same as one message call rather than a heavier weighted cost. The model
 * allowlist and beta-header allowlist bound cost/scope the same way.
 * Nothing is ever logged/persisted beyond an ephemeral per-client request
 * counter (see checkRateLimit).
 */

export interface Env {
  // Secret — worker/.dev.vars locally, `wrangler secret put` when deployed.
  ANTHROPIC_API_KEY: string;
  // Secret RevenueCat v1 API key used only by the Worker to verify the
  // anonymous app-user ID supplied by the mobile SDK. Never expose this to
  // the client bundle.
  REVENUECAT_SECRET_API_KEY: string;
  REVENUECAT_ENTITLEMENT_ID: string;
  // Ephemeral rate-limit counters only. No prompt/response content ever
  // touches this KV namespace.
  RATE_LIMIT_KV: KVNamespace;
  // Tunable knobs — see wrangler.toml [vars] for the actual values/comments.
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_SECONDS: number;
  ALLOWED_MODEL: string;
}

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_FILES_URL = "https://api.anthropic.com/v1/files";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_CLIENT_ID_LENGTH = 256;
const MAX_APP_USER_ID_LENGTH = 256;
const REVENUECAT_API_BASE_URL = "https://api.revenuecat.com/v1";

// The only beta features this app's proxy paths ever need. Allowlisted for
// the same reason as the model below — an arbitrary client-supplied
// anthropic-beta value could plausibly open up different cost/quota
// behavior upstream, and bounded cost is the whole point of a shared key.
const ALLOWED_BETAS = new Set(["files-api-2025-04-14"]);

function corsHeaders(): Record<string, string> {
  // Native fetch from React Native isn't subject to browser CORS (see
  // src/lib/ai.ts), so this is purely a convenience for testing this
  // Worker directly from a browser/curl — it doesn't weaken anything,
  // since the proxy has no cookie/session auth for CORS to protect.
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, GET, DELETE, OPTIONS",
    "access-control-allow-headers":
      "content-type, x-client-id, x-revenuecat-app-user-id, anthropic-beta",
  };
}

/**
 * Reads and validates an incoming anthropic-beta header against the
 * allowlist above. Returns `{ ok: false }` for a disallowed value so the
 * caller can reject with a 400; returns `undefined` (not an error) when the
 * header is simply absent, since not every call needs one.
 */
function checkBetaHeader(request: Request): { ok: true; value?: string } | { ok: false } {
  const raw = request.headers.get("anthropic-beta");
  if (!raw) return { ok: true, value: undefined };
  const requested = raw.split(",").map((s) => s.trim());
  if (requested.some((beta) => !ALLOWED_BETAS.has(beta))) {
    return { ok: false };
  }
  return { ok: true, value: raw };
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

type GateResult = { ok: true; clientId: string } | { ok: false; response: Response };

type RevenueCatSubscriber = {
  subscriber?: {
    entitlements?: Record<
      string,
      {
        expires_date?: string | null;
        grace_period_expires_date?: string | null;
      }
    >;
  };
};

function entitlementExpirationIsActive(value: string | null | undefined): boolean {
  if (value === null) return true;
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function datedAccessWindowIsActive(value: string | null | undefined): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function isConfiguredValue(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !trimmed.startsWith("REPLACE_");
}

async function verifyProEntitlement(
  appUserId: string,
  env: Env
): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (
    !isConfiguredValue(env.REVENUECAT_SECRET_API_KEY) ||
    !isConfiguredValue(env.REVENUECAT_ENTITLEMENT_ID)
  ) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "server_misconfigured", message: "Pro verification is not configured. Try again later." },
        500
      ),
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${REVENUECAT_API_BASE_URL}/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          authorization: `Bearer ${env.REVENUECAT_SECRET_API_KEY}`,
          "content-type": "application/json",
        },
      }
    );
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        { error: "entitlement_unavailable", message: "Couldn't verify Pro access. Try again." },
        503
      ),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "entitlement_unavailable", message: "Couldn't verify Pro access. Try again." },
        503
      ),
    };
  }

  const body = (await response.json()) as RevenueCatSubscriber;
  const entitlement = body.subscriber?.entitlements?.[env.REVENUECAT_ENTITLEMENT_ID];
  const active =
    Boolean(entitlement) &&
    (entitlementExpirationIsActive(entitlement?.expires_date) ||
      datedAccessWindowIsActive(entitlement?.grace_period_expires_date));

  if (!active) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "pro_required", message: "Infernal Codex Pro is required for AI features." },
        403
      ),
    };
  }

  return { ok: true };
}

/**
 * Shared entry gate for every proxied endpoint (messages, file upload, file
 * delete): validates X-Client-Id, confirms the server is actually
 * configured, and only then spends a slot from the client's shared rate
 * limit — same quota, same KV key (`ratelimit:${clientId}`), regardless of
 * which endpoint is being called. Per the 2026-08-09 doc update, PDF import
 * (file upload) draws from the exact same daily budget as message calls
 * rather than a separate or weighted one — "the rate limiter enabled
 * across the board", Josh's words.
 *
 * Order deliberately: client-id shape checks (free) -> misconfiguration
 * (free, and checking it before the rate limit means a broken deploy never
 * costs a client one of their 30 daily slots for a 500 that's not their
 * fault) -> rate limit (only spent once we know the request could actually
 * be attempted).
 */
async function gateRequest(request: Request, env: Env): Promise<GateResult> {
  const clientId = request.headers.get("X-Client-Id")?.trim();
  const appUserId = request.headers.get("X-RevenueCat-App-User-Id")?.trim();
  if (!clientId) {
    return {
      ok: false,
      response: jsonResponse({ error: "missing_client_id", message: "X-Client-Id header is required." }, 400),
    };
  }
  if (clientId.length > MAX_CLIENT_ID_LENGTH) {
    return {
      ok: false,
      response: jsonResponse({ error: "invalid_client_id", message: "X-Client-Id header is invalid." }, 400),
    };
  }

  if (!appUserId) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "missing_app_user_id", message: "RevenueCat app-user ID is required." },
        401
      ),
    };
  }
  if (appUserId.length > MAX_APP_USER_ID_LENGTH) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "invalid_app_user_id", message: "RevenueCat app-user ID is invalid." },
        400
      ),
    };
  }

  if (!isConfiguredValue(env.ANTHROPIC_API_KEY)) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "server_misconfigured", message: "AI proxy is not configured. Try again later." },
        500
      ),
    };
  }

  const entitlement = await verifyProEntitlement(appUserId, env);
  if (!entitlement.ok) return entitlement;

  const rl = await checkRateLimit(
    env.RATE_LIMIT_KV,
    clientId,
    Number(env.RATE_LIMIT_MAX),
    Number(env.RATE_LIMIT_WINDOW_SECONDS)
  );
  if (!rl.allowed) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "rate_limited",
          message: "Daily Pro AI limit reached. Try again tomorrow.",
        },
        429,
        { "retry-after": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) }
      ),
    };
  }

  return { ok: true, clientId };
}

async function handleMessages(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Use POST." }, 405);
  }

  // --- 1. Beta header allowlist (free) -------------------------------------
  const beta = checkBetaHeader(request);
  if (!beta.ok) {
    return jsonResponse({ error: "beta_not_allowed", message: "Requested anthropic-beta value isn't supported." }, 400);
  }

  // --- 2. Parse + shape-validate body (free) -------------------------------
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

  // --- 4. Client ID / server health / shared rate limit --------------------
  const gate = await gateRequest(request, env);
  if (!gate.ok) return gate.response;

  // --- 5. Forward to Anthropic, return its response essentially unchanged -
  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        ...(beta.value ? { "anthropic-beta": beta.value } : {}),
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

/**
 * Proxies a PDF (or other document) upload to Anthropic's Files API. The
 * multipart body is streamed straight through unparsed rather than
 * re-serialized — same bytes, same boundary, no size limit imposed beyond
 * whatever the platform/Anthropic already enforce. No file-type check here
 * deliberately: the shared rate limit already bounds total upload volume
 * per client the same way it bounds message calls, and parsing multipart
 * just to inspect one field would mean buffering the whole file in memory
 * instead of streaming it — a real cost for a check the quota already
 * covers the abuse case for.
 */
async function handleFilesUpload(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Use POST." }, 405);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return jsonResponse(
      { error: "invalid_request", message: "Request body must be multipart/form-data." },
      400
    );
  }

  const beta = checkBetaHeader(request);
  if (!beta.ok) {
    return jsonResponse({ error: "beta_not_allowed", message: "Requested anthropic-beta value isn't supported." }, 400);
  }

  const gate = await gateRequest(request, env);
  if (!gate.ok) return gate.response;

  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_FILES_URL, {
      method: "POST",
      headers: {
        "content-type": contentType, // preserves the multipart boundary
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": beta.value ?? "files-api-2025-04-14",
      },
      body: request.body,
      // Workers' fetch requires this when the request body is a stream.
      duplex: "half",
    } as RequestInit);
  } catch {
    return jsonResponse({ error: "upstream_unreachable", message: "Couldn't reach the AI service. Try again." }, 502);
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

/**
 * Best-effort delete proxy so files uploaded through the shared key don't
 * silently accumulate in the shared Anthropic account forever. Mirrors
 * src/lib/ai.ts's deleteFile: the app only ever calls this after a
 * successful extraction, cleaning up a file it just uploaded through this
 * same proxy.
 */
async function handleFilesDelete(fileId: string, request: Request, env: Env): Promise<Response> {
  if (request.method !== "DELETE") {
    return jsonResponse({ error: "method_not_allowed", message: "Use DELETE." }, 405);
  }
  if (!fileId) {
    return jsonResponse({ error: "invalid_request", message: "Missing file id." }, 400);
  }

  const gate = await gateRequest(request, env);
  if (!gate.ok) return gate.response;

  let upstream: Response;
  try {
    upstream = await fetch(`${ANTHROPIC_FILES_URL}/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": "files-api-2025-04-14",
      },
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

    if (url.pathname === "/v1/files") {
      return handleFilesUpload(request, env);
    }

    // Matches /v1/files/<id> for the delete-after-extraction cleanup call.
    const filesDeleteMatch = url.pathname.match(/^\/v1\/files\/([^/]+)$/);
    if (filesDeleteMatch) {
      return handleFilesDelete(decodeURIComponent(filesDeleteMatch[1]), request, env);
    }

    return jsonResponse({ error: "not_found", message: "Unknown endpoint." }, 404);
  },
} satisfies ExportedHandler<Env>;
