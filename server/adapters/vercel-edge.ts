import { handleGenerateRequest, type Env } from "../src/handler";
import { MemoryRateLimiter } from "../src/rate-limit";

export const config = { runtime: "edge" };

// Same cross-isolate caveat as the Cloudflare adapter — see rate-limit.ts.
const rateLimiter = new MemoryRateLimiter(20, 60 * 60 * 1000); // 20 requests/hour/user

export default async function handler(request: Request): Promise<Response> {
  const env: Env = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
    REVENUECAT_SECRET_KEY: process.env.REVENUECAT_SECRET_KEY ?? "",
  };
  return handleGenerateRequest(request, { env, rateLimiter });
}
