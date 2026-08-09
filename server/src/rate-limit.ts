export interface RateLimiter {
  /** Returns true if the call should proceed, false if the caller is over their limit. */
  consume(key: string): Promise<boolean>;
}

/**
 * In-process sliding-window limiter. Correct for a single-instance deploy
 * (Node/Fly.io); on a multi-isolate edge platform (Cloudflare Workers,
 * Vercel Edge) each isolate keeps its own memory, so this only bounds
 * per-isolate traffic rather than truly per-user traffic. The handler only
 * depends on the RateLimiter interface above — swap in a KV- or
 * Durable-Object-backed implementation once a host is chosen, with no
 * change to handler.ts.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  async consume(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (timestamps.length >= this.limit) {
      this.hits.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return true;
  }
}
