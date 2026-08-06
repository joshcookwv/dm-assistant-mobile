# DM Assistant UI Refresh

## Direction

The visual system is built around the app logo: an obsidian base, layered charcoal surfaces,
and focused ember accents. The interface should feel like a modern campaign command center,
not a themed parchment character sheet. The logo supplies personality while the working UI
stays clean, fast, and readable at the table.

## Design principles

- Use ember orange for priority and state, not for every border or label.
- Build hierarchy with three dark surface levels rather than heavy shadows.
- Prefer native cross-platform symbols over emoji so Android, iOS, and web look consistent.
- Keep primary actions full-width and easy to hit one-handed.
- Use rounded 12-24 px geometry consistently across controls, cards, and feature panels.
- Preserve high information density in encounter screens while giving setup screens more air.
- Keep all existing data, AI, import, and combat behavior unchanged.

## Foundation tokens

| Role | Value |
| --- | --- |
| Canvas | `#0b0706` |
| Surface | `#17100d` |
| Raised surface | `#211510` |
| Border | `#40271d` |
| Primary ember | `#ff6b1a` |
| Ember highlight | `#ff9a4a` |
| Primary text | `#fff5ed` |
| Secondary text | `#c4a79d` |

## Pass 1

- Branded drawer header and native-symbol navigation
- Rebuilt dashboard hero, metrics, recent notes, and tool grid
- Rebuilt Rules hub and quick-reference entry point
- Shared cross-platform icon wrapper
- Shared primary action button
- Modern search, form-field, empty-state, and entity-list components
- Logo-aligned application and navigation colors

## Pass 2

- Unified card treatment across NPCs, Notes, Encounters, Maps, Sessions, and Rules results
- Contextual icons, status badges, and richer metadata on saved entities
- Rebuilt monster cards with clear official/homebrew distinction and compact combat stats
- Modern filter chips for All, Official, and Homebrew views
- Rebuilt expandable sourcebook selector with accessible checked states
- Contextual empty states for searches and first-use screens
- Improved session-prep explanation and ready-count badges
- Removed remaining emoji from Maps list rows

## Pass 3

- Grouped NPC, Note, Map, homebrew Monster, and session-member editors into clear task-focused sections
- Added a reusable form-section card with contextual native icons and supporting descriptions
- Replaced compact inline actions with consistent full-width save and destructive actions
- Rebuilt delete confirmation as an explicit, touch-friendly warning panel
- Updated save confirmation to match the ember visual system and removed text-symbol icon fallbacks
- Added mobile-friendly two-column combat fields in place of cramped three- and four-column rows
- Rebuilt map source selection with visual image/link choices, previews, and a consistent secondary action
- Refined NPC AI suggestion controls into compact branded pills while preserving existing AI behavior

## Pass 4

- Rebuilt the encounter runner around a single round, active-turn, and autosave command panel
- Added prominent previous/next turn actions with the current combatant and initiative always visible
- Redesigned combatant cards with active-turn emphasis, PC/enemy badges, HP status and progress,
  compact damage/healing controls, editable AC, initiative, names, and conditions
- Added explicit healthy, bloodied, and down states without changing encounter calculations
- Reorganized combatant creation into bestiary, prepared-session, and expandable custom-entry paths
- Rebuilt the monster picker with modern search results, homebrew labeling, combat stats, and multi-add feedback
- Rebuilt the session picker with clear roster counts and touch-friendly session cards
- Removed text-symbol and emoji controls from the encounter workflow in favor of native icons

## Next passes

1. Import and settings: progress/status language, secret-field treatment, and clearer feature setup.
2. Accessibility polish: large-text stress test, contrast review, reduced-motion behavior, and touch
   target audit.

## Preview note

The native dev client remains the authoritative preview. Expo SQLite 56's synchronous API times
out in the browser even after the documented WebAssembly and cross-origin headers are configured,
so a browser-only visual preview would require either a mock data adapter or an async database
migration. That work is intentionally outside this visual refresh.
