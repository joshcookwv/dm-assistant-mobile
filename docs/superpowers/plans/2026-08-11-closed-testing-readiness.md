# Infernal Codex Closed-Testing Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a verified Android build of Infernal Codex to a United States Google Play closed-test track with a $4.99 monthly RevenueCat subscription, atomic per-customer AI credits, Cloudflare-hosted AI reporting, and public GitHub Pages privacy/licensing documents.

**Architecture:** The Expo app remains local-first and uses RevenueCat for anonymous subscription entitlement. One Cloudflare Worker verifies entitlement, hashes RevenueCat's canonical customer identity, atomically reserves credits in D1, proxies bounded Anthropic requests, and stores 30-day AI-output reports. GitHub Actions publishes a small static legal site from this repository, and Play Console receives the resulting policy URL, disclosures, listing, and release AAB.

**Tech Stack:** Expo SDK 56, React Native 0.85, TypeScript 6, Jest/jest-expo, Cloudflare Workers, D1, Vitest 4 with `@cloudflare/vitest-pool-workers`, RevenueCat React Native SDK 10, Anthropic Messages/Files APIs, GitHub Actions Pages, Google Play Console, EAS Build.

## Global Constraints

- Work only on `codex/closed-testing-readiness`; do not roll out to production or start iOS work.
- Preserve all existing user changes and keep `builds/tmp/`, `docs/store-assets/feature-graphic1.jpg`, credentials, and generated files out of Git.
- Offer only `infernal_codex_pro` / `monthly` at a base US price of $4.99.
- Grant 10 credits per canonical RevenueCat customer per UTC calendar day: standard AI costs 1 and PDF import costs 5.
- Failed validation, failed entitlement, upstream failure, health, report submission, and file cleanup cost 0 AI credits.
- Standard responses are capped at 800 output tokens; PDF extraction is capped at 8,192 output tokens and 25 MB input.
- Store reports for 30 days; never persist ordinary prompts, PDFs, responses, raw RevenueCat IDs, secrets, or reviewer credentials.
- Target ages are 16-17 and 18+; closed testing is United States only and uses a Play Console email list.
- Public privacy contact is `infernalbuldog@gmail.com`.
- RevenueCat's Play service account receives only: View app information and download bulk reports (read-only); View financial data, orders, and cancellation survey responses; and Manage orders and subscriptions.
- A checklist item is checked only after fresh verification evidence exists.

---

### Task 1: Preserve the current release work as a clean baseline

**Files:**
- Modify: `.gitignore`
- Commit existing: `README.md`, `app.json`, `package.json`, `package-lock.json`, `src/**`, `worker/**`, `docs/store-submission.md`, `docs/cloudflare-backend-plan.md`, `docs/store-screenshots/**`, `.env.example`
- Exclude: `builds/tmp/**`, `docs/store-assets/feature-graphic1.jpg`, `worker/.dev.vars`, `.env.local`

**Interfaces:**
- Consumes: approved design commit `49b65f2` and the current dirty working tree.
- Produces: a reviewable baseline commit containing the already-created app fixes, RevenueCat client work, screenshots, and Worker prototype.

- [ ] **Step 1: Record the pre-checkpoint state**

Run:

```powershell
git status --short --branch
git diff --stat
git log --oneline origin/master..HEAD
```

Expected: branch `codex/closed-testing-readiness`, design commit at HEAD, eight earlier local commits, and the previously audited dirty files.

- [ ] **Step 2: Add explicit generated-file exclusions**

Append these exact lines to `.gitignore`:

```gitignore
# Local Android/QA artifacts
/builds/tmp/
/docs/store-assets/feature-graphic1.jpg
```

- [ ] **Step 3: Stage only release-related existing work**

Run:

```powershell
git add -- .gitignore .env.example README.md app.json package.json package-lock.json `
  docs/cloudflare-backend-plan.md docs/store-submission.md docs/store-screenshots `
  src worker
```

Expected: no path under `builds/tmp`, no `feature-graphic1.jpg`, and no secret file is staged.

- [ ] **Step 4: Verify the staged boundary**

Run:

```powershell
git diff --cached --name-only
git diff --cached --check
git status --short
```

Expected: whitespace check exits 0; `docs/Remaining-until-published.md` and this implementation plan remain unstaged; excluded artifacts remain untracked or ignored.

