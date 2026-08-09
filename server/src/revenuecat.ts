const REVENUECAT_API_URL = "https://api.revenuecat.com/v1";

/** Must match the entitlement identifier configured in the RevenueCat project (see server/README.md). */
const PREMIUM_ENTITLEMENT_ID = "premium";

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, { expires_date: string | null }>;
  };
}

/**
 * Server-side entitlement check — the client never gets to assert its own
 * premium status. RevenueCat is the single source of truth for both the
 * client's useEntitlement() and this check, so there's nothing else to keep
 * in sync.
 */
export async function isPremiumEntitled(secretKey: string, appUserId: string): Promise<boolean> {
  const res = await fetch(`${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (res.status === 404) return false; // unknown subscriber — never purchased anything
  if (!res.ok) {
    throw new Error(`RevenueCat lookup failed (HTTP ${res.status})`);
  }

  const body = (await res.json()) as RevenueCatSubscriberResponse;
  const entitlement = body.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT_ID];
  if (!entitlement) return false;
  if (entitlement.expires_date === null) return true; // non-expiring (e.g. lifetime) grant
  return new Date(entitlement.expires_date).getTime() > Date.now();
}
