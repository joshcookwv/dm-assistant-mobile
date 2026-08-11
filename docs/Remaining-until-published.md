# Infernal Codex Closed-Testing Checklist

Last updated: August 11, 2026

This is the authoritative release checklist. Check an item only after fresh evidence verifies it. The authorized stopping point is a United States closed-test release sent to Google for review; no production rollout or iOS release is in scope.

## Confirmed release decisions

- [x] Android closed testing only; stop after the closed-test release is sent for review. Evidence: approved design `49b65f2`.
- [x] United States distribution only. Evidence: approved design `49b65f2`.
- [x] Target ages 16–17 and 18+. Evidence: approved design `49b65f2`.
- [x] One monthly subscription at a base US price of $4.99; no annual or lifetime package. Evidence: approved design `49b65f2`.
- [x] Ten AI credits per entitled RevenueCat customer per UTC day; standard AI costs 1 and PDF import costs 5. Evidence: approved design `49b65f2`.
- [x] Reports contain flagged AI output only, plus category, optional comment, feature/model, timestamp, and hashed customer ID; retention is 30 days. Evidence: approved design `49b65f2`.
- [x] Privacy/deletion contact is `infernalbuldog@gmail.com`. Evidence: approved design `49b65f2`.
- [x] Tester access uses a Play Console email list; tester addresses will be supplied separately. Evidence: approved design `49b65f2`.

## Source safety and baseline

- [x] Work is isolated on `codex/closed-testing-readiness`. Evidence: `git branch --show-current` on August 11, 2026.
- [x] Approved design is committed separately. Evidence: commit `49b65f2`.
- [x] Implementation plan is committed separately. Evidence: commit `424beb3`.
- [x] Existing release-related app work is checkpointed without local build artifacts or credentials. Evidence: commit `681e0eb`, staged secret scan returned none.
- [x] `builds/tmp/` and obsolete `docs/store-assets/feature-graphic1.jpg` are ignored. Evidence: `git check-ignore -v` on August 11, 2026.
- [x] Baseline app TypeScript passes. Evidence: `npm.cmd exec tsc -- --noEmit` on August 11, 2026.
- [x] Baseline lint has zero errors. Evidence: `npm.cmd run lint` on August 11, 2026; 12 pre-existing `srd.ts` warnings remain.
- [x] Baseline Worker typecheck and production dependency audit pass. Evidence: `npm.cmd run typecheck` and `npm.cmd audit --omit=dev` on August 11, 2026.

## App regressions

- [x] Notes FTS punctuation query is covered by a passing regression test. Evidence: `notes-query.test.ts`, August 11, 2026.
- [x] Drawer navigation closes before navigating and resets stack routes to their index; automated helper test passes. Evidence: `drawer-navigation.test.ts`, August 11, 2026.
- [ ] Drawer scrim, Android Back, and repeated drawer navigation pass native manual checks.
- [x] Campaign PC Name, Max HP, and Armor Class validation has passing regression tests. Evidence: `campaign-validation.test.ts`, August 11, 2026.
- [x] Opening New Campaign creates no record until explicit submission; automated regression coverage passes. Native cancellation check remains pending. Evidence: `new-campaign.test.tsx`, August 11, 2026.
- [x] Full app unit test suite passes. Evidence: 4 suites, 13 tests, August 11, 2026.
- [x] App TypeScript passes after the regression-test changes. Evidence: `npm.cmd exec tsc -- --noEmit`, August 11, 2026.
- [x] App lint completes with zero errors after the regression-test changes. Evidence: `npm.cmd run lint`, August 11, 2026; 12 pre-existing asset-import warnings remain.
- [ ] Expo Doctor passes all checks.
- [ ] Android production JavaScript export succeeds.
- [ ] App production dependency advisories are reviewed and documented without forcing an Expo downgrade.

## Cloudflare Worker and D1