- [ ] **Step 5: Verify the existing code before checkpointing**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
Push-Location worker; npm.cmd run typecheck; npm.cmd audit --omit=dev; Pop-Location
```

Expected: TypeScript passes, lint has zero errors, Worker typecheck passes, and Worker production audit reports zero vulnerabilities.

- [ ] **Step 6: Commit the baseline**

Run:

```powershell
git commit -m "feat: checkpoint closed testing app work"
```

Expected: only the staged release baseline is committed.

---

### Task 2: Establish the authoritative checklist and regression-test foundation

**Files:**
- Modify: `docs/Remaining-until-published.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `jest.config.js`
- Create: `src/lib/campaign-validation.ts`
- Create: `src/lib/drawer-navigation.ts`
- Create: `src/lib/__tests__/campaign-validation.test.ts`
- Create: `src/lib/__tests__/drawer-navigation.test.ts`
- Create: `src/lib/__tests__/notes-query.test.ts`
- Modify: `src/lib/notes.ts:22`
- Modify: `src/app/_layout.tsx:34`
- Modify: `src/app/campaign/[id]/pc/[pcId].tsx:61`
- Modify: `src/app/campaign/new.tsx:18`

**Interfaces:**
- Consumes: existing FTS query, drawer navigation, PC form, and delayed campaign creation fixes.
- Produces: `validateCampaignPc(form)`, `drawerTarget(routeName, params)`, exported `buildFtsQuery(raw)`, Jest configuration, and the single release checklist.

- [ ] **Step 1: Replace the stale audit prose with the release checklist**

The file must contain top-level checkbox groups for source safety, four app regressions, Worker/D1, AI reporting, RevenueCat, GitHub Pages, privacy/licensing, Play forms, build verification, closed-test rollout, tester count, and 14-day completion. Every box starts unchecked except facts reverified in the current run, whose line includes the proving command or URL.

- [ ] **Step 2: Install the Expo-compatible test stack**

Run:

```powershell
npm.cmd install --save-dev jest@29.7.0 jest-expo@56.0.5 `
  @testing-library/react-native@14.0.1 react-test-renderer@19.2.3
```

Add these scripts to `package.json`:

```json
"test": "jest --runInBand",
"test:watch": "jest --watch"
```

Create `jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: ["src/lib/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
};
```

- [ ] **Step 3: Write failing regression tests**

Use exact behaviors:

```ts
expect(buildFtsQuery("ancient.dragon")).toBe('"ancient.dragon"*');
expect(validateCampaignPc({ name: "A", maxHp: "", ac: "12" })).toEqual({ ok: false, field: "maxHp" });
expect(validateCampaignPc({ name: "A", maxHp: "8", ac: "12" })).toEqual({ ok: true, maxHp: 8, ac: 12 });
expect(drawerTarget("campaign", { screen: "detail" })).toEqual({ name: "campaign", params: { screen: "index" } });
```

The campaign test must also assert that navigating to `/campaign/new` does not call `createCampaign` until the explicit submit handler runs.

- [ ] **Step 4: Run the tests and confirm RED**

Run:

```powershell
npm.cmd test -- src/lib/__tests__/notes-query.test.ts `
  src/lib/__tests__/campaign-validation.test.ts `
  src/lib/__tests__/drawer-navigation.test.ts
```

Expected: failures because the functions are private or do not yet exist.

- [ ] **Step 5: Implement the smallest pure helpers and wire them into screens**

Use these signatures:

```ts
export type PcValidation =
  | { ok: true; maxHp: number; ac: number }
  | { ok: false; field: "name" | "maxHp" | "ac" };

export function validateCampaignPc(form: { name: string; maxHp: string; ac: string }): PcValidation;
export function drawerTarget(name: string, params?: object): { name: string; params?: object };
export function buildFtsQuery(raw: string): string;
```

Keep the current UI wording and route behavior unchanged.

- [ ] **Step 6: Run focused and full checks**

Run:

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
```

Expected: tests pass, TypeScript passes, and lint has zero errors.

- [ ] **Step 7: Update checklist evidence and commit**

Run:

```powershell
git add docs/Remaining-until-published.md package.json package-lock.json jest.config.js `
  src/lib/campaign-validation.ts src/lib/drawer-navigation.ts src/lib/notes.ts `
  src/lib/__tests__ src/app/_layout.tsx `
  'src/app/campaign/[id]/pc/[pcId].tsx' src/app/campaign/new.tsx
