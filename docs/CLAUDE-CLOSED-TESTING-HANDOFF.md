# Claude Handoff: Finish Infernal Codex Android Closed Testing

Last refreshed: August 11, 2026

## Directive to the next Claude session

Take over the existing Infernal Codex release-readiness work in `D:\Claude\projects\dm-assistant-mobile`. Do not restart the project, replace working features, or produce another high-level plan. Read this handoff and `docs/Remaining-until-published.md`, inspect current external state, then continue the unchecked work until the initial **United States closed-test release has been sent to Google for review**.

Ask the user only for actions that genuinely require the account owner, such as Google account recovery, passkey/identity verification, accepting paid-service terms, supplying tester addresses, or choosing between materially different options. Never ask for or expose passwords, passkeys, recovery codes, private keys, service-account JSON contents, RevenueCat secrets, Anthropic keys, Cloudflare secrets, or the Play reviewer code.

Check boxes in `docs/Remaining-until-published.md` only after obtaining fresh evidence. Record the evidence on the same line. Do not mark a task complete merely because its configuration looks plausible.

## Authorized outcome and hard limits

The authorized stopping point is:

> One verified Android App Bundle uploaded to a Google Play **closed testing** track, available only in the United States, with the release sent to Google for review and its version, status, timestamp, and tester opt-in URL recorded.

Do not:

- Roll out to production.
- Start an iOS release.
- Add countries other than the United States.
- Add annual, lifetime, or one-time paid products.
- Increase the AI allowance before measured costs justify it.
- Submit an old AAB from `builds/`.
- Put credentials or the private reviewer identifier in Git, source code, logs, screenshots, shell command history, this document, or chat.

## Confirmed product decisions

These decisions are final unless the user explicitly changes them:

| Decision | Required value |
| --- | --- |
| Platform/stage | Android closed testing only |
| Countries | United States only |
| Target audience | Ages 16-17 and 18+ only; not designed for children under 16 |
| Subscription product | `infernal_codex_pro` |
| Base plan | `monthly` only |
| Base US price | $4.99/month |
| RevenueCat offering | `default`, containing the monthly package only |
| Free plan | One persistent campaign; no paid AI allowance |
| Pro plan | Unlimited campaigns and shared AI features |
| AI allowance | 10 credits per entitled customer per UTC day |
| Standard AI cost | 1 credit |
| PDF import cost | 5 credits |
| Standard output cap | 800 tokens |
| PDF output cap | 8,192 tokens; PDF input up to 25 MB |
| Allowed model | `claude-haiku-4-5-20251001` |
| AI reporting | Exact flagged generated output only; never the original prompt or unrelated campaign content |
| Report retention | 30 days |
| Privacy/deletion email | `infernalbuldog@gmail.com` |
| Tester mechanism | Play Console email list named `Infernal Codex Closed Test` |
| Minimum test cohort | At least 12 testers continuously opted in for 14 days, subject to Play's account requirements |

## Repository and Git state

Verified on August 11, 2026:

| Item | Current state |
| --- | --- |
| Repository | `D:\Claude\projects\dm-assistant-mobile` |
| GitHub | `https://github.com/joshcookwv/dm-assistant-mobile` |
| GitHub account authenticated in `gh` | `joshcookwv` |
| Current branch | `codex/closed-testing-readiness` |
| Current branch HEAD | `4535c5f` (`docs: record Cloudflare and Play setup progress`) |
| Remote tracking | `origin/codex/closed-testing-readiness` is at the same commit |
| Merged PRs | #3, #4, and #5 are merged to `master` |
| Latest Pages run seen | `31466707399`, successful on `master` |
| Local `master` | Diverged from `origin/master`; do not base new work on the stale local `master` without fetching |
| Untracked handoff file already present | `docs/PLAY-CONSOLE-5-STEPS-HANDOFF.md` |

At the time of this handoff, both handoff Markdown files are intentionally local and uncommitted. Preserve them.

Safe resume commands:

