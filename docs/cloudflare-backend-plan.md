# Cloudflare Workers AI Proxy — Shared Plan

**Read this whole file before doing anything.** It's the shared source of truth for three collaborators (coder, tester, dm-reviewer) working this in parallel. If you change the architecture, update this file so the other two stay in sync.

## Why

Today the app calls `https://api.anthropic.com/v1/messages` directly from the device using a user-supplied API key (`src/lib/ai.ts`, `src/lib/npc-ai.ts`, key stored via `src/lib/secure-settings.ts`/`expo-secure-store`). That's fine for one developer testing, but the intent is to eventually ship this to **all Play Store users**, most of whom won't have (or want to get) their own Anthropic API key.

**Decision: add a Cloudflare Workers proxy that holds one shared Anthropic key**, so AI features work out of the box for everyone, while keeping the developer's API cost and abuse exposure bounded now that it's multi-user. The existing "bring your own key" Settings field stays as a power-user override.

## Non-goals (explicitly out of scope, don't build these)

- No email/password accounts or login screens. Identity is a random anonymous per-device UUID, nothing more.
- No cloud sync of campaign data (NPCs/notes/encounters/etc.). Everything about campaigns stays exactly as it is today — 100% on-device SQLite. Only the AI prompt/response payload (which already left the device before, just to Anthropic instead of our own Worker) passes through the Worker, transiently.
- Don't touch anything in `src/lib/db.ts`, `campaigns.ts`, `backup.ts`, or any other non-AI data path.

## Architecture

### 1. Cloudflare Worker (new `worker/` subfolder in this repo, TypeScript)

- `POST /v1/messages` — accepts the same request body shape the app already builds for Anthropic's Messages API today (verify the exact current shape by reading `src/lib/ai.ts`/`npc-ai.ts` first, don't assume), forwards to `https://api.anthropic.com/v1/messages` using a secret `ANTHROPIC_API_KEY` (`wrangler secret put ANTHROPIC_API_KEY`, dev value in a gitignored `.dev.vars` — **never** in client code or committed anywhere), returns the response back to the app essentially unchanged.
- Requires a `X-Client-Id` header on every request — an anonymous UUID the app generates once and stores locally (see mobile changes below). Reject requests without one (400).
- **Rate limit per `X-Client-Id`** via a Workers KV counter (`{count, resetAt}` per client ID, using KV's `expirationTtl` for auto-reset) — **not** the Workers Rate Limiting binding, which is hard-capped at a 10-60s window and cannot express a 24h period at all (platform limit, caught by coder before it got built wrong). Default **30 requests per fixed 24h window per client ID**, window anchored to that client's first request rather than a global clock — a normal simplification for a soft cost-control quota, not a hard security boundary. KV is eventually consistent (~60s propagation across colos), so a client bouncing between edge locations right at the boundary could squeeze a few extra requests through — accepted tradeoff; revisit with Durable Objects only if that ever actually matters. Put the limit number in one obvious constant/env var — it's a cost/UX tradeoff the developer will likely want to tune after seeing real usage, so make it trivial to find and change. Over the limit → HTTP 429. **As actually shipped** (per tester's review of `worker/src/index.ts`), the body is a flat `{"error":"rate_limited","message":"Daily free AI limit reached. Try again tomorrow, or add your own API key in Settings for unlimited use."}` — not the nested Anthropic-style envelope originally sketched here. Confirmed not a functional bug: `ai.ts`'s `extractErrorMessage()` has a dedicated branch for this exact flat shape. This doc originally asked for the nested shape so parsing needed zero special-casing; what shipped works fine via an explicit branch instead — leave it, not worth churning working code, just noting so nobody's confused by the doc/code mismatch.

**Fixed (found by tester, resolved by coder, re-verified by both):** the Worker previously consumed a client's rate-limit quota *before* checking whether the Worker itself was healthy/correctly configured. Now checks config/health first, only decrements the KV counter once the request is confirmed attemptable.
- **Model allowlist**: check what model(s) `ai.ts`/`npc-ai.ts` currently request, and have the Worker pin/allowlist to just that (reject or override anything else). The whole point of a shared key is bounded cost — don't let a client request an arbitrary/expensive model.
- Nothing gets persisted/logged beyond ephemeral rate-limit counters keyed by the anonymous client ID. No prompt/response content logging.

### 2. Mobile app changes

