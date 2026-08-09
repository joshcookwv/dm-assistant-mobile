# dm-assistant-ai-proxy

The bundled-AI backend for Premium subscribers. Free-tier users never touch
this — they use their own Anthropic key straight from the app (see
`src/lib/ai.ts`). This service exists only to serve the two Sonnet-backed
features (Campaign Recap, Session Summary) plus the bundled versions of the
NPC generator and link-suggestion features, without shipping an Anthropic
key inside the app itself.

## Status: contract-complete, host undecided

`src/` is the entire logic of this service, written against nothing but
standard Web APIs (`Request`, `Response`, `fetch`) so it's not tied to any
one host. `adapters/` has a working, minimal entrypoint for each host under
consideration — picking one is a copy-paste-and-deploy, not a rewrite.
Nothing in `src/` needs to change once a host is picked.

## Contract

`POST /generate`

```json
{
  "type": "campaign_recap" | "session_summary" | "npc_name" | "npc_description" | "link_suggestions",
  "appUserId": "<RevenueCat app_user_id from the device>",
  "context": { /* shape depends on type — see src/types.ts */ }
}
```

Response: `{ "text": "..." }` for everything except `link_suggestions`,
which returns `{ "suggestions": [...] }` — the client presents these to the
DM as a checklist and only writes to `npc_appearances`/`npc_relations` on
explicit approval; this endpoint never writes anything itself.

Errors: `400` bad request, `403` not entitled, `429` rate-limited, `502`
upstream (Anthropic or RevenueCat) failure. Body: `{ "error": "..." }`.

### Model split

| `type` | Model | Why |
| --- | --- | --- |
| `campaign_recap`, `session_summary` | `claude-sonnet-5` | The only two features that use Sonnet — an explicit product choice, not a default. |
| `npc_name`, `npc_description` | `claude-haiku-4-5` | Bundled version of the app's existing free BYO-key NPC generator — same prompts (kept in sync with `src/lib/npc-ai.ts`), just billed to us instead of the user. |
| `link_suggestions` | `claude-haiku-4-5` | Extraction, not creative writing — cheap model, forced tool call for structured output. |

### Auth

Every request must resolve to an active `premium` entitlement in RevenueCat
— checked server-side via `GET /v1/subscribers/{appUserId}`
(`src/revenuecat.ts`), never trusted from the client. This is deliberate:
RevenueCat is the single source of truth for both the client's
`useEntitlement()` and this check, so there's nothing else to keep in sync,
and no separate account/auth system to build.

### Rate limiting

`src/rate-limit.ts` defines a `RateLimiter` interface; the default
`MemoryRateLimiter` is a correct, dependency-free sliding window **as long
as this runs as one instance** (e.g. the Node adapter on a single Fly.io
machine). On a multi-isolate edge platform (Cloudflare Workers, Vercel
Edge) each isolate has its own memory, so it only bounds per-isolate
traffic — swap in a KV- or Durable-Object-backed `RateLimiter` before
relying on this for real abuse prevention there. `handler.ts` only depends
on the interface, so this is a one-file change wherever it happens.

## Deployment options (pick one)

All three need the same two secrets: `ANTHROPIC_API_KEY` (your own,
billed to you) and `REVENUECAT_SECRET_KEY` (RevenueCat project settings →
API keys → Secret key). See `.env.example`.

**Cloudflare Workers** (`adapters/cloudflare-worker.ts`) — cheapest, no
server to manage. Needs a `wrangler.toml` (not included yet — trivial once
chosen) and `wrangler secret put ANTHROPIC_API_KEY` / `REVENUECAT_SECRET_KEY`.
Swap `MemoryRateLimiter` for a KV-backed one before going live (see above).

**Vercel Edge Functions** (`adapters/vercel-edge.ts`) — similar tradeoffs to
Workers. Set the two secrets as Vercel environment variables. Same
rate-limiter caveat.

**Plain Node** (`adapters/node.ts`) — for Fly.io, Render, or any VPS. Zero
extra dependencies (Node 18+'s built-in `fetch`/`Request`/`Response` is all
this uses). `MemoryRateLimiter` is accurate here as long as you run one
instance. Build with `tsc` (there's no bundler configured yet) or run
through `tsx`/`ts-node` in dev.

## Before this goes live

- [ ] Pick a host from the above (or another one — the adapter pattern makes this cheap to change your mind on).
- [ ] Create the `premium` entitlement in RevenueCat (the ID `src/revenuecat.ts` checks against) and confirm it's the one attached to your App Store/Play Store subscription products.
- [ ] Deploy and set the two secrets.
- [ ] Swap the rate limiter for a durable one if deploying to an edge platform.
- [ ] Point the client's `ai-premium.ts` (Task 6) at the deployed URL.
- [ ] Put a spend cap / billing alert on the Anthropic account backing `ANTHROPIC_API_KEY` — this account now pays for usage instead of each user's own key.