```powershell
Set-Location 'D:\Claude\projects\dm-assistant-mobile'
git status --short --branch
git fetch origin
git log --oneline --decorate -8
```

The current feature branch is an ancestor of the merged `origin/master`, so it can normally be fast-forwarded after the untracked handoff files are confirmed safe:

```powershell
git merge --ff-only origin/master
```

If that command is no longer a fast-forward, do not force it and do not reset. Inspect the new history and preserve user changes.

## Source-of-truth files

Read these before changing anything, in this order:

1. `docs/Remaining-until-published.md` — authoritative release checklist and completion evidence.
2. `docs/PLAY-CONSOLE-5-STEPS-HANDOFF.md` — exact manual answers for the five unfinished Play Console setup tasks.
3. `docs/superpowers/specs/2026-08-11-closed-testing-readiness-design.md` — approved architecture and product decisions.
4. `docs/superpowers/plans/2026-08-11-closed-testing-readiness.md` — original implementation sequence and test expectations.
5. `worker/wrangler.toml` — current Worker bindings, quota values, model, cron, D1 ID, and the unresolved entitlement placeholder.
6. `.env.example` and `worker/.dev.vars.example` — variable names only; never put real secrets into the examples.

When an older document conflicts with the authoritative checklist or this handoff, re-check the live code and current provider state. In particular, `docs/cloudflare-backend-plan.md` and older prose in `docs/store-submission.md` predate some completed implementation.

## Work already completed — do not rebuild it

### App implementation

- RevenueCat client integration exists in `src/lib/purchases.ts` and `src/providers/pro-access.tsx`.
- The Pro screen in `src/app/pro.tsx` shows only product `infernal_codex_pro` / base plan `monthly` from RevenueCat's `default` offering.
- Purchase, cancellation, restore, entitlement state, and reviewer-access code entry are implemented.
- Reviewer access calls `Purchases.logIn(privateCode)`; no reviewer credential is embedded.
- Free/Pro campaign limits are implemented.
- AI credits are displayed from server response headers and the server remains authoritative.
- In-app reporting exists for every generated NPC suggestion, campaign summary, session summary, and PDF staging output.
- Reports include only the exact flagged output, category, optional comment, feature/model, timestamp, and a server-side hashed customer identifier.
- Four app regressions and their tests are complete: notes punctuation search, drawer navigation, PC validation, and no campaign creation before explicit submit.
- Privacy and licensing links are present in Settings and Pro.

### Cloudflare Worker implementation

- Worker name: `dm-assistant-mobile-worker`.
- D1 database name: `infernal-codex`.
- D1 database ID: `c1c0138a-5e9a-4538-a0ae-1ada8fff20b8`.
- D1 was created in US jurisdiction and both migrations are applied remotely.
- Routes exist for `GET /health`, `POST /v1/messages`, PDF jobs, and `POST /v1/reports`.
- Entitlement verification is server-side through RevenueCat.
- Raw RevenueCat identifiers are HMAC-SHA-256 transformed before D1 persistence.
- Quota reservation is atomic: 10 credits/day, standard cost 1, PDF cost 5.
- Reports have a separate atomic abuse limit and cost no AI credits.
- Ordinary prompts, PDFs, and generated responses are not persisted in D1.
- Reports are retained for 30 days; scheduled cleanup runs daily at `0 5 * * *`.
- Aggregate request/token/error metrics contain no customer identifier or content.
- Standard requests reject files, unapproved models, oversized bodies, beta headers, and output above 800 tokens before upstream work.
- PDF work is isolated to the five-credit job flow, limited to 25 MB and 8,192 output tokens.

### Legal site and store assets

- Support: `https://joshcookwv.github.io/dm-assistant-mobile/`
- Privacy: `https://joshcookwv.github.io/dm-assistant-mobile/privacy/`
- SRD licensing: `https://joshcookwv.github.io/dm-assistant-mobile/licenses/`
- All three returned HTTP 200 during the handoff refresh.
- GitHub Pages publishes only `site/` through `.github/workflows/pages.yml`.
- Store icon, feature graphic, eight phone screenshots, four 7-inch screenshots, and four 10-inch screenshots are complete under `docs/store-assets/` and `docs/store-screenshots/`.