- New `src/lib/client-id.ts`: generate a random UUID once (`expo-crypto` is already a dependency), persist via `expo-secure-store`, export `getClientId()`.
- `src/lib/ai.ts` / `src/lib/npc-ai.ts`: **if the user has set a personal API key in Settings, keep calling Anthropic directly exactly as today — unchanged behavior.** If no personal key is set, call the Worker's `/v1/messages` instead, sending `X-Client-Id`. Handle the Worker's 429 with a clear in-app message (toast/banner, reuse the Worker's `message` text).
- Worker base URL as a single obvious constant, dev value = local `wrangler dev` URL, swapped to the real deployed URL only after the deploy checkpoint below actually happens.
- `src/app/settings/index.tsx`'s "Test Connection" button is **out of scope** — it validates a key the user is actively typing in, before it's even saved, so it always calls Anthropic directly with that key regardless of the proxy. Don't route it through the Worker. (Caught by tester as a 4th call site not originally listed here.)

### 3. Two hard checkpoints — stop and message "main" (the orchestrating session), don't push through these yourselves

- **Deploy checkpoint**: don't run `wrangler login` or a real `wrangler deploy`. Cloudflare auth is an interactive browser login only the account owner (the user, Josh) can complete. Get everything working end-to-end against `wrangler dev` locally, then message main that you're ready.
- **Build checkpoint**: don't run `eas build`. It consumes real build credits on Josh's account. Message main when backend + mobile integration are both solid and tester/dm-reviewer are satisfied, then wait for a go-ahead.

## Guardrails (all three of you)

- **Expo SDK is pinned to 56 — do not upgrade to 57.** SDK 57 has a known `react-native-gesture-handler`/`reanimated`/worklets crash in this app (confirmed in an earlier session). `AGENTS.md` in this repo has a stale, wrong note telling you to read SDK 57 docs — ignore it.
- Local `git commit` as you go is fine and encouraged. **Do not `git push`** — this is a private repo with a real release history; pushing is the user's call.
- The Android SDK is at `%LOCALAPPDATA%\Android\Sdk`, with an AVD already configured (`Pixel8_API35`). Start it via this repo's `start-emulator.bat`, or directly: `"%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" -avd Pixel8_API35`. `adb`/`emulator` aren't on PATH by default — use the full path under `%LOCALAPPDATA%\Android\Sdk\platform-tools\` and `...\emulator\`, or set `ANDROID_HOME`/`PATH` yourself the way `start-emulator.bat` does.
- **The Android emulator can't reach `localhost` for `wrangler dev`** — `localhost` inside the emulator means the emulator itself, not the Windows host. Point the app's dev Worker-URL constant at `http://10.0.2.2:<wrangler-dev-port>` instead (the emulator's fixed alias for host loopback), or use `adb reverse`. (Caught by tester before anyone burned time on it.)
- Coordinate over SendMessage before editing a file another teammate is actively working in, especially `src/lib/ai.ts`/`npc-ai.ts` (coder owns these). Tester: prefer exercising the running dev servers (curl/fetch scripts against `wrangler dev`, interacting with the running Expo dev client) over permanently modifying coder's source files.

## Addendum: shared-AI access requires an explicit opt-in toggle (added mid-build, 2026-08-09)

Josh added a new requirement after the build was already underway: **using the shared proxy (no personal key) must be gated behind an explicit Settings toggle, off by default.** Without a personal key AND without this toggle on, AI features should not silently call the shared proxy — show a prompt instead (e.g., "Add your own API key, or turn on free shared AI in Settings," with a link/shortcut to the toggle).

- New Settings row: a switch, default **off**. Suggested label/copy (adjust if it reads better another way): "Use Free Shared AI" with a subtitle like "Uses a shared connection with a daily limit. Add your own API key above for unlimited use." Store the preference the same way other simple app settings are already stored (check `src/lib/settings.ts` for the existing pattern rather than inventing a new storage mechanism).
- Updated branching logic for `ai.ts`/`npc-ai.ts`: personal key set → direct-to-Anthropic (unchanged). No personal key + toggle on → shared proxy (as originally designed). No personal key + toggle off → don't call anything; surface a clear prompt directing the user to one of the other two options.
- ~~This is almost certainly meant as a free opt-in gate, not real payment processing~~ **Correction, same day: it is real billing. See Addendum 2.**
- **Superseded by Addendum 2 below**: this toggle was originally scoped as free-for-anyone. Josh has since clarified the shared proxy is paid-tier-only — this toggle's underlying access control needs a verified entitlement check in Phase 2, not just a user preference. Safe to finish building the toggle AS-IS for now since the app isn't released yet (nobody but the dev team can reach it), but **this must not ship to the Play Store until Phase 2's entitlement gate replaces the open toggle** — flag this prominently, don't let it slip through unnoticed.

## Update (2026-08-09, later): Free Shared AI toggle now covers PDF import too, dev-client build authorized

Josh: "I want the pdf import to work through the shared as well with the rate limiter enabled across the board." The toggle's proxy path (no personal key + toggle on) now covers **both** NPC-suggest and PDF import — not just NPC-suggest. **The Worker needs to grow file-upload proxying now, not deferred to Phase 2 as this doc previously said.** Same rate-limiting mechanism applies to both — simplest interpretation: the same shared per-client-ID KV counter/quota governs all proxied calls, PDF import included. Flag back to main if a heavier-cost-aware limit for PDF import specifically is wanted instead (e.g. counting one PDF upload as more than 1 unit against the daily quota) — not building that unless asked, since it wasn't specified.

**This does not change the final Free/Paid split in Addendum 2 below.** This is Phase 1's already-temporary, already-must-not-ship-as-is open toggle simply growing to cover a wider surface while it's still ungated. Phase 2's entitlement gate, once built, applies to this same now-unified proxy surface for both features — free (non-subscribed, post-launch) users still get zero proxy access to anything, exactly as Addendum 2 already specifies. Don't read "PDF import via proxy now works" as a permanent free-tier expansion.

**Dev-client build authorized**, sequenced *after* this change: build the PDF-proxy extension first, verify what's verifiable without a device (Worker-side tests, typecheck), then run `eas build --profile development` (may take a while — run it in a way that doesn't block/timeout, e.g. background execution or `--no-wait` plus polling). This finally unblocks tester's mobile-side three-state testing and dm-reviewer's real hands-on review.

