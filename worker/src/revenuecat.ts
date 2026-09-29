const REVENUECAT_API_BASE_URL = "https://api.revenuecat.com/v1";
const MAX_APP_USER_ID_LENGTH = 256;

export interface VerifiedCustomer {
  canonicalId: string;
  entitlementExpiresAt: string | null;
}

interface RevenueCatEnvironment {
  REVENUECAT_SECRET_API_KEY: string;
  REVENUECAT_ENTITLEMENT_ID: string;
  // Local-testing escape hatch only; never set this in production.
  ALLOW_SANDBOX_ENTITLEMENTS?: string;
}

interface RevenueCatEntitlement {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
}

interface RevenueCatSubscription {
  is_sandbox?: boolean;
  store?: string;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    original_app_user_id?: string;
    entitlements?: Record<string, RevenueCatEntitlement>;
    subscriptions?: Record<string, RevenueCatSubscription>;
  };
}

export class RevenueCatError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RevenueCatError";
  }
}

export function isConfiguredValue(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !trimmed.startsWith("REPLACE_");
}

function activeDatedWindow(value: string | null | undefined, now: number): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now ? value : "";
}

// Sandbox purchases (Play license testers, RevenueCat Test Store) are free, so
// they must never unlock Pro in production. Promotional grants, such as the
// Play reviewer account, are not sandbox and stay valid.
function isSandboxEntitlement(
  entitlement: RevenueCatEntitlement,
  subscriptions: Record<string, RevenueCatSubscription> | undefined
): boolean {
  const productId = entitlement.product_identifier;
  if (!productId) return false;
  return subscriptions?.[productId]?.is_sandbox === true;
}

export async function verifyEntitlement(
  appUserId: string,
  env: RevenueCatEnvironment
): Promise<VerifiedCustomer> {
  const normalizedId = appUserId.trim();
  if (!normalizedId || normalizedId.length > MAX_APP_USER_ID_LENGTH) {
    throw new RevenueCatError(
      "invalid_app_user_id",
      401,
      "RevenueCat app-user ID is required."
    );
  }
  if (
    !isConfiguredValue(env.REVENUECAT_SECRET_API_KEY) ||
    !isConfiguredValue(env.REVENUECAT_ENTITLEMENT_ID)
  ) {
    throw new RevenueCatError(
      "server_misconfigured",
      500,
      "Pro verification is not configured. Try again later."
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `${REVENUECAT_API_BASE_URL}/subscribers/${encodeURIComponent(normalizedId)}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${env.REVENUECAT_SECRET_API_KEY}`,
        },
      }
    );
  } catch {
    throw new RevenueCatError(
      "entitlement_unavailable",
      503,
      "Couldn't verify Pro access. Try again."
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new RevenueCatError(
      "entitlement_unavailable",
      503,
      "Couldn't verify Pro access. Try again."
    );
  }

  const body = await response.json<RevenueCatSubscriberResponse>();
  const subscriber = body.subscriber;
  const entitlement = subscriber?.entitlements?.[env.REVENUECAT_ENTITLEMENT_ID];
  const now = Date.now();
  const regular =
    entitlement?.expires_date === null
      ? null
      : activeDatedWindow(entitlement?.expires_date, now);
  const grace = activeDatedWindow(entitlement?.grace_period_expires_date, now);
  const activeExpiration = regular !== "" ? regular : grace;
  const sandboxBlocked =
    entitlement !== undefined &&
    env.ALLOW_SANDBOX_ENTITLEMENTS?.trim().toLowerCase() !== "true" &&
    isSandboxEntitlement(entitlement, subscriber?.subscriptions);
  if (!entitlement || activeExpiration === "" || sandboxBlocked) {
    throw new RevenueCatError(
      "pro_required",
      403,
      "Infernal Codex Pro is required for AI features."
    );
  }

  const canonicalId = subscriber?.original_app_user_id?.trim();
  if (!canonicalId) {
    throw new RevenueCatError(
      "entitlement_unavailable",
      503,
      "Couldn't verify Pro access. Try again."
    );
  }
  return { canonicalId, entitlementExpiresAt: activeExpiration };
}
