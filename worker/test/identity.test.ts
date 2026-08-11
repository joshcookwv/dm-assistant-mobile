import { describe, expect, it } from "vitest";

import { hashCustomerId } from "../src/identity";

describe("hashCustomerId", () => {
  it("matches the standard HMAC-SHA-256 test vector", async () => {
    await expect(
      hashCustomerId("The quick brown fox jumps over the lazy dog", "key")
    ).resolves.toBe("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
  });

  it("changes when the server-only secret changes and never returns the raw ID", async () => {
    const rawId = "$RCAnonymousID:reviewer-123";
    const first = await hashCustomerId(rawId, "secret-one");
    const second = await hashCustomerId(rawId, "secret-two");

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain(rawId);
    expect(second).not.toContain(rawId);
  });
});
