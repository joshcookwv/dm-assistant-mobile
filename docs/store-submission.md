# Store submission plan

Status: **not yet submitted anywhere.** This document is a working checklist plus draft listing copy — everything in the "Draft listing" section is meant to be edited before it goes live.

## 1. Platform order

**Recommendation: Google Play first, App Store later.**

- Play Store: one-time $25 registration fee, builds happen in EAS's cloud with no Mac needed, review is typically hours to ~2 days for a new developer account.
- App Store: requires an active Apple Developer Program membership ($99/**year**, recurring), and while EAS can build iOS in the cloud without a Mac, TestFlight/App Store Connect setup and screenshots still need to happen through Apple's tooling. Review is typically 1–3 days but first-time developer accounts sometimes see extra scrutiny.

Since there's no iOS build yet at all (see README), doing Android first gets something live faster and de-risks the listing/policy work before paying for the Apple side.

## 2. Before building for production

- [ ] Switch from the `development` EAS build profile (dev-client, ~243MB, needs a Metro connection) to `production` (`eas.json` already has this profile — it strips dev-client tooling and produces a real release build, likely well under 100MB even with the bundled SRD data).
- [ ] Decide on versioning: `eas.json` already sets `"appVersionSource": "remote"` and `production.autoIncrement: true`, so EAS manages the build number automatically — just bump `"version"` in `app.json` for user-facing releases (currently `1.0.0`).
- [ ] Let EAS manage the Android signing keystore (default behavior, `eas build --profile production --platform android`) unless there's a reason to supply your own.
- [ ] Test the actual production build on-device before submitting — dev and production builds can behave differently (this project in particular: PDF import only started working under a real dev-client build vs. Expo Go, so don't assume production behaves identically to the development build without checking).

## 3. Required before Play Store will accept the listing

- [ ] **Privacy policy URL.** Mandatory even though this app collects no analytics/telemetry and has no backend — Play Console requires a reachable policy page regardless. See the draft at the bottom of this doc; host it somewhere public (a GitHub Pages page off this repo works, or any static host) and put the URL in Play Console's "App content" → "Privacy policy" field.
- [ ] **Data safety form** (Play Console → App content → Data safety). Draft answers:
  - Does your app collect or share user data? **Yes** — campaign content (NPC names/details, PDF contents) is sent to Anthropic's API, but *only* when the user actively taps an AI feature and *only* after the user supplies their own API key.
  - Data collected: none stored or transmitted by the app's own servers (it has none). Third-party sharing: user-initiated content sent to Anthropic when AI features are used.
  - Is data encrypted in transit? Yes (HTTPS to Anthropic).
  - Can users request data deletion? N/A — nothing is stored outside the user's own device; uninstalling the app deletes everything.
- [ ] **Content rating questionnaire** (IARC, via Play Console). Expect a **Teen** rating (fantasy violence references in monster stat blocks/combat descriptions) — answer honestly; this is a standard TTRPG-content rating, not a red flag.
- [ ] **Target audience & content**: mark as not directed at children (13+ is the realistic floor given D&D content).
- [ ] **App icon** for the store listing: 512×512 PNG, 32-bit with alpha. The in-app icon (`assets/images/icon.png`) is 1024×1024 and can be downscaled.
- [ ] **Feature graphic**: 1024×500 PNG/JPG, shown at the top of the store listing — not yet made.
- [ ] **Screenshots**: minimum 2, Play Store recommends 4–8. Phone screenshots need to be actual device captures (not simulator chrome) at a minimum 320px, max 3840px on the longest side. Previous captures were removed after the D20-logo/dark-ember rebrand made them stale (old amber theme, separate Bestiary/Session tabs) — needs a fresh set from the current build, same folder (`docs/screenshots/`), same set doubling as the README's showcase images.
- [ ] **Short description**: max 80 characters.
- [ ] **Full description**: max 4000 characters.

## 4. Known gaps to resolve before submitting (not just before it "looks nice")

- [ ] iOS build doesn't exist yet — out of scope for a Play Store submission, but blocks any App Store submission.
- [x] `production`-profile build succeeded (outputs an `.aab`, the Play Store submission format — not directly installable). A `preview`-profile build (same stripped-down non-dev-client code, but an installable `.apk`) has been built for on-device testing after each major change, most recently post-rebrand/UI-refresh — see [`builds/dm-assistant-mobile-v1.0.0-preview.apk`](../builds/). **Still pending:** a multi-day on-device pass through every feature on that standalone build before it's considered store-ready.
- [ ] Screenshots — see section 3 above; pending re-capture after the rebrand.
- [ ] Confirm the bundled SRD content's licensing (OGL/CC via Open5e) is compatible with distribution inside a store-listed app, not just a source repo — the original web app's README asserts this is fine since "no SRD content is included in this repository itself" (fetched at setup time), but this mobile app **does** bundle the SRD data directly inside the app package (`assets/srd/`) rather than fetching it at runtime. Worth a deliberate read of the OGL 1.0a / CC-BY-4.0 terms for redistribution-inside-a-binary before submitting, even though this is very likely fine (this is exactly what Open5e's license grants are for) — flagging it as a real "read it, don't just assume" item rather than glossing over it.
- [ ] Decide what happens to the currently-installed `com.joshcook.dmassistant` dev-client build on your test device — it's now a different package than the renamed `com.infernalbulldog.dmassistant`, so it's an orphaned install you can uninstall whenever.

## Screenshot preview

_Pending — old captures were removed after the rebrand (see section 3). Re-add this table once fresh screenshots exist in `docs/screenshots/`._

## 5. Draft listing copy

Everything below is a first draft for you to edit, not final copy.

### App name
DM Assistant

### Short description (≤80 chars)
> Offline D&D 5e rules, NPCs, encounters, and AI prep tools — no PC needed.

*(79 characters)*

### Full description (≤4000 chars)

> **A private, standalone toolkit for running D&D 5e — entirely on your phone.**
>
> DM Assistant puts your campaign prep in one place instead of ten browser tabs: a full offline SRD rules reference, a combat tracker that keeps up with the table, and optional AI assistance that only runs when you ask it to.
>
> Everything lives on your device. There's no account, no cloud sync, and no telemetry — your campaign never leaves your phone unless you choose to use an AI feature, which requires your own Claude API key.
>
> **Features:**
> • Rules — spells, conditions, classes, species, feats, backgrounds, magic items, equipment, weapons, and armor from the D&D 5e SRD (2014 and 2024 rulesets), plus dozens of third-party sourcebooks — all bundled with the app and readable with no internet connection, plus a combat quick-reference page for the table.
> • Monsters — official SRD creatures and your own homebrew in one searchable list, filterable to Official or Homebrew, searchable by name or challenge rating.
> • NPCs — track name, race, role, location, and notes, with optional AI-suggested names and descriptions.
> • Notes — searchable markdown campaign notes.
> • Session — stage PCs and monsters ahead of game night across any number of named sessions, then drop a full roster into an encounter in one tap.
> • Encounters — a live combat tracker: initiative order, HP, AC, and conditions, built from a prepared session, official monsters, or your own homebrew.
> • Maps — attach images from your photo library or link out to maps hosted elsewhere.
> • PDF import — point it at a sourcebook or homebrew PDF and Claude reads it directly, pulling out NPCs, stat blocks, and rules text for you to review before anything saves.
>
> Bring your own Claude API key (optional, from console.anthropic.com) to unlock the AI features. Everything else works with zero configuration.

### Category
Tools, or Entertainment (Play Console offers both — Tools fits the "utility app" framing better than Entertainment/Games, since this isn't itself a game)

### Tags/keywords (not a formal Play Store field, but useful for the description/ASO)
D&D, Dungeons and Dragons, 5e, DM tools, tabletop RPG, dungeon master, TTRPG, combat tracker, SRD

## 6. Privacy policy draft

Host this text (or a refined version of it) at a public URL and link it from Play Console.

> **Privacy Policy — DM Assistant**
>
> DM Assistant does not collect, store, or transmit any personal data to its developer. All campaign data — NPCs, notes, encounters, maps, sessions, and your homebrew monsters — is stored locally on your device and never leaves it.
>
> **AI features (optional).** If you choose to add a Claude API key in Settings and use an AI-assisted feature (NPC suggestions or PDF import), the relevant content (e.g. an NPC's name/race/role, or a PDF's contents) is sent directly from your device to Anthropic's API (anthropic.com) to generate a response. Your API key is stored only in your device's secure keychain. See Anthropic's own privacy policy for how they handle that data: https://www.anthropic.com/legal/privacy
>
> **No analytics, no tracking, no ads.** This app contains no third-party analytics, advertising, or tracking SDKs of any kind.
>
> **Data deletion.** Since nothing is stored outside your device, uninstalling the app removes all app data. There is no account to delete.
>
> **Contact.** [add a contact email or GitHub issues link here before publishing]