## Fresh verification evidence

These checks were run during this handoff on August 11, 2026:

```text
App Jest:          12 suites passed, 33 tests passed
App TypeScript:    exit 0
App lint:          0 errors, 12 known require-import warnings in src/lib/srd.ts
Expo Doctor:       21/21 checks passed
Worker Vitest:     8 files passed, 50 tests passed
Worker TypeScript: production and test projects exit 0
Worker audit:      0 production vulnerabilities
Remote D1:         no migrations pending
Remote D1 tables:  all expected tables present
Remote D1 rows:    all six application tables contain 0 rows
```

Re-run the full gates after any source or configuration-file change:

```powershell
Set-Location 'D:\Claude\projects\dm-assistant-mobile'
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npx.cmd expo-doctor

Set-Location 'D:\Claude\projects\dm-assistant-mobile\worker'
npm.cmd run test
npm.cmd run typecheck
npm.cmd audit --omit=dev
```

## Current external-service state and blockers

### Google Play Console

- Last observed dashboard state was **8 of 13** app setup tasks complete.
- The five unfinished tasks were Privacy policy, Sign in details/App access, Target audience, Data Safety, and Main store listing.
- The Google account used for Play was then locked because Google suspected automated account creation.
- The screenshot shown by the user displayed `infernalbuldog@gmail.com`; confirm that this is the actual Play owner account before treating it as such.
- The user must complete account appeal, identity/passkey, or recovery actions personally.
- Play developer account ID previously observed: `9159017327869935398`.
- Play app ID previously observed: `4976322750310085419`.
- Android package: `com.infernalbulldog.dmassistant`.
- The complete manual procedure is in `docs/PLAY-CONSOLE-5-STEPS-HANDOFF.md`.
- App access cannot truthfully be finalized until the RevenueCat reviewer identifier exists and is tested.

### RevenueCat

The production RevenueCat setup is not complete. Do not infer the production entitlement ID from tests; test fixtures use `pro`, but the live entitlement identifier has not been confirmed.

Still required:

- Google Play service credentials and validation.
- Google Play product import.
- Exact production entitlement identifier confirmation.
- Product attachment to that entitlement.
- `default` offering with one monthly package only.
- Android public SDK key for EAS.
- RevenueCat secret API key for Cloudflare.
- Real-time developer notifications.
- Reviewer customer/identifier with a granted entitlement.
- Sandbox purchase/restore/expiry/offline/reinstall testing.

The previous browser automation attempt to open RevenueCat repeatedly timed out. Use the user's authenticated normal browser or ask the user to sign in; do not claim the dashboard is configured without reading it successfully.

### Cloudflare

Verified Cloudflare login:

- Account email: `josh.cook.wv@gmail.com`.
- Account ID: `90f2fa12bb25a50d1104723ccbcbd8f1`.
- Wrangler OAuth is active on this Windows profile.
- Remote D1 migrations are current and all six application tables are empty.

Configured Worker secret names:

- `ANTHROPIC_API_KEY`
- `USER_HASH_SECRET`

Missing Worker secret:

- `REVENUECAT_SECRET_API_KEY`

Critical configuration blocker in `worker/wrangler.toml`:

```toml
REVENUECAT_ENTITLEMENT_ID = "REPLACE_BEFORE_DEPLOY"
```

Wrangler created Worker versions when secrets were added because `wrangler secret put` creates and deploys a version. Treat the currently present versions as **not production-ready**: the entitlement is still a placeholder, the RevenueCat secret is absent, no final Worker URL is recorded, and `/health` has not been verified from the intended production deployment.

### Expo/EAS and build artifacts

