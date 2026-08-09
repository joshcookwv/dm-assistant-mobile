# Backend hosting options for `server/`

The `/generate` handler (`server/src/handler.ts`) is written against plain Web APIs (`Request`/`Response`/`fetch`) with three working adapters already in the repo — `server/adapters/cloudflare-worker.ts`, `server/adapters/vercel-edge.ts`, `server/adapters/node.ts`. Picking a host is a deploy step, not a rewrite. This doc is the pros/cons/cost comparison to make that pick.

**One fact that matters a lot for cost here:** every request this service handles is almost entirely spent waiting on the Anthropic API — there's very little actual CPU work (parse JSON in, build a prompt, wait, format JSON out). Platforms that bill by *CPU time* rather than *wall-clock time* are dramatically cheaper for this specific workload than the raw numbers suggest.

## Option 1 — Cloudflare Workers (`adapters/cloudflare-worker.ts`)

**Pricing** (Free plan and Paid plan, from Cloudflare's own pricing page):
- Free: 100,000 requests/day, no cost.
- Paid: **$5/month minimum**, includes 10 million requests and 30 million CPU-ms; overage is $0.30/million requests and $0.02/million CPU-ms beyond that.
- Billing is **CPU time only** — time spent waiting on `fetch()` (i.e. waiting on Anthropic) doesn't count. For this workload, that means the included 30M CPU-ms on the $5 plan covers an enormous number of actual requests.

**Pros:**
- Cheapest realistic floor: likely free for a long time, then flat $5/month once past 100K req/day.
- The CPU-time billing model is the best possible fit for an I/O-bound proxy like this one.
- No server to patch, no idle cost, no cold-VM management — closest match to this app's "no backend until now" philosophy.
- Global edge network — low latency to users regardless of region.

**Cons:**
- Workers' JS runtime isn't full Node — no `node:*` APIs beyond what Cloudflare polyfills (not an issue for this handler; it only uses `fetch`/`Request`/`Response`, but worth knowing if the backend grows).
- The bundled `MemoryRateLimiter` doesn't work correctly here (see `server/README.md`) — each isolate has separate memory, so rate limiting is only per-isolate until swapped for Workers KV or a Durable Object. Small additional setup, not a blocker.
- Requires a Cloudflare account and `wrangler` CLI for deploys (both free, minor learning curve if new to it).

**Verdict:** best cost, best fit for the actual workload shape, most "no infrastructure to babysit." My recommendation unless there's a reason to prefer Node's familiarity.

## Option 2 — Vercel Edge Functions (`adapters/vercel-edge.ts`)

**Pricing** (Hobby and Pro plans, from Vercel's pricing page):
- Hobby: free, 1M function invocations/month, 4 hours of Active CPU/month included — **but Hobby is explicitly non-commercial**. A subscription-funded backend is commercial use, so Hobby isn't actually usable here even though the limits look generous.
- Pro: **$20/month per seat**, includes $20 of usage credit plus 1TB data transfer and 10M edge requests before extra charges.
- Also bills "Active CPU" time (similar spirit to Cloudflare's model — I/O wait is cheap), which helps, but the $20/month seat floor applies regardless of actual usage.

**Pros:**
- If the project (or you) is already on Vercel for something else, this is zero new infrastructure to learn.
- Same favorable CPU-time billing shape as Cloudflare for this I/O-bound workload.
- Very easy deploys (`git push`), good DX.

**Cons:**
- **$20/month minimum just to be allowed to run this commercially** — the free tier's ToS rules it out, not its limits. That's a real fixed cost the other two options don't have.
- Overkill: Vercel's strengths (Next.js hosting, preview deployments, frontend-focused tooling) aren't relevant to a single JSON endpoint.

**Verdict:** fine technically, worst cost floor for this specific use case unless you're already paying for Vercel Pro for other reasons.

## Option 3 — Plain Node (`adapters/node.ts`) on Fly.io (or Render/any VPS)

**Pricing** (Fly.io, as a representative example — Render/a VPS follow similar shapes):
- No meaningful free tier anymore (Fly removed its free allowances a while back).
- Cheapest always-on VM (`shared-cpu-1x`, 256MB): roughly **$2/month** just for compute, before bandwidth.
- Fly Machines support **scale-to-zero** (auto-stop when idle, auto-start on the next request) — with that enabled, cost drops close to the Cloudflare free tier's territory, at the price of a cold-start delay on the first request after idling.

**Pros:**
- Plain Node — no platform-specific runtime quirks, easiest to debug/reason about, easiest to move elsewhere later.
- Full control: logs, metrics, SSH access, standard Node tooling all just work.
- Cheapest of the three if you want an always-on box with predictable behavior and don't want to deal with edge-runtime constraints.

**Cons:**
- You own more: OS-level nothing (Fly manages that), but you do own process crashes/restarts, and `MemoryRateLimiter` is *correctly* accurate here only as long as you run exactly one instance — scaling to multiple instances brings back the same cross-instance caveat the edge options have.
- Without scale-to-zero, you're paying for idle time even at 3am when nobody's using the app.
- One more account/dashboard to manage versus folding this into an ecosystem you might already use.

**Verdict:** good middle ground — cheap, simple, most "boring and easy to reason about." Reasonable pick if you'd rather have a normal server you can SSH into than lean fully into edge-platform conventions.

## Recommendation

**Cloudflare Workers**, for cost and because the workload (mostly waiting on Anthropic) is exactly what its CPU-time billing model rewards — realistically free or close to it at your current scale, with a hard ceiling of $5/month before any meaningful growth. Fly.io is the solid second choice if you'd rather have a plain Node server. Vercel only makes sense if you're already paying for Pro elsewhere — its $20/month floor buys nothing this workload needs.

None of this is a long-term lock-in either way — the portable core in `server/src/` doesn't change regardless of which adapter ends up deployed.

---

_Pricing above reflects each provider's own published rates as surfaced via web search on 2026-08-09 — confirm current numbers on the provider's pricing page before committing, since these figures change over time._

Sources:
- [Pricing · Cloudflare Workers docs](https://developers.cloudflare.com/workers/platform/pricing/)
- [Fly.io Resource Pricing · Fly Docs](https://fly.io/docs/about/pricing/)
- [Vercel Pricing](https://vercel.com/pricing)
