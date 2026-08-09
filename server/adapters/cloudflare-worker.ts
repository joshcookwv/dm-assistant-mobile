import { handleGenerateRequest, type Env } from "../src/handler";
import { MemoryRateLimiter } from "../src/rate-limit";

// A Workers isolate is reused across requests for a while, so this
// module-scoped limiter persists per-isolate — see the cross-isolate
// caveat in rate-limit.ts. Swap for a KV- or Durable-Object-backed
// RateLimiter before relying on this for real abuse prevention.
const rateLimiter = new MemoryRateLimiter(20, 60 * 60 * 1000); // 20 requests/hour/user

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname !== "/generate") {
      return new Response("Not found", { status: 404 });
    }
    return handleGenerateRequest(request, { env, rateLimiter });
  },
};