- EAS project ID: `6cfa7ca0-a278-4be8-b725-24444702ec5e`.
- EAS CLI was not installed on PATH during this refresh. Use `npx eas-cli` or the Expo dashboard; authenticate the user if requested.
- Production public variables are not yet confirmed.
- No replacement production AAB has been built after the new RevenueCat/reporting/Worker work.
- `eas.json` uses remote app versioning and production `autoIncrement: true`.
- Expo currently selects the production EAS environment automatically for the store-style production profile. It is acceptable to make `"environment": "production"` explicit if desired, but verify the current Expo behavior first and commit that change if made.

**Never submit this existing tracked file:**

```text
builds/dm-assistant-mobile-v1.0.0-production.aab
```

It predates RevenueCat, the final Pro gates, reporting, and recent fixes. The existing dev and preview APKs are also pre-production evidence only.

### Tester addresses

- The user said the Play Console tester email list will be used.
- The user expects to obtain the tester addresses separately/tomorrow.
- Do not invent addresses.
- Do not send invitations or publish a tester list outside Play Console.

## Secret and credential boundaries

The repository currently contains a tracked root `.env` with only `EXPO_PUBLIC_USE_RN_FETCH=1`. It does not contain the RevenueCat or Worker production values.

`worker/.dev.vars` exists locally, is ignored by Git, and contains a local Anthropic key. Never display, copy into a handoff, or commit it. `worker/.dev.vars.example` contains names/placeholders only.

Before every commit, run a scoped secret review without printing suspect file contents:

```powershell
git status --short
git diff --check
git diff --name-only --cached
git check-ignore -v worker/.dev.vars
rg -n --hidden -g '!node_modules/**' -g '!worker/node_modules/**' -g '!builds/tmp/**' -g '!worker/.dev.vars' `
  'REVENUECAT_SECRET_API_KEY\s*=\s*\S+|ANTHROPIC_API_KEY\s*=\s*\S+|USER_HASH_SECRET\s*=\s*\S+|private_key' .
```

Review matches manually. Placeholder/example names are expected; populated secret values are not.

## Required execution order

### Phase 1: Recover Play Console access

1. Have the user follow `docs/PLAY-CONSOLE-5-STEPS-HANDOFF.md` under **First: restore the locked Google account**.
2. Do not create a replacement Play developer account unless Google Support explicitly directs it.
3. Do not attempt passkey or account-recovery entry on the user's behalf.
4. Once the user reports restoration, verify the selected developer account, app name, package, and current dashboard task count before changing anything.
5. Record the recovery as an external prerequisite, not a code completion item.

The user may complete Privacy policy, Target audience, Data Safety, and Main store listing from the manual guide while RevenueCat is unfinished. Keep App access as a draft until the reviewer code works.

### Phase 2: Create the Google Play monthly subscription

After Play access is restored:

1. Open **Monetize > Products > Subscriptions** for Infernal Codex.
2. Create or verify product ID `infernal_codex_pro`.
3. Create or verify auto-renewing base plan ID `monthly`.
4. Configure the base US price as `$4.99/month`.
5. Make only the United States available for this initial closed test.
6. Activate the product and base plan.
7. Do not add free trials, introductory pricing, annual plans, lifetime access, or additional countries without explicit user approval.
8. Capture non-sensitive evidence showing product ID, base plan, active status, US availability, and price.

### Phase 3: Connect Google Play and RevenueCat

Follow RevenueCat's current official Google Play credential procedure rather than an old blog post.

1. Create a dedicated Google Cloud service account for RevenueCat.
2. Enable the required Google Play Android Developer API and Pub/Sub API in the same project.
3. Use the narrow official Google Cloud roles. RevenueCat currently documents Pub/Sub Editor rather than broader Admin where sufficient, plus Monitoring Viewer.
4. Invite the service-account email in Play Console for only the Infernal Codex app.
5. Grant only the documented Play permissions:
   - View app information and download bulk reports (read-only).
   - View financial data, orders, and cancellation survey responses.
   - Manage orders and subscriptions.
6. Generate one service-account JSON key.
7. Upload that JSON directly from the download location to **RevenueCat > Project > Google Play app settings**.
8. Do not copy it into the repository, `Downloads` documentation, a chat, or a screenshot. After RevenueCat confirms it is stored and working, ask the user before removing the downloaded JSON and prefer a recoverable move to the Recycle Bin.
9. Run RevenueCat credential validation and require all relevant checks to pass: subscriptions, in-app products, and monetization.
10. Set up Google Play real-time developer notifications and require RevenueCat's test to succeed.
11. Import `infernal_codex_pro` / `monthly` into RevenueCat.
12. Locate the existing single Pro entitlement or create it if it truly does not exist. Record its exact identifier in a private working note long enough to configure systems; do not assume it is `pro`.
13. Attach the Google Play monthly product/base plan to that entitlement.
14. Set offering `default` as current and give it exactly one monthly package.
15. Remove yearly/lifetime Test Store products from the active offering and mark them inactive. Do not delete historical products unless necessary.
16. Obtain the Android **public SDK key** for the app and the RevenueCat **secret API key** needed by the Worker. Keep the secret out of the app and EAS public variables.

Official references:

- RevenueCat Google Play credentials: `https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials`
- RevenueCat Android products: `https://www.revenuecat.com/docs/getting-started/entitlements/android-products`
- RevenueCat entitlements: `https://www.revenuecat.com/docs/getting-started/entitlements`
- RevenueCat offerings: `https://www.revenuecat.com/docs/offerings/overview`

