# Campaign intelligence + subscription tier — status journal

Branch: `claude/campaign-intelligence-plan-ncfrna`. Not yet merged, PR not yet opened — waiting on RevenueCat/Play Console before opening it (see "Open questions" below).

## What this branch is

A campaign-intelligence layer (NPC relationship web, campaign timeline aggregation, local search) plus a free/Premium subscription split: Free stays fully local with BYO Claude API key (NPC name/description only) and a 1-campaign cap; Premium unlocks unlimited campaigns and adds AI campaign recaps + session summaries (Claude Sonnet 5, bundled — no key needed) and AI link suggestions, all served through a new backend proxy this app never had before.

## Done (all 6 planned phases, all merged into this branch)

| # | Phase | What shipped |
| --- | --- | --- |
| 1 | Data foundation + relationship web | `npc_relations` table, `src/lib/npc-relations.ts`, manual "Relationships" section on the NPC screen, `src/lib/campaign-intelligence.ts` (stats/timeline/search), `backup.ts` fixed to actually include campaign tables (was silently missing them) |
| 2 | Campaign Overview screen | New `/campaign/[id]/overview` — stats, local search across NPCs/locations/sessions/notes, recent sessions, Campaign Recap entry point |
| 3 | Free tier cap | 1-campaign limit enforced in `campaign/index.tsx` via `useEntitlement()`, routes to paywall at the cap |
| 4 | Entitlement layer | `src/lib/entitlements.tsx` (RevenueCat-backed `useEntitlement()`), `__DEV__`-only override toggle in Settings for testing before real subscriptions exist |
| 5 | Backend AI proxy | New `server/` package — `POST /generate`, written against standard Web APIs only (host-agnostic), adapters for Cloudflare Workers / Vercel Edge / Node all included. Model split: Sonnet 5 for campaign_recap/session_summary only, Haiku 4.5 for npc_name/npc_description/link_suggestions. Entitlement checked server-side via RevenueCat's REST API. **Not deployed anywhere yet — see "Open questions."** |
| 6 | Wire it all up | Campaign Recap button (Overview), Session Summary button (Session screen), "Suggest Links" checklist (Session screen), NPC generator rerouted to bundled backend for Premium, real `Purchases.getOfferings()`/`purchasePackage()` flow on the paywall (falls back to "coming soon" until RevenueCat has a real offering) |

Plus, out of the original 6-phase plan but done along the way:
- Support contact moved from the public GitHub issue tracker to email (`infernalbuldog@gmail.com`) now that the repo is public.
- Store submission doc (`docs/store-submission.md`) rewritten to match: listing copy, Data Safety draft answers, privacy policy reference text all now describe the free/Premium split and the new backend/RevenueCat data flows.
- In-app Privacy Policy link added (Settings screen, and the paywall footer — the latter specifically because Apple's subscription review guideline 3.1.2 expects it right next to the purchase button).

Every commit on this branch type-checks and lints clean (one long-standing, pre-existing, unrelated lint rule violation in `_layout.tsx`/`settings/index.tsx` predates this work and was left alone rather than fixed opportunistically).

## In progress (external, not code)

**RevenueCat / Play Console setup — blocked ~a couple of days on Play Console payments-profile/identity verification.** Once that clears:
- Create the subscription product in Play Console (Phase B — this is where it's currently stuck).
- License testing + internal testing track (Phase C).
- Connect Play Console to RevenueCat via a Google Play service account with financial-data access (Phase D).
- Create the `premium` entitlement + product + offering in RevenueCat (Phase E).
- Hand back the Android SDK key (→ `app.json`) and the secret key (→ wherever `server/` ends up deployed) (Phase F).
- Test a real sandbox purchase end-to-end (Phase G).

## Not started

- **Backend host decision + deployment.** `server/` is written and works against any of three adapters, but nothing is picked or deployed yet. See the separate options writeup for this decision.
- **iOS side entirely** — no iOS build exists yet (predates this branch); App Store Connect subscription product, Apple's own entitlement wiring, and TestFlight are all still ahead once Android is working.
- **Terms of Use / EULA.** Flagged in the store-submission doc's section 8 — the app has a Privacy Policy and SRD/OGL content licenses, but no Terms of Use anywhere. Apple's simplest path is to rely on their standard EULA (zero drafting required, just needs to be the one attached in App Store Connect); a custom one is only needed if you want different terms than Apple's default. Not blocking Android. Worth a decision before the App Store submission specifically.
- **Screenshots.** Stale before this branch (Campaign/Location rework), now more so — Overview/search and the paywall aren't captured at all yet. Best to recapture once the paywall shows real pricing.
- **PR not opened yet**, per your explicit call to wait until RevenueCat is set up first.

## Open questions for you

1. **Backend host** — see the separate pros/cons/costs writeup. No default has been picked.
2. **Terms of Use** — use Apple's standard EULA (no work needed) or draft a custom one?
3. Once RevenueCat is live: do you want the PR opened at that point regardless of whether the backend is deployed, or held until the backend is live too (i.e. Premium is actually end-to-end functional before it merges)?