git commit -m "test: cover closed testing regressions"
```

---

### Task 3: Replace client-ID KV limiting with atomic D1 customer credits

**Files:**
- Modify: `worker/package.json`
- Modify: `worker/package-lock.json`
- Create: `worker/vitest.config.ts`
- Create: `worker/migrations/0001_release_schema.sql`
- Create: `worker/src/types.ts`
- Create: `worker/src/identity.ts`
- Create: `worker/src/quota.ts`
- Create: `worker/test/identity.test.ts`
- Create: `worker/test/quota.test.ts`
- Modify: `worker/wrangler.toml`

**Interfaces:**
- Consumes: verified RevenueCat `original_app_user_id`, D1 binding `DB`, secret `USER_HASH_SECRET`.
- Produces: `hashCustomerId(id, secret)`, `reserveCredits(db, input)`, `refundCredits(db, reservationId)`, and response type `CreditState`.

- [ ] **Step 1: Install Worker test dependencies**

Run from `worker/`:

```powershell
npm.cmd install --save-dev vitest@4.1.10 @cloudflare/vitest-pool-workers@0.21.0
```

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create the D1 schema**

Create these tables with SQLite checks and indexes:

```sql
CREATE TABLE quota_usage (
  user_hash TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used BETWEEN 0 AND 10),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_hash, day_utc)
);

CREATE TABLE quota_reservations (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits IN (1, 5)),
  kind TEXT NOT NULL CHECK (kind IN ('standard', 'pdf')),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'refunded')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE pdf_jobs (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  reservation_id TEXT NOT NULL UNIQUE,
  anthropic_file_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('created', 'uploaded', 'completed', 'failed', 'deleted')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES quota_reservations(id)
);

CREATE TABLE ai_reports (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  category TEXT NOT NULL,
  comment TEXT NOT NULL,
  output TEXT NOT NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE report_usage (
  user_hash TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  reports_submitted INTEGER NOT NULL DEFAULT 0 CHECK (reports_submitted BETWEEN 0 AND 10),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_hash, day_utc)
);

CREATE TABLE daily_metrics (
  day_utc TEXT NOT NULL,
  feature TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day_utc, feature)
);
```

- [ ] **Step 3: Write failing identity and quota tests**

Tests must prove deterministic HMAC-SHA-256 hashing, different secrets producing different hashes, no raw ID in output, 10-credit ceiling, UTC reset, concurrent reservation safety, one-credit/five-credit weights, and idempotent refund.

- [ ] **Step 4: Run Worker tests and confirm RED**

Run:

```powershell
npm.cmd test
```

Expected: module-not-found or missing-export failures for `identity.ts` and `quota.ts`.

- [ ] **Step 5: Implement identity and quota modules**

Use these interfaces:

```ts
export interface CreditState {
  limit: 10;
  used: number;
  remaining: number;
  resetAt: string;
}

export interface ReservationResult {
  allowed: boolean;
  reservationId: string | null;
  credits: CreditState;
}

export async function hashCustomerId(id: string, secret: string): Promise<string>;
export async function reserveCredits(db: D1Database, userHash: string, kind: "standard" | "pdf", now: Date): Promise<ReservationResult>;
export async function completeReservation(db: D1Database, reservationId: string): Promise<void>;
export async function refundCredits(db: D1Database, reservationId: string): Promise<void>;
```

Use a single conditional UPSERT for the credit ceiling and D1 `batch()` for reservation state changes.

- [ ] **Step 6: Replace KV configuration with D1 configuration**

Remove `RATE_LIMIT_KV`, `RATE_LIMIT_MAX`, and `RATE_LIMIT_WINDOW_SECONDS`. Add binding `DB`, nonsecret limits `DAILY_CREDIT_LIMIT = 10`, `STANDARD_CREDIT_COST = 1`, `PDF_CREDIT_COST = 5`, and secret type `USER_HASH_SECRET`.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
git add package.json package-lock.json vitest.config.ts migrations src/types.ts src/identity.ts src/quota.ts test wrangler.toml
git commit -m "feat: add atomic per-customer AI credits"
```

---

### Task 4: Enforce entitlement, request bounds, and protected PDF jobs

**Files:**
- Create: `worker/src/revenuecat.ts`
- Create: `worker/src/request-validation.ts`
- Create: `worker/src/anthropic.ts`
- Create: `worker/src/pdf-jobs.ts`
- Modify: `worker/src/index.ts`
- Create: `worker/test/revenuecat.test.ts`
- Create: `worker/test/messages.test.ts`
- Create: `worker/test/pdf-jobs.test.ts`