### Phase 4: Create and verify private Play reviewer access

The app already accepts one private custom RevenueCat App User ID through **Settings > View Infernal Codex Pro > App review access**.

1. Generate a high-entropy, non-email identifier no longer than 100 characters. A random UUID is appropriate. Never use a person's email or a guessable phrase.
2. Do not commit or paste the value into source, `.env`, EAS variables, Worker variables, this handoff, or ordinary chat.
3. Ensure RevenueCat has a customer with that exact App User ID. One safe path is to enter it once in a configured non-public build so `Purchases.logIn()` creates/finds the customer.
4. Search that exact ID in RevenueCat and grant the real Pro entitlement from the Customer profile.
5. Select a duration long enough that Google can reuse it throughout review. If duration choice is material, offer the user a long fixed expiration with rotation versus a permanent grant and explain the exposure tradeoff.
6. Refresh/re-enter the code in the app and require the Pro screen to show `PRO ACTIVE`.
7. Verify it unlocks unlimited campaigns and receives the same 10-credit daily limit.
8. Keep the identifier only in the RevenueCat customer profile and Play Console App access instructions.
9. If exposed, revoke/rotate it in RevenueCat and update Play before the next review.

Official references:

- RevenueCat App User IDs: `https://www.revenuecat.com/docs/customers/identifying-customers`
- RevenueCat customer profile and granted entitlements: `https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile`

### Phase 5: Finish and deploy Cloudflare

1. Replace `REPLACE_BEFORE_DEPLOY` in `worker/wrangler.toml` with the exact RevenueCat entitlement identifier.
2. Keep the existing quota/model values unchanged.
3. Add the RevenueCat secret interactively without displaying it:

```powershell
Set-Location 'D:\Claude\projects\dm-assistant-mobile\worker'
npm.cmd exec -- wrangler secret put REVENUECAT_SECRET_API_KEY
```

4. Verify only the secret names are present:

```powershell
npm.cmd exec -- wrangler secret list
```

Expected names: `ANTHROPIC_API_KEY`, `REVENUECAT_SECRET_API_KEY`, and `USER_HASH_SECRET`.

5. Re-run Worker tests, TypeScript, and the production audit.
6. Deploy the Worker from the repository configuration:

```powershell
npm.cmd exec -- wrangler deploy
```

7. Capture the exact `https://...workers.dev` URL from successful output. Do not guess the subdomain.
8. Verify health:

```powershell
$workerUrl = 'PASTE_DEPLOYED_HTTPS_WORKER_URL'
Invoke-RestMethod -Uri "$workerUrl/health" -Method Get
```

Expected JSON: `{ "status": "ok" }`.

9. Send a valid-shaped request without a RevenueCat header and require denial without upstream cost:

```powershell
$body = @{
  model = 'claude-haiku-4-5-20251001'
  max_tokens = 80
  messages = @(@{ role = 'user'; content = 'Unauthorized smoke test' })
} | ConvertTo-Json -Depth 5

try {
  Invoke-WebRequest -Uri "$workerUrl/v1/messages" -Method Post -ContentType 'application/json' -Body $body
  throw 'Unexpected success: unauthorized request was accepted.'
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

Expected denial is HTTP 401. Do not include a real reviewer identifier in shell history.

10. Query D1 after unauthorized smoke tests and confirm application tables contain no new rows:

```powershell
npm.cmd exec -- wrangler d1 execute infernal-codex --remote --command "SELECT (SELECT COUNT(*) FROM quota_usage) AS quota_usage, (SELECT COUNT(*) FROM quota_reservations) AS quota_reservations, (SELECT COUNT(*) FROM pdf_jobs) AS pdf_jobs, (SELECT COUNT(*) FROM report_usage) AS report_usage, (SELECT COUNT(*) FROM ai_reports) AS ai_reports, (SELECT COUNT(*) FROM daily_metrics) AS daily_metrics;"
```

11. Test authorized AI, PDF, and report behavior through the production-configured native app so the reviewer code does not enter command history. Confirm 1-credit standard usage, 5-credit PDF usage, 10-credit daily ceiling, report submission costing 0 AI credits, and report content limited to the flagged output contract.

Cloudflare reference: `https://developers.cloudflare.com/workers/configuration/secrets/`

### Phase 6: Configure EAS production variables

Configure these project-level **production** variables:

```text
EXPO_PUBLIC_AI_PROXY_BASE_URL=<deployed HTTPS Worker URL, no trailing slash required>
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=<RevenueCat Android public SDK key>
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=<exact entitlement identifier>
EXPO_PUBLIC_DEBUG_PRO_ACCESS=false
```

Do not configure `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` for production. Do not put the RevenueCat secret, Anthropic key, reviewer code, user-hash secret, or service-account JSON into any `EXPO_PUBLIC_` variable.

Example CLI entry point if EAS CLI remains absent from PATH:

```powershell
npx.cmd eas-cli env:list --environment production
```

Use the Expo dashboard or `eas env:create` to enter each value. Public SDK keys and client configuration are inherently present in the app; server credentials are not.

Official EAS reference: `https://docs.expo.dev/eas/environment-variables/`

### Phase 7: Build and inspect a replacement production AAB

1. Re-run the full app and Worker gates.
2. Confirm production variables by name and environment without printing server secrets.
3. Start a new EAS production build:

```powershell
Set-Location 'D:\Claude\projects\dm-assistant-mobile'
npx.cmd eas-cli build --platform android --profile production
```

4. Require a successful build created after the production values were set.
5. Download the new artifact to a clearly versioned temporary path such as `builds/tmp/`; do not overwrite or submit the stale tracked AAB.
6. Record EAS build ID, artifact URL, build commit, version name, and version code without secrets.
7. Inspect the AAB with `bundletool`, `apkanalyzer`, or Android build tools and require:
   - Package `com.infernalbulldog.dmassistant`.
   - Version name `1.0.0`.
   - Version code incremented beyond the stale artifact.
   - Target API 36.
   - No microphone, camera, overlay, or legacy broad external-storage permission.
   - RevenueCat/Play Billing components included.
8. Upload only this verified AAB to a non-production Play test track.

### Phase 8: Native production-configured verification

Do not infer native behavior from unit tests. Verify the Play-delivered build on a real Android device or emulator connected to the test track.

Require evidence for:

- Fresh install and onboarding skip/complete.
- Drawer navigation, scrim, Android Back, and all destinations.
- Notes punctuation search.
- PC validation.
- Cancelling New Campaign creates no record.
- Free plan: one campaign, no AI, no second persistent campaign.
- Monthly product displays the localized Play price.
- Purchase success, user cancellation, expiration/downgrade, restore, offline state, and reinstall behavior.
- Reviewer access unlocks Pro without payment.
- Ten-credit UTC allowance, 1-credit standard action, and 5-credit PDF action.
- Quota exhaustion and reset messaging.
- PDF import success/failure cleanup.
- In-app reporting for every generated output; only flagged output is submitted.
- Privacy and licensing links.
- Backup, restore, persistence after relaunch, and no crash-loop evidence.