- [x] D1 schema contains quota usage, quota reservations, PDF jobs, report usage, AI reports, and aggregate daily metrics. Evidence: local migration applied by both Worker test files, August 11, 2026.
- [x] Raw RevenueCat identifiers are transformed with server-side HMAC-SHA-256 and never persisted. Evidence: canonical route test verifies only the keyed hash is stored, August 11, 2026.
- [x] RevenueCat entitlement is verified server-side and canonical customer identity is used for quota. Evidence: RevenueCat and protected-route tests, August 11, 2026.
- [x] Daily credit reservation is atomic under concurrent requests. Evidence: 20 simultaneous D1 reservations yielded 10 allowed, 10 denied, and 10 stored credits, August 11, 2026.
- [x] Standard AI costs 1 credit and is capped at 800 output tokens. Evidence: request validation and protected-route tests, August 11, 2026.
- [x] PDF import is protected as one 5-credit job, capped at 25 MB and 8,192 output tokens. Evidence: PDF bounds, state, and full route-flow tests, August 11, 2026.
- [x] Validation, entitlement, health, report, cleanup, and unsuccessful upstream paths consume 0 credits. Evidence: route ordering plus validation, refund, reporting, and cleanup tests, August 11, 2026.
- [x] Quota exhaustion returns HTTP 429 with remaining credits and UTC reset time. Evidence: protected message route test, August 11, 2026.
- [x] Unsupported models, beta headers, file blocks on standard messages, oversized bodies, and invalid request shapes are rejected before upstream work. Evidence: bounded-validation and zero-upstream-call route tests, August 11, 2026.
- [x] Worker logs contain no prompts, PDF contents, generated output, raw customer IDs, secrets, or reviewer credentials. Evidence: structured error logging contains method, route path, and error class only; verified in Worker source, August 11, 2026.
- [x] Worker quota, identity, entitlement, message, PDF, report, metric, and cleanup tests and TypeScript pass. Evidence: 8 files/43 tests and both production/test TypeScript projects, August 11, 2026.
- [x] Worker production dependency audit reports zero vulnerabilities. Evidence: `npm audit --omit=dev`, August 11, 2026.

## AI-output reporting and cost controls

- [ ] Every generated NPC suggestion, campaign summary, session summary, and PDF staging output has an in-app report action.
- [ ] Report modal shows the exact output, five categories, optional comment, and 30-day disclosure.
- [ ] Report submission stays in the app and shows success or retryable error state.
- [x] Reports consume no AI credits and have a separate atomic limit of 10 reports per customer per UTC day. Evidence: 20 concurrent report attempts accept exactly 10; protected route remains at 10 AI credits, August 11, 2026.
- [x] D1 deletes reports after 30 days and removes obsolete operational rows on schedule. Evidence: cleanup test plus Wrangler daily `0 5 * * *` cron, August 11, 2026.
- [x] Daily request/input-token/output-token/error metrics contain no customer identifier or content. Evidence: aggregate metric schema and accumulation test, August 11, 2026.
- [ ] Mobile app displays server-provided credits remaining and reset time; the server remains authoritative.
- [x] Initial reduced allowance is verified in D1 as 10 daily credits, 1 per standard action, and 5 per PDF import. Evidence: `quota.test.ts`, August 11, 2026.

## RevenueCat and monthly subscription

- [ ] Android RevenueCat public SDK key and entitlement ID are configured through EAS production variables.
- [ ] Pro screen displays only the monthly package from RevenueCat's `default` offering.
- [ ] Pro screen explains monthly auto-renewal, Google Play cancellation/management, free-app availability, 10 daily credits, 1/5 credit costs, restore, privacy, and licensing.
- [ ] Purchase cancellation is not shown as an error.
- [ ] Google Play product `infernal_codex_pro` with base plan `monthly` is active in the United States at $4.99/month.
- [ ] Dedicated Google service account has only the approved Play, Pub/Sub, and monitoring access.
- [ ] Service-account JSON is uploaded directly to RevenueCat and is absent from Git/local project files.
- [ ] RevenueCat credential checks pass for subscriptions, in-app products, and monetization.
- [ ] Play product is attached to the Infernal Codex Pro entitlement.
- [ ] RevenueCat `default` offering contains the monthly package only; yearly/lifetime Test Store packages are inactive.
- [ ] Play real-time developer notifications deliver a successful test to RevenueCat.
- [ ] Sandbox purchase, cancellation, expiry, restore, offline state, and reinstall behavior pass.
- [ ] Reusable high-entropy reviewer access unlocks Pro and receives the same 10-credit limit; credential exists only in RevenueCat and Play instructions.

