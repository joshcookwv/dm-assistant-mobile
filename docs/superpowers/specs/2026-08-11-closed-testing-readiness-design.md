# Infernal Codex Closed-Testing Readiness Design

**Date:** 2026-08-11  
**Status:** Approved  
**Scope:** Android closed-testing readiness only. Production release and iOS are outside this design.

## Goals

Prepare Infernal Codex for a United States Google Play closed test by completing the app defects, subscription integration, shared AI backend, in-app AI-output reporting, public legal pages, Play Console forms, and release build. The work stops after the closed-test release is sent for Google review. The separate requirement for at least 12 opted-in testers over 14 continuous days remains open until it is actually satisfied.

## Confirmed Product Decisions

- Infernal Codex Pro is a single auto-renewing monthly subscription at a base US price of $4.99.
- The closed test is distributed only in the United States.
- The declared target audience is ages 16-17 and 18+.
- Testers are managed through a Play Console email list. Tester addresses will be supplied separately.
- Each entitled RevenueCat customer receives 10 AI credits per UTC calendar day.
- Standard AI generation and summary requests cost 1 credit.
- A PDF import job costs 5 credits.
- Validation failures, entitlement checks, health checks, and file cleanup cost 0 credits.
- AI-content reports transmit only the flagged AI output, a category, an optional comment, feature/model metadata, a timestamp, and a hashed customer identifier. They never include the original prompt or unrelated campaign data.
- AI-content reports are retained in Cloudflare D1 for 30 days.
- The public privacy and deletion contact is `infernalbuldog@gmail.com`.

## System Architecture

### Mobile application

The Expo/React Native app remains local-first. Campaigns, notes, NPCs, encounters, maps, homebrew, and settings stay in on-device SQLite or device storage. The client uses RevenueCat's Android SDK for purchase, restore, and entitlement state. The client never contains the Anthropic API key, RevenueCat secret API key, quota-hashing secret, Play reviewer credential, or Cloudflare administrative credentials.

Every paid AI operation calls the Cloudflare Worker. Client-side Pro checks provide responsive UI, but the Worker independently verifies entitlement before spending credits or contacting Anthropic.

### RevenueCat and Google Play

Google Play contains one subscription product named `infernal_codex_pro` with one auto-renewing base plan named `monthly`. RevenueCat's `default` offering exposes only its monthly package. Existing Test Store yearly and lifetime products are removed from the active offering and made inactive; they are not deleted unless a later cleanup explicitly requires deletion.

The existing Infernal Codex Pro entitlement remains the single paid-access entitlement. RevenueCat's default transfer behavior is retained so an app without its own login system can restore subscriptions after reinstalling. The Worker uses the canonical RevenueCat customer identity returned during subscriber verification and hashes it with a server-only secret before using it as a D1 key. Raw RevenueCat identifiers are not persisted in D1 or application logs.

RevenueCat receives a dedicated Google service account with only these Play permissions:

- View app information and download bulk reports (read-only).
- View financial data, orders, and cancellation survey responses.
- Manage orders and subscriptions.

The Google Cloud service account receives only the Pub/Sub and monitoring roles required for RevenueCat real-time developer notifications. The service-account JSON is uploaded directly to RevenueCat and never stored in the repository.

### Cloudflare Worker and D1

One Cloudflare Worker provides:

- `GET /health` for deployment checks.
- `POST /v1/messages` for standard one-credit AI operations.
- Protected PDF-job endpoints that treat upload and extraction as one five-credit job.
- `POST /v1/reports` for in-app AI-output reports.

One D1 database stores four bounded classes of data:

1. Current daily customer credit usage.
2. Short-lived PDF job state and signed job identifiers.
3. AI-output reports with an explicit expiry timestamp.
4. Global daily request, input-token, output-token, and error totals without customer identifiers.

Quota updates are atomic. Credits are reserved before an upstream request so concurrent requests cannot exceed the allowance. A reservation is refunded when local validation fails or the upstream request does not succeed. Successful responses include credits remaining and the next UTC reset timestamp.

The standard endpoint rejects document/file content blocks and caps output at 800 tokens. PDF extraction uses the protected PDF job flow, caps output at 8,192 tokens, and initially accepts PDFs up to 25 MB. This prevents a modified client from submitting PDF work through the cheaper endpoint. Unsupported models, beta headers, content types, request shapes, and oversized bodies are rejected before upstream processing.

A daily scheduled cleanup permanently removes reports older than 30 days, expired PDF-job records, and obsolete quota rows. Worker observability excludes bodies, generated output, PDFs, RevenueCat identifiers, secrets, and reviewer credentials.

### GitHub Pages

GitHub Actions publishes a dedicated static-site directory from the public `joshcookwv/dm-assistant-mobile` repository to:

- `/` for support and contact information.
- `/privacy/` for the complete privacy policy.
- `/licenses/` for SRD, OGL, and Creative Commons notices.

Using an Actions deployment keeps the legal site isolated from internal project documentation while retaining the canonical URL `https://joshcookwv.github.io/dm-assistant-mobile/`.

## Application Changes

### Existing defects

The current fixes for drawer navigation, FTS punctuation searches, required PC Max HP/Armor Class, and cancelled campaign creation are preserved. Regression coverage is added where automation is practical, and drawer behavior is included in the native manual test script.

### Subscription screen

The Pro screen displays only the monthly product and its localized Play price. It clearly states:

- Billing occurs monthly and renews automatically until cancelled.
- Cancellation and subscription management occur through Google Play.
- The free app remains usable without subscribing.
- Pro includes unlimited campaigns and 10 AI credits per UTC day.
- Standard AI actions use 1 credit and PDF imports use 5 credits.
- Existing campaigns are not deleted when Pro expires.