Do not check the production-native checklist line until the production-configured build, not a dev or stale preview build, passes.

### Phase 9: Finish the five Play Console setup tasks

Use `docs/PLAY-CONSOLE-5-STEPS-HANDOFF.md` verbatim for the manual procedure and copy. The expected dashboard result is **13 of 13**.

The five required completions are:

1. Privacy policy using the live GitHub Pages URL.
2. App access explaining no app login, subscription restrictions, the Pro-screen route, and the working private reviewer identifier.
3. Target audience containing only ages 16-17 and 18+, not designed for children.
4. Data Safety declaring Purchase history, Device or other identifiers, Other user-generated content, Files and documents, and App interactions with the approved handling.
5. Main store listing using the supplied copy and all supplied assets.

Do not screenshot the reviewer identifier, passkey screen, service credentials, or payment information. Record non-sensitive evidence for each completed row and the 13-of-13 dashboard.

### Phase 10: Create and submit the United States closed test

1. Open the closed testing track, not production.
2. Set country availability to **United States only**.
3. Create tester email list `Infernal Codex Closed Test`.
4. Import only the user-supplied Google-account email addresses.
5. Confirm at least 12 valid testers are included before relying on the 14-day requirement.
6. Upload the newly verified production AAB.
7. Suggested initial release notes:

```text
Initial Infernal Codex closed test.

- Offline D&D 5e rules, monsters, NPCs, notes, campaigns, and encounter tools
- One free campaign with optional Infernal Codex Pro monthly subscription
- Pro AI assistance with a 10-credit daily allowance
- In-app reporting for generated AI output
- Backup and restore, privacy policy, and SRD/open-content licensing
```

8. Resolve every blocking Play error. Do not bypass policy warnings by changing disclosures away from actual app behavior.
9. Send the closed-test release to Google for review.
10. Record in `docs/Remaining-until-published.md`:
    - Track name.
    - Country availability.
    - Tester-list name and count, but not the addresses.
    - AAB version name/code.
    - Release status.
    - Submission timestamp with timezone.
    - Tester opt-in URL.
11. Stop after the closed-test submission. Do not roll out to production.
12. Track at least 12 continuously opted-in testers for the required 14 days only after Play confirms the test is live; this is a later waiting condition, not a reason to misstate immediate completion.

## Definition of handoff completion

Claude may report this task finished only when all of the following are true:

- The Google Play owner account is restored and the correct app is accessible.
- RevenueCat Google credentials pass all required checks.
- Product `infernal_codex_pro` / `monthly` is active in the US at $4.99/month.
- RevenueCat entitlement and `default` monthly-only offering are verified.
- RTDN test succeeds.
- The reviewer identifier works and remains private.
- Cloudflare has all three secret names, exact entitlement configuration, a fresh deployment, and passing health/security smoke tests.
- EAS production variables point to the live RevenueCat/Worker configuration.
- A new production AAB passes package/version/API/permission/Billing inspection.
- Production-configured native purchase, quota, PDF, reporting, privacy, licensing, backup, and regression checks pass.
- Play app setup shows 13 of 13 complete.
- The United States closed-test release is sent for review using the supplied tester list.
- `docs/Remaining-until-published.md` contains fresh evidence for every newly checked item.
- No production rollout or iOS release was started.
- A final secret scan and Git status review show no credential leakage.

## Immediate next action

The first dependency is the locked Google account. Have the user complete the official recovery/appeal steps in `docs/PLAY-CONSOLE-5-STEPS-HANDOFF.md`. While waiting, Claude may inspect RevenueCat and EAS only if the user's authenticated sessions are available, but must not fabricate Play product state or mark blocked Console work complete.
