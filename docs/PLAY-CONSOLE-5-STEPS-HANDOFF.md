# Infernal Codex: Play Console Five-Step Manual Handoff

Last verified: August 11, 2026

This guide is for completing the five unfinished **App setup** tasks for Infernal Codex after access to the Google Play developer account is restored. The expected result is that the Play Console dashboard changes from **8 of 13 tasks complete** to **13 of 13 tasks complete**.

This guide does **not** authorize a production release. After these five tasks are complete, stop and return the work to Codex so the RevenueCat connection, Cloudflare deployment, production AAB, and United States closed-test release can be completed and verified.

> **Current dependency:** four tasks can be submitted as soon as the Google account is restored. **Sign in details / App access must remain a draft until the private RevenueCat reviewer code has been created and tested.** If you reach that point first, return to Codex after completing the other four; do not enter a fake code just to reach 13 of 13.

## Known app details

| Item                      | Approved value                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| App                       | Infernal Codex                                                                                                                                |
| Android package           | `com.infernalbulldog.dmassistant`                                                                                                             |
| Play developer account ID | `9159017327869935398`                                                                                                                         |
| Play Console app ID       | `4976322750310085419`                                                                                                                         |
| App support/privacy email | `infernalbuldog@gmail.com`                                                                                                                    |
| Distribution              | United States only                                                                                                                            |
| Target audience           | Ages 16-17 and 18+ only                                                                                                                       |
| Ads                       | None                                                                                                                                          |
| App account               | None; the app is local-first                                                                                                                  |
| Subscription              | Infernal Codex Pro, monthly only, base US price $4.99/month                                                                                   |
| Pro allowance             | 10 AI credits per UTC day; standard AI costs 1, PDF import costs 5                                                                            |
| AI reports                | Exact flagged AI output only, plus the selected category, optional comment, feature/model metadata, timestamp, and hashed customer identifier |

## First: restore the locked Google account

Do not create another Play developer account to work around the lock. A second account can complicate developer verification or look like an attempt to bypass an enforcement action. Use only Google's official recovery and appeal routes.