**Interfaces:**
- Consumes: Task 3 identity and quota APIs.
- Produces: `verifyEntitlement(appUserId, env)`, `validateStandardRequest(body)`, standard `/v1/messages`, protected PDF job routes, and credit headers.

- [ ] **Step 1: Write failing entitlement and request tests**

Cover missing ID, inactive entitlement, RevenueCat failure, canonical `original_app_user_id`, unsupported model/beta, `max_tokens > 800`, JSON body over 256 KiB, file/document blocks on the standard route, 25 MB PDF limit, and PDF extraction costing exactly 5 credits.

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```powershell
npm.cmd test -- revenuecat.test.ts messages.test.ts pdf-jobs.test.ts
```

Expected: missing-module failures.

- [ ] **Step 3: Implement RevenueCat verification**

Use:

```ts
export interface VerifiedCustomer {
  canonicalId: string;
  entitlementExpiresAt: string | null;
}

export async function verifyEntitlement(
  appUserId: string,
  env: Pick<Env, "REVENUECAT_SECRET_API_KEY" | "REVENUECAT_ENTITLEMENT_ID">
): Promise<VerifiedCustomer>;
```

Reject placeholder/missing configuration before external calls. Accept only an active, nonexpired entitlement and return the subscriber response's canonical original customer ID.

- [ ] **Step 4: Implement bounded standard messages**

The route order is: CORS/method -> body-size/shape -> configuration -> entitlement -> customer hash -> reserve 1 -> Anthropic -> complete/refund -> metrics -> response. Add headers:

```text
X-AI-Credits-Limit: 10
X-AI-Credits-Remaining: <0-10>
X-AI-Credits-Reset: <ISO-8601 UTC>
```

- [ ] **Step 5: Implement protected PDF jobs**

Create a random job ID after entitlement and five-credit reservation. Implement these exact routes:

```text
POST /v1/pdf-jobs
PUT /v1/pdf-jobs/:jobId/file
POST /v1/pdf-jobs/:jobId/extract
DELETE /v1/pdf-jobs/:jobId/file
```

Upload, extraction, and deletion require the matching job ID and hashed customer. The standard route rejects file content blocks. A terminal extraction completes the reservation; any failed preflight or unsuccessful upstream response refunds it; file deletion is free.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd audit --omit=dev
git add src test
git commit -m "feat: secure the entitlement-gated AI proxy"
```

---

### Task 5: Add Cloudflare AI-output reports, cost metrics, and retention cleanup

**Files:**
- Create: `worker/src/reports.ts`
- Create: `worker/src/metrics.ts`
- Create: `worker/src/cleanup.ts`
- Modify: `worker/src/index.ts`
- Modify: `worker/wrangler.toml`
- Create: `worker/test/reports.test.ts`
- Create: `worker/test/cleanup.test.ts`
- Create: `worker/test/metrics.test.ts`

**Interfaces:**
- Consumes: hashed verified customer and D1 schema.
- Produces: `POST /v1/reports`, `recordUsage`, daily scheduled cleanup, and no-content logging guarantees.

- [ ] **Step 1: Write failing report and cleanup tests**

Use report contract:

```ts
export type ReportCategory = "offensive" | "sexual" | "violence_self_harm" | "deceptive_unsafe" | "other";

export interface AiOutputReportInput {
  category: ReportCategory;
  comment?: string;
  output: string;
  feature: "npc" | "campaign_summary" | "session_summary" | "pdf_import";
  model: string;
}
```

Assert output length 1-20,000, comment length 0-1,000, allowed categories/features only, no AI-credit decrement, separate maximum 10 reports per customer per UTC day, and deletion when `expires_at <= now`.

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```powershell
npm.cmd test -- reports.test.ts cleanup.test.ts metrics.test.ts
```

- [ ] **Step 3: Implement reports and aggregate metrics**

Atomically increment `report_usage` only when the UTC-day count is below 10, then insert reports with `expires_at = created_at + 30 days`. Record global daily request/input/output/error totals from Anthropic's usage fields without customer identifiers. If validation or insertion fails, do not consume report capacity.

- [ ] **Step 4: Implement scheduled cleanup**

Add Worker `scheduled()` handling and Wrangler cron `0 5 * * *`. Delete expired reports, expired PDF jobs and completed/refunded reservations older than two days, report-usage rows older than two days, and quota rows older than two days.

- [ ] **Step 5: Verify logs cannot contain sensitive content**

Tests must spy on `console.*` and assert report output, prompt markers, raw App User IDs, and secret values are absent from emitted logs.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
git add src test wrangler.toml
git commit -m "feat: add private AI output reporting"
```

