import { getDb } from "./db";

const USE_SHARED_AI_KEY = "use_shared_ai";

/**
 * Opt-in gate for the shared AI proxy Worker, default off (Josh's addendum
 * to docs/cloudflare-backend-plan.md, added mid-build). Unlike
 * onboarding_completed's presence-means-true convention, this needs a real
 * on/off value since the user can flip it back off, so it's stored as an
 * explicit "1"/"0" and checked with strict equality — Boolean(getSetting(...))
 * would be wrong here, since a stored "0" is still a non-empty (truthy)
 * string.
 *
 * !!! DO NOT SHIP TO THE PLAY STORE AS-IS !!! This is deliberately just an
 * open, unentitled dev-testing switch for Phase 1 — anyone can flip it on
 * for free, no purchase/subscription check of any kind. Per
 * docs/cloudflare-backend-plan.md's Addendum 2 (RevenueCat phase, sequenced
 * after this one), the shared proxy is meant to be paid-tier-only with zero
 * free access to any AI feature — this toggle is a placeholder standing in
 * for a real entitlement check that Phase 2 must add before any public
 * release. If you're touching this file for Phase 2, replace the plain
 * boolean read here with an actual subscription-status check.
 */
export function getUseSharedAi(): boolean {
  return getSetting(USE_SHARED_AI_KEY) === "1";
}

export function setUseSharedAi(value: boolean): void {
  setSetting(USE_SHARED_AI_KEY, value ? "1" : "0");
}

export function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