## Addendum 2: free vs. paid tiers via RevenueCat (added mid-build, 2026-08-09 — scoped as a follow-on phase, NOT part of the current build-in-progress)

Josh confirmed he wants real billing (RevenueCat), not just a free opt-in gate, and specified the actual free/paid split. **Corrected 2026-08-09** after two follow-up clarifications from Josh — this replaces an earlier, wrong draft of this section (that draft had free users getting NPC-suggest via the shared proxy; that's incorrect, see below):

**Free tier (default, no subscription):**
- **No shared-proxy access at all.** Josh's exact words: "the shared proxy is only for the paid tier." Every AI feature — NPC-suggest **and** PDF import — works only via the user's own personal Anthropic key (BYO key), exactly the app's original pre-this-project behavior. The Addendum-1 Settings toggle must not grant a free (non-subscribed) user proxy access — flipping it on with no personal key and no subscription should still not call the shared proxy. **This also directly confirms tester's earlier flagged question: PDF import staying personal-key-only isn't a gap, it's the intended behavior for every free-tier AI feature, not a PDF-specific exception.**
- Data: capped at **1 campaign**. Block creating a 2nd campaign with an upsell prompt instead. A user who later un-subscribes keeps any campaigns they already have — never delete user data on downgrade.

**Paid subscription (RevenueCat), unlocks:**
- Full shared-proxy access for all AI features (NPC-suggest and PDF import) — no personal key needed. This is the core paid product: the shared key covers everything once you're a subscriber. The Worker needs to grow file-upload proxying (not just `/v1/messages`) for entitled users, gated on a verified entitlement — not just trusted client-side.
- Unlimited campaigns.
- Some reasonable rate limit probably still applies even for paid users, as basic cost control — almost certainly higher than the 30/day dev-testing default, exact number is Josh's call once there's real usage data, not specified yet.

**Confirmed model, not an interpretation anymore** — the shared proxy exists to deliver the paid subscription's value, not to serve free users. If either read above still seems off, it needs to come back to main before anyone builds the entitlement-gated Worker file-upload path specifically, since that's the most expensive piece to get wrong.

**Technical shape (for whoever picks this up):**
- Mobile: add `react-native-purchases` (RevenueCat's Expo-compatible SDK), initialize with RevenueCat's public SDK key (new constant, same treatment as the Worker URL — never hardcoded, real value supplied later). One entitlement identifier (suggest `"premium"`, confirm against whatever Josh names it in the RevenueCat dashboard once that exists), checked via `Purchases.getCustomerInfo()`.
- Campaign-count gate: pure client-side check (entitlement + local SQLite campaign count) — campaigns are 100% on-device, there's nothing for a server to check here.
- Worker: needs a way to verify entitlement server-side for the AI-proxy gate — now the gate for **all** proxy access, not just file uploads — either call RevenueCat's REST API with a secret key per-request, or (more robust, more setup) sync entitlement state via RevenueCat webhooks into KV. This isn't a high-value target, so reasonable cost control is the goal, not perfect anti-piracy hardening.

**Real prerequisites before any of this can be live-tested (account/console setup only Josh can do, not code):**
1. A RevenueCat account + project, linked to the Play Console app.
2. At least one subscription product defined in Play Console (store submission hasn't started yet per project notes — may need to happen alongside this).
3. RevenueCat's public SDK key (app) and secret API key (Worker, gitignored) — same handling as the Anthropic key: main won't handle the raw values, Josh supplies them directly when ready.

**Sequencing: this is Phase 2, starting only after the current free-proxy + opt-in-toggle work (this doc's original scope) reaches a clean, tested checkpoint.** Don't start building this alongside work already in flight.

## Team

- **coder** — builds the Worker + mobile integration above.
- **tester** — hunts for bugs/edge cases: missing/malformed `X-Client-Id`, rate-limit boundary behavior, secret-leak checks in error responses, personal-key-set-vs-proxy branching on the mobile side, 429 UI handling, offline handling. Reports findings to coder, re-checks after fixes.
- **dm-reviewer** — roleplays a veteran, experienced Dungeon Master (not a developer). Uses the running dev client on the `Pixel8_API35` emulator to actually use the AI-assisted features (NPC suggestions, PDF import extraction) as a DM would at the table. Judges usefulness, speed, and whether the rate-limit messaging would annoy a real user mid-session. This is an ongoing conversation with coder during the build, separate from the **final end-to-end APK report**, which happens later once fresh `.apk`/`.aab` builds exist (a later phase, covered separately).

Report status to **main** at natural checkpoints (scaffolding up, first working end-to-end proxied call, blocked, ready for a checkpoint above) — concise, not constant noise.

## Status note (2026-08-09): Phase 1 code-complete, on-device confirmation deferred

Coder's build (Worker + mobile toggle-wiring) is code-complete: `tsc --noEmit` and lint clean across `worker/` and the app, all three AI states (personal key / no-key+toggle-on / no-key+toggle-off) hand-traced against actual code. Tester's Worker-side verification (wrangler dev + scripts) is independent of any mobile build and can finish regardless.

The shared `Pixel8_API35` emulator's dev-client build turned out to be stale (missing `expo-sharing`, pre-existing issue unrelated to this work) and crashes on launch. Josh decided **not** to spend EAS build credits on a fresh dev client right now — real on-device confirmation (both dm-reviewer's AI-feature UX pass and the final end-to-end report) is deferred until the actual preview/production build happens later. The emulator currently has the existing preview `.apk` reinstalled as a stopgap (confirmed working, but predates all of today's changes — not useful for testing this phase specifically).

## Status note (2026-08-09, later): PDF-import-via-proxy built, dev-client build in progress

Per the "Free Shared AI toggle now covers PDF import too" update above, coder built and verified the extension:

- **Worker**: new `POST /v1/files` (streams the multipart upload straight through to Anthropic's Files API, unparsed — no file-type check, since the shared rate limit already bounds abuse volume the same way it does for `/v1/messages`) and `DELETE /v1/files/:id` (best-effort cleanup proxy, mirrors `ai.ts`'s `deleteFile`). Both draw from the exact same `gateRequest` helper as `/v1/messages` — same client-id validation, same `ratelimit:${clientId}` KV key, same shared quota. Added an `anthropic-beta` header allowlist (currently just the Files API beta) for the same cost-bounding reason as the model allowlist.
- **Rate-limit sharing confirmed live**, not just by design: uploaded a real test file via the proxy, then made a real `/v1/messages` call referencing it (also via the proxy) — the KV counter read `{"count":2,...}` afterward, confirming one shared counter across both endpoint types rather than two independent ones. Full chain verified end to end against live `wrangler dev`: upload -> extraction call referencing the file_id (beta header correctly forwarded and allowlisted) -> delete, all through the proxy, all against the real Anthropic API.
- **Rate-limit weighting**: went with the doc's stated default (one upload counts the same as one message call) rather than a heavier PDF-specific weight, per Josh's own "across the board" phrasing — flagging per the doc's instruction rather than silently deciding, in case that reads differently to Josh once there's real usage data.
- **Mobile**: `uploadFile`/`deleteFile` in `ai.ts` now share the identical three-state branching `callMessages` already had. `callMessages`'s proxy branch now forwards `betas` too — dormant before this change since `uploadFile` was unconditionally personal-key-only, so a no-key PDF import never used to reach that branch at all. `import.tsx`'s dm-reviewer-requested "PDF import isn't included in Free Shared AI" message is reverted (no longer true) and simplified to match `npcs/[id].tsx`'s pattern.
- `tsc --noEmit` and lint clean across `worker/` and the app after this round.

**Dev-client build**: authorized per the update above, running now (`eas build --profile development`, backgrounded/polled per the doc's instruction so it doesn't block). Will ping tester and dm-reviewer directly once it's installable.