The screen includes purchase, restore, privacy-policy, licensing, and Google Play subscription-management actions. Purchase cancellation is not presented as an error.

### Play reviewer access

Because Pro features are subscription-gated, the Pro screen includes an app-review access entry. A high-entropy reusable review identifier is stored only in RevenueCat and Play Console review instructions. Entering it signs the SDK into a RevenueCat customer with a manually granted Pro entitlement. It is never committed to Git, embedded in the build, or written to logs. Reviewer access receives the same 10-credit daily quota and can be rotated if exposed.

### AI-output reporting

A reusable report action appears with each generated result, including NPC generation, campaign summaries, session summaries, and PDF-import staging results. The in-app report modal:

- Displays the exact AI output that will be submitted.
- Offers categories for hateful/offensive content, sexual content, violence or self-harm, deceptive or unsafe content, and other.
- Accepts an optional comment.
- States that the flagged output and comment are retained for 30 days.
- Submits without opening an external browser.
- Shows a clear success or retryable error state.

Reporting is not charged against the paid AI allowance. It has a separate abuse limit keyed to the hashed RevenueCat customer identity.

## Privacy and Data Handling

The privacy policy states that ordinary campaign data remains local. When a user deliberately invokes Pro AI, the necessary prompt or selected PDF travels over HTTPS through Cloudflare to Anthropic. Cloudflare does not persist ordinary prompts, PDFs, or responses. Anthropic may retain API inputs and outputs for up to 30 days under its standard API terms, subject to its policy and legal exceptions.

Flagged output, report metadata, and optional comments remain in D1 for 30 days. RevenueCat processes an anonymous subscriber identifier and Google Play purchase history. Daily per-customer quota rows are retained only as long as operationally necessary, while cost totals are aggregated without customer identifiers. The app has no advertising or behavioral analytics.

The Play Data Safety form conservatively declares collection of purchase history, device or other identifiers, other user-generated content, files and documents, and app interactions associated with deliberately invoked AI features. Data is encrypted in transit, not sold, and used for app functionality, security, entitlement enforcement, abuse prevention, and cost control. RevenueCat, Cloudflare, and Anthropic are described as service providers. The policy explains local deletion on uninstall and how to request deletion of RevenueCat records and unexpired Cloudflare reports through `infernalbuldog@gmail.com`.

## Licensing

The public licensing page and in-app Legal & Licenses screen contain the same substantive notices:

- Complete Open Game License 1.0a text.
- Complete applicable Section 15 copyright notices.
- Required SRD 5.1 and SRD 5.2 CC-BY-4.0 attribution.
- Attribution for other bundled CC-BY sources.
- Source and license links.
- A statement that Infernal Codex is independent and is not affiliated with, endorsed by, or sponsored by Wizards of the Coast.

## Error Handling and Security

- Missing or inactive entitlements return a stable authorization response without spending credits.
- Quota exhaustion returns HTTP 429 with remaining credits and reset time.
- Invalid model, beta, request-shape, file-size, and token-limit errors return stable 4xx responses before upstream work.
- Upstream connectivity and 5xx failures return a user-safe retry message and release the reservation.
- Report validation rejects empty, oversized, or unsupported content before writing D1.
- CORS is limited to the headers and methods used by the native client; secrets never enter public Expo variables.
- D1 keys use a keyed server-side hash rather than a client-supplied device ID.
- No request/response bodies or identifiers appear in Worker logs.
- File cleanup is best effort and never hides a completed extraction result.

## Verification Strategy

Implementation follows red-green-refactor cycles. Automated coverage includes:

- Atomic quota reservation under concurrent requests.
- UTC reset behavior.
- One-credit standard and five-credit PDF accounting.
- Credit refunds for rejected and unsuccessful requests.
- RevenueCat entitlement acceptance, expiry, and rejection.
- Canonical customer hashing without raw-ID persistence.
- Model, beta, token, request-size, and PDF-size enforcement.
- Prevention of PDF blocks on the standard endpoint.
- Report field validation, separate abuse limiting, and 30-day cleanup.
- Purchase-screen package filtering and entitlement state transitions.
- Notes punctuation, PC validation, and campaign-draft regressions.

Release verification includes app TypeScript, lint, Expo Doctor, dependency review, Worker typecheck/tests/audit, Android export, production AAB creation, bundle inspection, RevenueCat sandbox purchase/restore/expiry, Worker health and quota smoke tests, and native device checks. The existing dependency advisories are investigated and documented; the forced Expo downgrade proposed by `npm audit` is not applied.

## Release Workflow

Work occurs on `codex/closed-testing-readiness`. The approved design is committed independently before existing user changes are checkpointed. Release-related existing changes are then committed as a baseline without `builds/tmp/`, obsolete assets, credentials, or generated files.

`docs/Remaining-until-published.md` becomes the authoritative checkbox checklist. A box is checked only when fresh evidence supports it. The workflow is:

1. Preserve and checkpoint existing release work.
2. Implement and verify app, Worker, reporting, subscription, and legal-site changes.
3. Push the branch and publish GitHub Pages.
4. Create Cloudflare Worker/D1 resources and secrets, deploy, migrate, and smoke test.
5. Create the Google Play monthly subscription and restricted service account.
6. Connect RevenueCat credentials, product, entitlement, offering, and notifications.
7. Complete privacy, app access, target audience, Data Safety, and store-listing tasks.
8. Build and inspect a new production AAB.
9. Upload the AAB and complete the US closed-test release.
10. Add the tester email list when supplied and send the release for Google review.
11. Record the tester opt-in URL and leave the 12-testers/14-days requirement unchecked until satisfied.

No production rollout is authorized by this design.