---

### Task 6: Update the mobile AI client for credits, PDF jobs, and reports

**Files:**
- Create: `src/lib/ai-contract.ts`
- Create: `src/lib/ai-reports.ts`
- Create: `src/providers/ai-credits.tsx`
- Modify: `src/lib/ai.ts:73-138`
- Modify: `src/lib/pdf-import.ts:109-144`
- Modify: `src/app/_layout.tsx:105`
- Create: `src/lib/__tests__/ai-contract.test.ts`
- Create: `src/lib/__tests__/ai-reports.test.ts`

**Interfaces:**
- Consumes: Worker response headers and report/PDF endpoints from Tasks 4-5.
- Produces: `AiCreditState`, `parseCreditHeaders(response)`, `submitAiReport(input)`, `useAiCredits()`, and protected PDF client flow.

- [ ] **Step 1: Write failing contract tests**

Test this public shape:

```ts
export interface AiCreditState {
  limit: number;
  remaining: number;
  resetAt: string;
}

export function parseCreditHeaders(headers: Headers): AiCreditState | null;
export async function submitAiReport(input: AiOutputReportInput): Promise<{ reportId: string }>;
```

Assert malformed/missing headers return null, 429 bodies preserve remaining/reset data, and report requests never include prompt fields.

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```powershell
npm.cmd test -- src/lib/__tests__/ai-contract.test.ts src/lib/__tests__/ai-reports.test.ts
```

- [ ] **Step 3: Implement credit state and report client**

Update credit context after every Worker response. Do not store credits as authoritative access; they are display state only. Use the existing RevenueCat app-user ID header for Worker verification.

- [ ] **Step 4: Replace the free-form Files API sequence with protected PDF jobs**

The client calls `POST /v1/pdf-jobs`, uploads with `PUT /v1/pdf-jobs/:jobId/file`, extracts with `POST /v1/pdf-jobs/:jobId/extract`, and performs free cleanup with `DELETE /v1/pdf-jobs/:jobId/file`. It surfaces the Worker-provided remaining credits and safe errors.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
git add src/lib src/providers src/app/_layout.tsx
git commit -m "feat: expose secure AI credits and reports"
```

---

### Task 7: Add the in-app AI report flow to every generated result

**Files:**
- Create: `src/components/ai-report-action.tsx`
- Create: `src/components/ai-report-modal.tsx`
- Create: `src/components/__tests__/ai-report-modal.test.tsx`
- Modify: `src/app/npcs/[id].tsx`
- Modify: `src/app/campaign/[id]/index.tsx`
- Modify: `src/app/campaign/[id]/session/[sessionId].tsx`
- Modify: `src/app/import.tsx`

**Interfaces:**
- Consumes: `submitAiReport` and `AiOutputReportInput` from Task 6.
- Produces: reusable `AiReportAction` and `AiReportModal` components attached to NPC, campaign, session, and PDF outputs.

- [ ] **Step 1: Write the failing component test**

Assert that opening the modal displays the exact flagged output, all five categories, optional comment input, the 30-day disclosure, Cancel, and Submit. Assert submission sends only `category`, `comment`, `output`, `feature`, and `model`.

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
npm.cmd test -- src/components/__tests__/ai-report-modal.test.tsx
```

- [ ] **Step 3: Implement the modal and action**

Use props:

```ts
interface AiReportActionProps {
  output: string;
  feature: AiOutputReportInput["feature"];
  model: string;
}
```

Disable Submit until a category is selected; show an in-modal success state and a retryable error without opening a browser.

- [ ] **Step 4: Integrate all AI result surfaces**

NPC suggestions report the generated suggestion, summaries report the generated summary before or after insertion, and PDF staging reports the selected generated extraction output. Do not attach reporting to user-authored text that has not been generated by AI.

- [ ] **Step 5: Verify accessibility and commit**

