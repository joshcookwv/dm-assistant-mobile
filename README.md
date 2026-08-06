<div align="center">

# 🎲 DM Assistant — Mobile

**A standalone Android/iOS app for running D&D 5e games — rules, NPCs, notes, encounters, maps, and AI-assisted prep, entirely on your phone.**

[![Private](https://img.shields.io/badge/repo-private-red.svg)]()
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-56-black)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

</div>

---

A native mobile port of the DM Assistant desktop/web app — same idea, but no PC required. Everything runs on-device: local SQLite storage, a bundled offline SRD ruleset, and AI features that call Claude directly from your phone with your own API key. No server, no account, no cloud sync.

## Screenshots

<table>
<tr>
<td width="33%"><img src="docs/screenshots/Dashboard.jpg" alt="Dashboard" /><br/><sub>Dashboard — campaign command center, at-a-glance counts, recent notes</sub></td>
<td width="33%"><img src="docs/screenshots/Monster-2.jpg" alt="Monster detail" /><br/><sub>Monsters — official SRD stat blocks with art, alongside your homebrew</sub></td>
<td width="33%"><img src="docs/screenshots/Encounter-2.jpg" alt="Combat tracker" /><br/><sub>Encounters — live initiative, HP, and AC tracking, autosaving as you play</sub></td>
</tr>
<tr>
<td width="33%"><img src="docs/screenshots/NPC-2.jpg" alt="NPC with AI-suggested description" /><br/><sub>NPCs — AI-assisted name/description suggestions</sub></td>
<td width="33%"><img src="docs/screenshots/Session-2.jpg" alt="Prepared session roster" /><br/><sub>Session — stage PCs and monsters ahead of game night</sub></td>
<td width="33%"><img src="docs/screenshots/Rules.jpg" alt="Rules browser" /><br/><sub>Rules — offline SRD categories, browsable with no connection</sub></td>
</tr>
</table>

More captures (NPCs, Notes, Maps, PDF import, Settings) are in [`docs/screenshots/`](docs/screenshots/).

## Features

- 📖 **Rules** — spells, conditions, classes, species, feats, backgrounds, items, weapons, and armor from the D&D 5e SRD (2014 & 2024) plus ~20 third-party sourcebooks, bundled with the app and fully readable offline. Filter by source, plus a combat quick-reference page (actions, conditions, death saves, cover) for use at the table.
- 🐉 **Monsters** — official SRD creatures and your own homebrew in one searchable list, filterable to All / Official / Homebrew, searchable by name or challenge rating.
- 🎭 **NPCs** — name, race, role, location, tags, and freeform notes, with an on-device "Suggest with AI" for names and descriptions.
- 📝 **Notes** — markdown campaign notes with full-text search (SQLite FTS5).
- 🗓️ **Session** — stage PCs and monsters ahead of game night across any number of named sessions, then pull a whole roster into an encounter in one tap.
- ⚔️ **Encounters** — build combat from a prepared session, official SRD monsters, your own homebrew, or one-off custom combatants. Live initiative order, HP, AC, and condition tracking, autosaving as you play.
- 🗺️ **Maps** — attach map images from your photo library or save links to maps hosted elsewhere.
- 📄 **PDF import** — pick a sourcebook or homebrew PDF and Claude reads it directly (native PDF support, no local text extraction step) to pull out NPCs, monster stat blocks, and standalone rules. Nothing saves automatically — review and approve on a staging screen first.
- ⚙️ **Settings** — bring your own Claude API key, stored in your device's secure keychain (`expo-secure-store`). Fully optional; everything except AI-assisted features and PDF import works with zero configuration.

## Installing

Not on a store yet — see [`docs/store-submission.md`](docs/store-submission.md) for that plan. Two Android builds live in [`builds/`](builds/) (tracked via Git LFS):

- **`*-preview.apk`** — standalone, install and run on its own like any normal app, no computer needed. This is what you want for just trying it out.
- **`*-dev.apk`** — a development-client build for active coding on this repo. After installing it, run `npm install && npx expo start` and open the app — it connects to the dev server automatically over the same WiFi network.

**iOS:** no build yet.

## Your data

Everything — NPCs, notes, encounters, maps, your bestiary, your API key — lives entirely on your device: SQLite for structured data, your device's secure keychain for the API key, your device's own storage for map images. Nothing syncs anywhere; nothing is sent to any server except Anthropic's API, and only when you use an AI feature.

## Tech stack

| | |
|---|---|
| **Framework** | [Expo](https://expo.dev) / React Native (SDK 56, TypeScript, Expo Router) |
| **Database** | On-device SQLite via [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/) |
| **Rules data** | [Open5e v2 API](https://api.open5e.com/v2/) — official SRD (2014 + 2024) plus third-party sourcebooks, bundled as app assets |
| **AI** | [Claude API](https://www.anthropic.com/api), called directly from the device with prompt caching |
| **Styling** | [NativeWind](https://www.nativewind.dev/) (Tailwind for React Native) |
| **Secrets** | [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/) (OS keychain) |

## Project structure

```
src/
  app/            Expo Router screens (file-based routing)
  components/     Shared UI components
  lib/            Data layer (SQLite), AI client, SRD data loader
  constants/      Theme tokens, navigation option presets
  hooks/          Shared hooks (debounce, etc.)
assets/
  srd/            Bundled offline SRD rules data
  images/         App icon, splash screen, adaptive icon layers
builds/           Built APKs (Git LFS)
docs/             Screenshots, store submission plan
```

## License

Application source code is MIT licensed. D&D 5e rules content is fetched at build time from the [Open5e API](https://api.open5e.com) and is licensed separately by its original publishers under the Open Gaming License and/or Creative Commons.
