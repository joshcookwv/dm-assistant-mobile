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
  productId?: string;
  subscriptions?: Record<string, { is_sandbox: boolean; store: string }>;
}): Response {
  return Response.json({
    request_date: "2026-08-11T12:00:00Z",
    request_date_ms: 1786464000000,
    subscriber: {
      entitlements: {
        pro: {
          expires_date:
            options && "expiresDate" in options ? options.expiresDate : "2099-09-11T12:00:00Z",
          grace_period_expires_date: options?.graceDate ?? null,
          product_identifier: options?.productId ?? "infernal_codex_pro:monthly",
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
      subscriptions: options?.subscriptions ?? {},
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
      entitlementExpiresAt: "2099-09-11T12:00:00Z",
    });
  });

  it("accepts an active grace period after the regular expiration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        customerResponse({
          expiresDate: "2026-08-10T12:00:00Z",
          graceDate: "2099-08-12T12:00:00Z",
        })
      )
    );

    await expect(verifyEntitlement("alias-id", env)).resolves.toMatchObject({
      canonicalId: "$RCAnonymousID:canonical",
      entitlementExpiresAt: "2099-08-12T12:00:00Z",
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

  it("rejects an entitlement unlocked by a sandbox purchase", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        customerResponse({
          subscriptions: {
            "infernal_codex_pro:monthly": { is_sandbox: true, store: "play_store" },
          },
        })
      )
    );

    await expect(verifyEntitlement("alias-id", env)).rejects.toMatchObject({
      code: "pro_required",
      status: 403,
    });
  });

  it("accepts sandbox purchases only when explicitly allowed for local testing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        customerResponse({
          subscriptions: {
            "infernal_codex_pro:monthly": { is_sandbox: true, store: "play_store" },
          },
        })
      )
    );

    await expect(
      verifyEntitlement("alias-id", { ...env, ALLOW_SANDBOX_ENTITLEMENTS: "true" })
    ).resolves.toMatchObject({ canonicalId: "$RCAnonymousID:canonical" });
  });

  it("accepts a production Play purchase", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        customerResponse({
          subscriptions: {
            "infernal_codex_pro:monthly": { is_sandbox: false, store: "play_store" },
          },
        })
      )
    );

    await expect(verifyEntitlement("alias-id", env)).resolves.toMatchObject({
      canonicalId: "$RCAnonymousID:canonical",
    });
  });

  it("accepts a promotional grant such as reviewer access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        customerResponse({
          productId: "rc_promo_pro_lifetime",
          expiresDate: null,
          subscriptions: {
            rc_promo_pro_lifetime: { is_sandbox: false, store: "promotional" },
          },
        })
      )
    );

    await expect(verifyEntitlement("alias-id", env)).resolves.toMatchObject({
      canonicalId: "$RCAnonymousID:canonical",
      entitlementExpiresAt: null,
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