Run:

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
git add src/components src/app
git commit -m "feat: add in-app AI output reporting"
```

---

### Task 8: Finish monthly purchases and reusable Play reviewer access

**Files:**
- Modify: `src/lib/purchases.ts:37-111`
- Modify: `src/providers/pro-access.tsx`
- Modify: `src/app/pro.tsx:24-151`
- Create: `src/lib/__tests__/purchases.test.ts`
- Create: `src/app/__tests__/pro-copy.test.tsx`
- Modify: `.env.example`
- Modify: `app.json`

**Interfaces:**
- Consumes: RevenueCat `default` offering and monthly package, public Android API key, entitlement ID.
- Produces: `monthlyPackages(offerings)`, `activateReviewerAccess(code)`, compliant subscription copy, restore, and Play management link.

- [ ] **Step 1: Write failing purchase-policy tests**

Assert only packages whose identifier is `$rc_monthly` or whose package type is monthly are rendered. Assert the screen includes `$4.99` only through RevenueCat's localized `priceString`, monthly renewal, automatic renewal, cancel/manage, free app availability, 10 credits, 1/5 credit costs, privacy, and restore copy.

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```powershell
npm.cmd test -- src/lib/__tests__/purchases.test.ts src/app/__tests__/pro-copy.test.tsx
```

- [ ] **Step 3: Implement monthly filtering and reviewer access**

Use:

```ts
export function monthlyPackages(offerings: PurchasesOfferings | null): PurchasesPackage[];
export async function activateReviewerAccess(code: string): Promise<CustomerInfo>;
```

`activateReviewerAccess` trims the entered high-entropy RevenueCat customer ID and calls `Purchases.logIn(code)`. The code is never saved separately, logged, embedded, or added to an environment file.

- [ ] **Step 4: Add compliant Pro screen actions**

Add privacy/licensing links and `https://play.google.com/store/account/subscriptions?package=com.infernalbulldog.dmassistant` for subscription management. Keep reviewer entry behind an explicitly labeled “App review access” disclosure at the bottom of the screen.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
git add src .env.example app.json
git commit -m "feat: finish monthly Pro purchase flow"
```

---

### Task 9: Publish privacy and SRD licensing from this repository

**Files:**
- Create: `site/index.html`
- Create: `site/privacy/index.html`
- Create: `site/licenses/index.html`
- Create: `site/styles.css`
- Create: `.github/workflows/pages.yml`
- Create: `src/lib/__tests__/legal-site.test.ts`
- Modify: `src/app/settings/index.tsx:14-186`
- Modify: `src/app/settings/legal.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: approved privacy language, in-app OGL/Section 15/CC attribution, public contact.
- Produces: `https://joshcookwv.github.io/dm-assistant-mobile/`, `/privacy/`, `/licenses/`, and matching in-app links.

- [ ] **Step 1: Write the failing legal-site content test**

Read the three HTML files and assert the privacy page contains the contact, RevenueCat, Cloudflare, Anthropic 30-day retention, AI reports 30-day retention, deletion process, no ads/analytics, and target-audience statement. Assert the licenses page contains the full OGL sections 1-15, SRD 5.1/5.2 attribution, Section 15 sources, and independence disclaimer.

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
npm.cmd test -- src/lib/__tests__/legal-site.test.ts
```

- [ ] **Step 3: Create the static site**

Use semantic HTML, the app's obsidian/ember colors, responsive typography, visible last-updated date `August 11, 2026`, and links between all three routes. The support home provides the email contact and repository issue link.

- [ ] **Step 4: Create the Pages workflow**

Use `actions/configure-pages`, `actions/upload-pages-artifact` with `path: site`, and `actions/deploy-pages`. Trigger on pushes to `master` and `workflow_dispatch`; grant only `contents: read`, `pages: write`, and `id-token: write`.

- [ ] **Step 5: Point the app and docs to the new URLs**

Set privacy to `https://joshcookwv.github.io/dm-assistant-mobile/privacy/` and licensing to `https://joshcookwv.github.io/dm-assistant-mobile/licenses/`. Remove the “private repository” badge and stale support-repository references.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm.cmd test -- src/lib/__tests__/legal-site.test.ts
npm.cmd exec tsc -- --noEmit
git diff --check
git add site .github src/app/settings src/lib/__tests__/legal-site.test.ts README.md
git commit -m "docs: publish privacy and SRD licensing site"
```

---

### Task 10: Run complete local verification

**Files:**
- Modify: `docs/Remaining-until-published.md`
- Modify: `docs/store-submission.md`
- Create: `docs/closed-test-manual-checks.md`

**Interfaces:**
- Consumes: Tasks 1-9.
- Produces: fresh automated evidence, a device checklist, an exportable Android bundle, and accurate predeployment release documentation.

- [ ] **Step 1: Run the full automated suite**

Run:

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npx.cmd expo-doctor
npm.cmd audit --omit=dev
Push-Location worker; npm.cmd test; npm.cmd run typecheck; npm.cmd audit --omit=dev; Pop-Location
```