- [x] On the computer, browser profile, and normal internet connection previously used for this account, open [Google Account sign-in](https://accounts.google.com/).
- [x] Enter the locked developer-account email address. Do not substitute the public support email unless it is also the actual account owner email.
- [x] Read the exact explanation Google displays.
- [x] If the entire Google Account is disabled, select **Start Appeal** and follow [Google's disabled-account instructions](https://support.google.com/accounts/answer/40695).
- [x] If the Google Account works but Play Console says the **developer account** is restricted or terminated, use the appeal link in Google's enforcement email. Do not use the general Google Account appeal for a Play-only enforcement action.
- [x] If the appeal link is unavailable or broken, use [Google Play Developer Support](https://support.google.com/googleplay/android-developer/answer/10357403) and quote developer account ID `9159017327869935398`.
- [x] Save the appeal confirmation and case number somewhere private.
- [x] Wait for Google to restore access before attempting the five Console tasks.

Suggested appeal wording, edited only where necessary so every statement remains true:

```text
I am the human owner of this Google account and the associated Google Play
developer account. I created and use the account to publish my Android app,
Infernal Codex (package com.infernalbulldog.dmassistant; Play developer account
ID 9159017327869935398). The account was not created or operated by a bot.

I am currently preparing accurate privacy, app-access, target-audience,
Data Safety, and store-listing declarations for closed testing. Please perform
a manual review and restore access. I can verify my identity and ownership
through the account's official recovery methods.
```

Security rules during recovery:

- Use only pages on `accounts.google.com` or `support.google.com`, plus links in authentic Google notices.
- Google Play says genuine Play communications come from an address ending in `@google.com`.
- Never send a password, passkey, recovery code, RevenueCat secret, Cloudflare secret, or service-account JSON in an appeal, screenshot, Markdown file, Git commit, or chat.
- Do not submit several contradictory appeals. Keep one clear case history.

## Before opening the five tasks

- [x] Sign in at [Google Play Console](https://play.google.com/console/).
- [x] Select the developer account containing **Infernal Codex**.
- [x] Select **Infernal Codex** and confirm the package is `com.infernalbulldog.dmassistant`.
- [x] Open **Dashboard** and locate the **Set up your app** section.
- [x] Confirm it shows the same five incomplete tasks listed below. If the names or number differ, stop and take a screenshot without secrets; do not guess.
- [x] Keep this guide open in another window.

## Step 1 of 5: Set the privacy policy

Approved public URL:

```text
https://joshcookwv.github.io/dm-assistant-mobile/privacy/
```

- [x] From the dashboard, select **Set privacy policy**. If that shortcut is missing, use **Policy and programs > App content > Privacy policy**.
- [x] Select **Start** or **Manage**, depending on the label shown.
- [x] Paste the exact HTTPS URL above into the privacy-policy field.
- [x] Do not use a GitHub repository URL, local file, PDF, issue page, or the licensing URL.
- [x] Open the URL in a separate private/incognito window and verify that the page is public, is titled **Privacy Policy**, names **Infernal Codex**, and shows `infernalbuldog@gmail.com`.
- [x] Return to Play Console and select **Save**.
- [x] Return to **App content** or the dashboard and confirm **Privacy policy** shows **Completed** or a green check.

Completion evidence to keep:

- [x] Screenshot the completed Privacy policy row. The public URL may be visible; no private credential should be visible.

## Step 2 of 5: Provide sign-in details / App access

This answer must be truthful: the app has no user account or ordinary sign-in, but some functionality is behind the Pro subscription. Google specifically requires free reviewer access to subscription-paywalled functionality.

### Required prerequisite

The private reviewer access code must already be active in RevenueCat and tested in a production-configured build. It must be reusable, valid from any location, and require no one-time password.

**Do not invent a code. Do not paste a RevenueCat API key. Do not submit this task with an untested code.** If Codex has not yet given you the verified private reviewer access code, save this form as a draft and return to Codex. This is the only one of the five tasks that cannot be accurately finalized before RevenueCat reviewer access exists.

- [ ] From the dashboard, select **Sign in details**. If needed, use **Policy and programs > App content > App access**.
- [ ] Select **All or some functionality is restricted**.
- [ ] Select **Add instructions** or the equivalent control.
- [ ] For the instruction name, enter:

```text
Infernal Codex Pro reviewer access
```

- [ ] If Play Console provides a username/email/phone field, place the verified private reviewer access code there. The app treats this single value as its access code.
- [ ] Leave an optional password field empty. If the Console requires text in that field, enter `N/A - single access code; see instructions`. Never put the developer's Google password there.
- [ ] Paste the following into the access-instructions field, replacing only the bracketed line with the verified private code:

```text
Infernal Codex does not require an app account, username, password, or OTP.
Free functionality is available immediately after launch.

To review all Infernal Codex Pro functionality without payment:
1. Launch the app. If onboarding appears, tap Skip.
2. Open the navigation menu from the upper-left corner.
3. Tap Settings.
4. Tap View Infernal Codex Pro.
5. Scroll to the bottom and tap App review access.
6. Enter this reusable review access code: [PASTE VERIFIED PRIVATE CODE HERE]
7. Tap Activate review access.
8. Confirm the Pro screen shows PRO ACTIVE.

The code is intended only for authorized Google Play review, is valid from any
location, does not expire during review, requires no one-time code, and grants
full Pro access without a purchase. An internet connection is required for
entitlement verification and AI features.
```

- [ ] Re-read the pasted text and make sure no bracketed placeholder remains.
- [ ] Make sure the code is the reviewer identifier, not a RevenueCat public or secret API key.
- [ ] Select **Save**.
- [ ] Return to **App content** or the dashboard and confirm **App access** or **Sign in details** shows **Completed**.

Completion evidence to keep:

- [ ] Screenshot only the completed row. Do **not** screenshot or share the page containing the reviewer code.

Official reference: [Google Play requirements for sign-in details and subscription-paywalled content](https://support.google.com/googleplay/android-developer/answer/15748846).

## Step 3 of 5: Set the target audience

- [x] From the dashboard, select **Target audience**. If needed, use **Policy and programs > App content > Target audience and content**.
- [x] Select **Start** or **Manage**.
- [x] On the target-age-groups page, select only:
  - [x] **Ages 16-17**
  - [x] **Ages 18 and over**
- [x] Confirm every younger group is unselected, including **Ages 13-15**.
- [x] Continue to the question about children or whether the store listing could appeal to children.
- [x] Answer that the app is **not designed for children** / **No**, using the wording shown by the Console.
- [x] Do not opt into Designed for Families.
- [x] Do not enable an 18-only minor restriction: the approved audience intentionally includes ages 16-17.
- [x] Review the summary and confirm it shows only **16-17** and **18+**.
- [x] Select **Save** or **Submit**.
- [x] Return to **App content** or the dashboard and confirm **Target audience and content** shows **Completed**.

Completion evidence to keep:

- [x] Screenshot the final age-group summary and the completed row.

Official reference: [Manage target audience and app content settings](https://support.google.com/googleplay/android-developer/answer/9867159).

## Step 4 of 5: Complete Data Safety

The app is local-first, but the correct top-level answer is still **Yes** because optional AI requests, purchase verification, SDK identifiers, and AI-output reports transmit some data off the device. Google treats SDK transmission as collection.

### Page A: Overview

- [x] From the dashboard, select **Data safety**. If needed, use **Policy and programs > App content > Data safety**.
- [x] Select **Start** or **Manage**.
- [x] Read the overview and select **Next**.

### Page B: Data collection and security

Enter these answers:

| Console question                                             | Answer  |
| ------------------------------------------------------------ | ------- |
| Does your app collect or share any required user-data types? | **Yes** |
| Is all collected user data encrypted in transit?             | **Yes** |
| Do you provide a way for users to request deletion?          | **Yes** |
| Does the app allow users to create an account?               | **No**  |

Deletion requests go to:

```text
infernalbuldog@gmail.com
```

The public explanation is already in the privacy policy. Users can delete local app records or uninstall the app; they can email the address above about unexpired Cloudflare AI-output reports or RevenueCat-related records.

- [x] If the form asks about an independent security review, do not claim one; select **No** or leave that optional certification unselected.
- [x] Select **Next**.

### Page C: Data types

Select exactly these five types unless the Console presents new information from a newly uploaded SDK or bundle:

- [x] **Financial info > Purchase history**
- [x] **App activity > Other user-generated content**
- [x] **App activity > App interactions**
- [x] **Files and docs > Files and docs**
- [x] **Device or other IDs > Device or other IDs**

Do not select payment information, precise location, contacts, health information, browsing history, photos/videos, audio, or messages. Google Play handles the payment card; Infernal Codex does not receive it. A user-selected map image remains local unless the user exports a backup to a destination they choose.

- [x] Select **Next**.

### Page D: Data usage and handling

For each selected type, select **Start** and enter the following. In this table, **Collected only** means select **Collected** and leave **Shared** unselected. RevenueCat, Cloudflare, and Anthropic are used as service providers; data is not sold.

| Data type                    | Collected/shared   | Ephemeral processing | Required or optional                                                                          | Purposes to select                                                                   |
| ---------------------------- | ------------------ | -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Purchase history             | **Collected only** | **No**               | **Optional**; users choose whether to subscribe                                               | **App functionality**; **Fraud prevention, security, and compliance**                |
| Device or other IDs          | **Collected only** | **No**               | **Required**; the anonymous RevenueCat identifier is created for entitlement/restore handling | **App functionality**; **Fraud prevention, security, and compliance**                |
| Other user-generated content | **Collected only** | **No**               | **Optional**; sent only when the user deliberately invokes AI or reports an output            | **App functionality**; **Fraud prevention, security, and compliance**                |
| Files and docs               | **Collected only** | **No**               | **Optional**; only a PDF deliberately selected for Pro import                                 | **App functionality**                                                                |
| App interactions             | **Collected only** | **No**               | **Optional**; associated with deliberate AI use or AI-output reporting                        | **App functionality**; **Analytics**; **Fraud prevention, security, and compliance** |

Important interpretation notes:

- **Not shared** does not mean no service processes the data. It means the standard service-provider handling is being declared under Google's sharing exceptions. RevenueCat verifies entitlements, Cloudflare runs the proxy/quota/report service, and Anthropic processes AI requests.

- **No** for ephemeral processing is the conservative answer because RevenueCat retains purchase records, Anthropic may retain API inputs/outputs for up to 30 days under its standard API terms, and flagged AI-output reports are retained in Cloudflare D1 for 30 days.

- **Analytics** applies only to aggregate AI request/token/error counts used to measure reliability and cost. The app has no advertising SDK, behavioral analytics, or cross-app tracking.

- Ordinary campaigns, NPCs, notes, encounters, maps, monsters, sessions, preferences, and backups otherwise remain on the device or go only to a destination the user chooses.

- [x] Confirm no purpose for advertising, marketing, personalization, or developer communications is selected.

- [x] Confirm no data type is marked sold.

- [x] Confirm all five selected types have a completed status.

- [x] Select **Next**.

### Page E: Preview and submit

- [x] Review the store-listing preview.
- [x] Confirm it says data is encrypted in transit and deletion can be requested.
- [x] Confirm it does not say the app sells data or uses data for advertising.
- [x] Select **Submit**. Do not stop at **Save as draft**.
- [x] Return to **App content** or the dashboard and confirm **Data safety** shows **Completed** or **Submitted**.

If Play Console reports a contradiction, do not change answers at random. Save as draft, take a screenshot of the warning without secrets, and return to Codex.

Completion evidence to keep:

- [x] Screenshot the completed Data Safety row and the non-sensitive store-listing preview.

Official reference: [Provide information for Google Play's Data Safety section](https://support.google.com/googleplay/android-developer/answer/10787469).

## Step 5 of 5: Set up the main store listing

From the dashboard, select **Set up your store listing**. If the shortcut is missing, use **Grow users > Store presence > Main store listing**.

### Store-listing text

- [x] Confirm the default language is **English (United States) - en-US**.
- [x] Enter the app name:

```text
Infernal Codex
```

- [x] Enter the short description:

```text
Offline D&D 5e rules, NPCs, encounters, and AI prep tools — no PC needed.
```

- [x] Enter the full description exactly as plain text:

```text
A private, standalone toolkit for running D&D 5e — entirely on your phone.

Infernal Codex puts your campaign prep in one place instead of ten browser tabs: a full offline SRD rules reference, a combat tracker that keeps up with the table, and optional Pro AI assistance that only runs when you ask it to.

Your campaign library lives on your device. There's no Infernal Codex account, no cloud sync, no ads, and no telemetry. Pro AI sends only the content needed for the tool you choose through a secure shared proxy for processing.

Features:
• Rules — spells, conditions, classes, species, feats, backgrounds, magic items, equipment, weapons, and armor from the D&D 5e SRD (2014 and 2024 rulesets), plus dozens of third-party sourcebooks — all bundled with the app and readable with no internet connection, plus a combat quick-reference page for the table.
• Monsters — official SRD creatures and your own homebrew in one searchable list, filterable to Official or Homebrew, searchable by name or challenge rating.
• NPCs — track name, race, role, location, and notes, with optional AI-suggested names and descriptions.
• Notes — searchable markdown campaign notes.
• Campaigns — the free plan includes one persistent campaign with a party roster, locations, sessions, and linked notes. Pro unlocks unlimited campaigns.
• One-Shot Encounters — a live combat tracker for quick, unlinked fights: initiative order, HP, AC, and conditions, built from official monsters, your own homebrew, or custom combatants.
• Maps — attach images from your photo library or link out to maps hosted elsewhere.
• Pro AI — generate NPC names and descriptions, campaign summaries, and session summaries through the shared proxy.
• Pro PDF import — point it at a sourcebook or homebrew PDF and Claude pulls out NPCs, stat blocks, and rules text for you to review before anything saves.
• Backup & restore — export everything to one file via the share sheet; restore it on a new phone.

Start free with one campaign and every non-AI tool. Upgrade to Infernal Codex Pro for unlimited campaigns and all shared AI features.
```

### Graphics

All paths below are relative to the repository root `D:\Claude\projects\dm-assistant-mobile`.

- [x] Upload the **App icon** from `docs/store-assets/app-icon-512.png`. Verified size: 512 x 512 PNG.
- [x] Upload the **Feature graphic** from `docs/store-assets/feature-graphic.jpg`. Verified size: 1024 x 500 JPEG. Use the JPEG for this slot.
- [x] Upload all eight **Phone screenshots** in this order:
  1. `docs/store-screenshots/phone-2026-08-10/01-dashboard.png`
  2. `docs/store-screenshots/phone-2026-08-10/02-campaign-overview.png`
  3. `docs/store-screenshots/phone-2026-08-10/03-session-recap.png`
  4. `docs/store-screenshots/phone-2026-08-10/04-npc-ai-tools.png`
  5. `docs/store-screenshots/phone-2026-08-10/05-searchable-notes.png`
  6. `docs/store-screenshots/phone-2026-08-10/06-encounter-runner.png`
  7. `docs/store-screenshots/phone-2026-08-10/07-offline-rules.png`
  8. `docs/store-screenshots/phone-2026-08-10/08-monster-bestiary.png`
- [x] Upload all four **7-inch tablet screenshots** in this order:
  1. `docs/store-screenshots/tablet-7-2026-08-10/01-dashboard.png`
  2. `docs/store-screenshots/tablet-7-2026-08-10/02-campaign.png`
  3. `docs/store-screenshots/tablet-7-2026-08-10/03-encounter.png`
  4. `docs/store-screenshots/tablet-7-2026-08-10/04-rules.png`
- [x] Upload all four **10-inch tablet screenshots** in this order:
  1. `docs/store-screenshots/tablet-10-2026-08-10/01-dashboard.png`
  2. `docs/store-screenshots/tablet-10-2026-08-10/02-campaign.png`
  3. `docs/store-screenshots/tablet-10-2026-08-10/03-encounter.png`
  4. `docs/store-screenshots/tablet-10-2026-08-10/04-rules.png`
- [x] Do not upload anything from the older `docs/screenshots/` directory.
- [x] If Play asks for alt text, describe the visible screen plainly; do not add pricing, rankings, awards, or promotional claims that are not shown.

### App category and contact details

These fields may appear under **Grow users > Store presence > Store settings** instead of Main store listing.

- [x] App or game: **App**
- [x] Category: **Tools**
- [x] Tags: leave unchanged if already set; do not guess optional tags.
- [x] Store-listing contact email:

```text
infernalbuldog@gmail.com
```

- [x] Website/support URL:

```text
https://joshcookwv.github.io/dm-assistant-mobile/
```

- [x] Save the Store settings page if you changed it.
- [x] Return to Main store listing, review every field, and select **Save**.
- [x] Confirm there is no unsaved-changes banner and no red required-field error.
- [x] Return to the dashboard and confirm **Set up your store listing** shows **Completed**.

Completion evidence to keep:

- [x] Screenshot the completed store-listing task and the top of the saved listing. Do not include private account or payment information.

Official reference: [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151).

## Addendum: three additional tasks discovered August 11, 2026 (later same day)

Two screenshots (`docs/store-assets/Completed-Publishing-Overview.png`, `docs/store-assets/Content-Rating.png`) captured after this guide was first written show the Play Console **Publishing overview** listing three additional pending items that are not covered by the five steps above, and the **Send app for review** button disabled until they (and everything above) are resolved:

- **Content Rating** — "Submit new questionnaire" (Policy and programs > App content > Content ratings). This is the IARC ratings questionnaire and is separate from Target audience and content.
- **Ads declaration** — "Update ads declaration" (Policy and programs > App content > Ads).
- **Health apps** — "Complete Health apps declaration" (Policy and programs > App content > Health apps, or wherever Play currently surfaces it).

Draft guidance based on the app's actual behavior (confirm the exact on-screen wording before answering, per the fallback table below):

- **Ads declaration**: Infernal Codex contains **no ads**. Select "No, my app does not contain ads."
- **Health apps declaration**: Infernal Codex is a D&D campaign-management/rules-reference tool, not a health or fitness app. Answer that it is **not a health app** if that option exists, or decline every listed health-app category.
- **Content Rating questionnaire**: Answer truthfully for a text-based tabletop-RPG reference/combat-tracker app:
  - Violence: fantasy/cartoon-style textual violence only (monster stat blocks, HP/damage tracking in the combat tracker); no realistic or graphic depictions.
  - Sexual content, nudity, profanity: none intentionally included; SRD 5.1/5.2 content does not contain any.
  - Controlled substances (alcohol/drugs/tobacco): none intentionally featured; do not claim references if unsure — leave unselected unless the questionnaire's definition clearly applies to incidental fantasy flavor text.
  - Gambling / simulated gambling: none.
  - User-generated content shared with or visible to other users: **no** — NPCs, notes, and campaigns are local to the device (optional AI calls go only to the app's own proxy, not to other users).
  - Location sharing, personal info collection, unrestricted internet/social interaction with strangers: no.
  - In-app purchases / digital goods: **yes** — the Infernal Codex Pro monthly subscription.
  - This questionnaire typically yields a Teen-range rating given fantasy violence; that is consistent with the already-approved 16-17/18+ target audience and does not require changing that setting.
- Submit the questionnaire (do not just save as draft) once answers are confirmed correct, then confirm the row shows completed.

If any question's exact wording or available options do not match this description, do not guess: save as draft, take a non-sensitive screenshot, and return it to Codex/Claude before submitting.

## Final verification and hand-back

- [x] Return to the Infernal Codex dashboard.
- [x] Confirm the app is still `com.infernalbulldog.dmassistant`.
- [x] Confirm **Set up your app** now shows **13 of 13 tasks complete**.
- [x] Confirm these five rows are complete:
  - [x] Privacy policy
  - [x] Sign in details / App access
  - [x] Target audience and content
  - [x] Data Safety
  - [x] Main store listing
- [x] Take one screenshot showing **13 of 13** without exposing the reviewer code or account-recovery details.
- [x] Stop. Do not create a production release, upload an old AAB, start production rollout, add countries other than the United States, or invent tester addresses.
- [x] Return to Codex with: `The five Play Console setup tasks are complete and the dashboard shows 13 of 13.` Include the non-sensitive dashboard screenshot and describe any warnings.

## If something does not match this guide

| Problem                                       | Safe action                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Google still says the account is disabled     | Continue the existing official appeal; do not create a replacement developer account.                                      |
| Play Console asks for passkey verification    | Complete it yourself on the trusted device. Never share the passkey prompt, PIN, recovery code, or credential.             |
| Reviewer code has not been created and tested | Save App access as draft and return to Codex. Do not make up a code or claim all functionality is unrestricted.            |
| A required question has different wording     | Match the meaning in this guide. If the meaning is unclear, save as draft and take a non-sensitive screenshot for Codex.   |
| Data Safety shows a contradiction             | Do not randomly change disclosures. Save as draft and return the exact warning to Codex.                                   |
| A graphic is rejected                         | Confirm that the exact listed file was selected. Keep the rejection message and return it to Codex.                        |
| The dashboard does not reach 13 of 13         | Note which task remains incomplete and open it once to find the red validation message; then return that message to Codex. |
