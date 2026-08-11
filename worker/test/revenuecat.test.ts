import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyEntitlement } from "../src/revenuecat";

const env = {
  REVENUECAT_SECRET_API_KEY: "test-secret",
  REVENUECAT_ENTITLEMENT_ID: "pro",
};

function customerResponse(options?: {
  originalId?: string;
  expiresDate?: string | null;
  graceDate?: string | null;
}): Response {
  return Response.json({
    request_date: "2026-08-11T12:00:00Z",
    request_date_ms: 1786464000000,
    subscriber: {
      entitlements: {
        pro: {
          expires_date: options?.expiresDate ?? "2026-09-11T12:00:00Z",
          grace_period_expires_date: options?.graceDate ?? null,
          product_identifier: "infernal_codex_pro:monthly",
          purchase_date: "2026-08-11T12:00:00Z",
        },
      },
      first_seen: "2026-08-11T12:00:00Z",
      last_seen: "2026-08-11T12:00:00Z",
      management_url: null,
      non_subscriptions: {},
      original_app_user_id: options?.originalId ?? "$RCAnonymousID:canonical",
      original_application_version: null,
      original_purchase_date: null,
      subscriptions: {},
    },
  });
}

describe("verifyEntitlement", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects an empty app user ID before making a request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(verifyEntitlement("", env)).rejects.toMatchObject({
      code: "invalid_app_user_id",
      status: 401,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns RevenueCat's canonical original customer ID for active access", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(customerResponse()));

    await expect(verifyEntitlement("alias-id", env)).resolves.toEqual({
      canonicalId: "$RCAnonymousID:canonical",
      entitlementExpiresAt: "2026-09-11T12:00:00Z",
    });
  });

  it("accepts an active grace period after the regular expiration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        customerResponse({
          expiresDate: "2026-08-10T12:00:00Z",
          graceDate: "2026-08-12T12:00:00Z",
        })
      )
    );

    await expect(verifyEntitlement("alias-id", env)).resolves.toMatchObject({
      canonicalId: "$RCAnonymousID:canonical",
      entitlementExpiresAt: "2026-08-12T12:00:00Z",
    });
  });

  it("rejects expired access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        customerResponse({
          expiresDate: "2026-08-10T12:00:00Z",
          graceDate: null,
        })
      )
    );

    await expect(verifyEntitlement("alias-id", env)).rejects.toMatchObject({
      code: "pro_required",
      status: 403,
    });
  });

  it("returns a stable unavailable error when RevenueCat fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(verifyEntitlement("alias-id", env)).rejects.toMatchObject({
      code: "entitlement_unavailable",
      status: 503,
    });
  });
});