## GitHub Pages, privacy, and licensing

- [ ] GitHub Actions Pages workflow publishes only the static `site/` directory with least-privilege permissions.
- [ ] Support page is live at `https://joshcookwv.github.io/dm-assistant-mobile/`.
- [ ] Privacy policy is live at `https://joshcookwv.github.io/dm-assistant-mobile/privacy/`.
- [ ] Licensing page is live at `https://joshcookwv.github.io/dm-assistant-mobile/licenses/`.
- [ ] Privacy policy accurately covers local campaign data; optional Cloudflare/Anthropic AI transmission; Anthropic standard API retention up to 30 days; 30-day reports; RevenueCat/Play purchase data; encryption; deletion; no ads; and no behavioral analytics.
- [ ] Privacy policy and app identify the contact as `infernalbuldog@gmail.com`.
- [ ] Licensing page and in-app Legal screen contain complete OGL 1.0a sections 1–15, applicable Section 15 notices, SRD 5.1 and 5.2 CC-BY-4.0 attribution, other bundled CC sources, links, and the independence disclaimer.
- [ ] App Settings links open the new privacy and licensing URLs.

## Production infrastructure and build

- [ ] Cloudflare D1 database is created and production migrations are applied.
- [ ] Worker secrets `ANTHROPIC_API_KEY`, `REVENUECAT_SECRET_API_KEY`, and `USER_HASH_SECRET` are configured without being printed or written to disk.
- [ ] Worker is deployed and `/health` returns status `ok`.
- [ ] Unauthorized AI and report smoke tests are rejected and D1 contains no raw identifiers or prompt content.
- [ ] Production public variables point to the deployed Worker and live RevenueCat configuration.
- [ ] New production AAB is built after production configuration is set.
- [ ] AAB package is `com.infernalbulldog.dmassistant`, version name is `1.0.0`, version code is incremented, and target API is 36.
- [ ] AAB has no microphone, camera, overlay, or legacy external-storage permissions and includes RevenueCat billing components.
- [ ] Native release checklist passes for onboarding, navigation, regressions, purchases, reviewer access, credits, PDF jobs, reporting, privacy/licensing, backup/restore, and relaunch.

## Google Play Console setup

- [ ] Privacy policy task is complete using the live GitHub Pages URL.
- [ ] App access task explains subscription restriction, no app login, Pro-screen route, and private reusable reviewer identifier.
- [ ] Target audience selects only ages 16–17 and 18+ and states the app is not designed for children.
- [ ] Data Safety declares Purchase history; Device or other identifiers; Other user-generated content; Files and documents; and App interactions with the approved optional/required purposes and service-provider handling.
- [ ] Data Safety states encryption in transit, data is not sold, and deletion requests are supported.
- [ ] Main store listing uses the approved name/descriptions, Tools category, 512×512 icon, 1024×500 feature graphic, eight phone screenshots, four 7-inch tablet screenshots, and four 10-inch tablet screenshots.
- [ ] Play Console app setup shows 13 of 13 tasks complete.

## United States closed test

- [ ] Closed-test country availability is United States only.
- [ ] Email list `Infernal Codex Closed Test` is created.
- [ ] User-supplied tester Google-account addresses are imported.
- [ ] Verified AAB and initial closed-test release notes are attached.
- [ ] All blocking Play errors are resolved and the closed-test release is sent to Google for review.
- [ ] Tester opt-in URL, release/version code, review status, and submission timestamp are recorded here without secrets.
- [ ] At least 12 testers are opted in. Waiting for tester emails and Play Console confirmation.
- [ ] At least 12 testers remain opted in continuously for 14 days. This cannot be completed until the closed test is live and Play confirms the duration.