Expected: all tests/typechecks pass, lint has zero errors, Expo Doctor passes all checks, Worker production audit is clean, and app audit advisories are recorded without a forced Expo downgrade.

- [ ] **Step 2: Export Android production JavaScript**

Run:

```powershell
$out = Join-Path $env:TEMP 'infernal-codex-android-export'
npx.cmd expo export --platform android --output-dir $out
```

Expected: exit 0 with an Android bundle and assets.

- [ ] **Step 3: Execute the predeployment native manual checklist**

Cover onboarding, drawer close/back/scrim, Notes period search, cancelled new campaign, PC validation, free campaign limit, purchase-screen layout, privacy/licensing link targets, backup/restore, and app relaunch. Record production-only purchase, entitlement, AI, and reporting checks as pending for Task 12.

- [ ] **Step 4: Update evidence and commit**

Run:

```powershell
git add docs/Remaining-until-published.md docs/store-submission.md docs/closed-test-manual-checks.md
git commit -m "docs: record closed test verification"
```

---

### Task 11: Deploy GitHub Pages and Cloudflare production infrastructure

**Files:**
- Modify: `worker/wrangler.toml` with real nonsecret D1 database ID.
- Modify: `.env.example` only if public variable names changed.
- Modify: `docs/Remaining-until-published.md`.

**Interfaces:**
- Consumes: verified commits, Cloudflare account `90f2fa12bb25a50d1104723ccbcbd8f1`, Anthropic API key supplied through a secret channel.
- Produces: live Pages URLs, D1 database, deployed Worker URL, migrations, secrets, and smoke-test evidence.

- [ ] **Step 1: Push the verified branch and create the integration PR**

Run:

```powershell
git push -u origin codex/closed-testing-readiness
gh pr create --base master --head codex/closed-testing-readiness `
  --title "Prepare Infernal Codex for closed testing" `
  --body-file docs/Remaining-until-published.md
```

- [ ] **Step 2: Review checks, merge, and verify Pages deployment**

After checks pass, merge the PR, inspect the Pages workflow, and verify HTTP 200 plus required text at `/`, `/privacy/`, and `/licenses/`.

- [ ] **Step 3: Create and migrate D1**

Run from `worker/`:

```powershell
npx.cmd wrangler d1 create infernal-codex
npx.cmd wrangler d1 migrations apply infernal-codex --remote
```

Copy only the returned database UUID into `wrangler.toml`; commit that nonsecret identifier.

- [ ] **Step 4: Configure Worker secrets**

Create `ANTHROPIC_API_KEY`, `REVENUECAT_SECRET_API_KEY`, and a random 32-byte `USER_HASH_SECRET` through Cloudflare secret APIs or Wrangler prompts. Never print secret values or write them to disk.

- [ ] **Step 5: Deploy and smoke test**

Run:

```powershell
npx.cmd wrangler deploy
Invoke-RestMethod '<deployed-worker-url>/health'
```

Expected: health `{ "status": "ok" }`; unauthenticated AI/report calls are rejected; no D1 rows contain raw IDs or test prompts.

- [ ] **Step 6: Update production public configuration**

Set `EXPO_PUBLIC_AI_PROXY_BASE_URL`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` in the EAS production environment, then rebuild if Task 10's AAB predated these values.

---

### Task 12: Build the release AAB and configure Google Play and RevenueCat monthly subscriptions

**Files:**
- Modify: `docs/Remaining-until-published.md` with nonsecret evidence only.
- External: Google Cloud, Play Console, RevenueCat.

**Interfaces:**
- Consumes: billing-enabled AAB, package name, RevenueCat project `bb84fc50`, live Worker and Pages URLs.
- Produces: inspected production AAB, active monthly Play product, valid RevenueCat credentials, monthly offering, reviewer entitlement, and real-time notifications.

- [ ] **Step 1: Build and inspect the production AAB**

After Task 11 has set every production public variable, run:

```powershell
eas.cmd build --platform android --profile production --non-interactive
```

Download the resulting AAB outside the repository. Confirm package `com.infernalbulldog.dmassistant`, version name `1.0.0`, an incremented version code, target API 36, no microphone/camera/overlay/legacy storage permissions, and RevenueCat billing components.

- [ ] **Step 2: Upload the billing-enabled AAB to a nonproduction Play track**

Upload the verified AAB and save the draft release so Play enables subscription product configuration.

- [ ] **Step 3: Create the Play subscription**

Create product ID `infernal_codex_pro`, base plan ID `monthly`, auto-renewing period one month, United States availability, and $4.99 base US price. Activate the base plan without a free trial or introductory offer.

- [ ] **Step 4: Create the restricted Google service account**

Use a dedicated Google Cloud project. Enable Android Publisher, Play Developer Reporting, and Pub/Sub APIs. Grant Pub/Sub Editor and Monitoring Viewer in Google Cloud. In Play Console grant only the three permissions in Global Constraints for Infernal Codex.

- [ ] **Step 5: Upload and validate credentials in RevenueCat**

Upload the generated JSON directly to the existing Play app settings, save, and run RevenueCat's credential validator until subscriptions, in-app products, and monetization checks are valid.

- [ ] **Step 6: Import and connect the monthly product**

Import `infernal_codex_pro:monthly`, attach it to the existing Infernal Codex Pro entitlement, replace the `default` offering's packages with the monthly package only, and make yearly/lifetime Test Store products inactive.

- [ ] **Step 7: Configure notifications**

Create the RevenueCat Pub/Sub topic/subscription, grant Google's developer-notifications service account Publisher on the topic, paste the topic in Play Console, send a test notification, and confirm RevenueCat receives it.

- [ ] **Step 8: Create reviewer access**

Generate a high-entropy RevenueCat customer identifier, grant it a promotional Pro entitlement, and place it only in Play Console app-access instructions. Verify it unlocks Pro and receives 10 daily credits; do not record the identifier in the checklist or Git.

- [ ] **Step 9: Execute production purchase, AI, and reporting checks**

On the production-signed build, verify a RevenueCat sandbox monthly purchase, cancellation handling, restore, expiry, reviewer access, standard one-credit decrement, PDF five-credit decrement, quota exhaustion/reset copy, free validation and upstream-failure paths, report submission without a credit charge, and the 30-day disclosure. Record only nonsecret evidence in the checklist.

---

### Task 13: Complete Play Console setup and enter closed testing

**Files:**
- Modify: `docs/Remaining-until-published.md`.
- External: Play Console app `4976322750310085419`.

**Interfaces:**
- Consumes: live legal URLs, reviewer credential, store assets, verified AAB, tester emails when supplied.
- Produces: completed 13/13 app setup, US closed-test track, tester opt-in URL, and a release sent for Google review.

- [ ] **Step 1: Complete privacy and app access**

Set privacy URL to `https://joshcookwv.github.io/dm-assistant-mobile/privacy/`. Mark functionality restricted by subscription, state that no user login exists, provide reviewer-access instructions and the reusable private identifier, and explain how to reach the Pro screen.

- [ ] **Step 2: Complete target audience**

Select only ages 16-17 and 18+, answer that the app is not designed for children, and save the resulting summary.

- [ ] **Step 3: Complete Data Safety**

Answer Yes to collection and Yes to encryption in transit and deletion requests. Declare Purchase history; Device or other identifiers; Other user-generated content; Files and documents; and App interactions. Mark AI text/PDF/report transmission optional, purchase/entitlement identifiers required when using Pro, not sold, and used for app functionality, security, abuse prevention, and analytics/cost measurement. Apply service-provider exceptions consistently with the public policy.

- [ ] **Step 4: Complete the main store listing**

Use app name Infernal Codex, the approved 79-character short description and full description from `docs/store-submission.md`, category Tools, `docs/store-assets/app-icon-512.png`, `docs/store-assets/feature-graphic.jpg`, eight phone screenshots, four 7-inch tablet screenshots, and four 10-inch tablet screenshots.

- [ ] **Step 5: Configure closed-test countries and testers**

Select United States only and create an email list named `Infernal Codex Closed Test`. Import the user-supplied Google-account addresses. If fewer than 12 addresses have been supplied, save the track configuration but do not claim the tester requirement is complete.

- [ ] **Step 6: Create and submit the closed-test release**

Attach the verified AAB, add release notes describing the initial closed test, preview errors/warnings, resolve blocking errors, and send the release to Google for review. Do not create or roll out a production release.

- [ ] **Step 7: Record the handoff state**

Record the opt-in URL, release/version code, review status, submission timestamp, and current opted-in tester count in the checklist. Leave “12 opted-in testers” and “14 continuous days” unchecked until Play Console itself confirms them.

- [ ] **Step 8: Commit the final nonsecret checklist update**

Run:

```powershell
git add docs/Remaining-until-published.md
git commit -m "docs: record closed testing submission"
git push
```
