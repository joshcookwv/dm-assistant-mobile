import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../src/index";
import { hashCustomerId } from "../src/identity";
import {
  readBoundedJson,
  validateBetaHeader,
  validateStandardRequest,
} from "../src/request-validation";

const validBody = {
  model: "claude-haiku-4-5-20251001",
  max_tokens: 800,
  messages: [{ role: "user", content: "Create a tavern keeper." }],
};

function activeCustomer(canonicalId: string): Response {
  return Response.json({
    subscriber: {
      original_app_user_id: canonicalId,
      entitlements: {
        pro: {
          expires_date: "2026-09-11T12:00:00Z",
          grace_period_expires_date: null,
        },
      },
    },
  });
}

function messageRequest(appUserId: string, body: unknown = validBody): Request {
  return new Request("https://worker.test/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revenuecat-app-user-id": appUserId,
    },
    body: JSON.stringify(body),
  });
}

describe("standard message validation", () => {
  it("accepts the allowed model at the 800-token ceiling", () => {
    expect(validateStandardRequest(validBody)).toEqual(validBody);
  });

  it("rejects an unsupported model", () => {
    expect(() =>
      validateStandardRequest({ ...validBody, model: "claude-opus-5" })
    ).toThrowError(expect.objectContaining({ code: "model_not_allowed", status: 400 }));
  });

  it("rejects output above 800 tokens", () => {
    expect(() =>
      validateStandardRequest({ ...validBody, max_tokens: 801 })
    ).toThrowError(expect.objectContaining({ code: "token_limit_exceeded", status: 400 }));
  });

  it("rejects document and file content blocks on the standard route", () => {
    for (const sourceType of ["file", "base64"]) {
      expect(() =>
        validateStandardRequest({
          ...validBody,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: { type: sourceType, file_id: "file_123", data: "pdf" },
                },
              ],
            },
          ],
        })
      ).toThrowError(expect.objectContaining({ code: "file_not_allowed", status: 400 }));
    }
  });

  it("rejects beta headers on standard requests", () => {
    expect(() => validateBetaHeader("files-api-2025-04-14", false)).toThrowError(
      expect.objectContaining({ code: "beta_not_allowed", status: 400 })
    );
  });

  it("rejects a JSON body larger than 256 KiB", async () => {
    const body = JSON.stringify({ value: "x".repeat(256 * 1024) });
    const request = new Request("https://worker.test/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

    await expect(readBoundedJson(request, 256 * 1024)).rejects.toMatchObject({
      code: "body_too_large",
      status: 413,
    });
  });
});

describe("POST /v1/messages", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the canonical customer hash and returns one-credit state", async () => {
    const rawCanonicalId = "$RCAnonymousID:route-canonical";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("https://api.revenuecat.com/")) {
          return activeCustomer(rawCanonicalId);
        }
        if (url === "https://api.anthropic.com/v1/messages") {
          return Response.json({
            id: "msg_1",
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: "Mara, keeper of the Ember Mug." }],
            model: "claude-haiku-4-5-20251001",
            stop_reason: "end_turn",
            usage: { input_tokens: 20, output_tokens: 12 },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const response = await worker.fetch(messageRequest("alias-route-user"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-credits-limit")).toBe("10");
    expect(response.headers.get("x-ai-credits-remaining")).toBe("9");
    await expect(response.json()).resolves.toMatchObject({ id: "msg_1" });

    const expectedHash = await hashCustomerId(rawCanonicalId, env.USER_HASH_SECRET);
    const row = await env.DB.prepare(
      "SELECT user_hash, credits_used FROM quota_usage WHERE user_hash = ?1"
    )
      .bind(expectedHash)
      .first<{ user_hash: string; credits_used: number }>();
    expect(row).toEqual({ user_hash: expectedHash, credits_used: 1 });
    const rawRow = await env.DB.prepare(
      "SELECT user_hash FROM quota_usage WHERE user_hash = ?1"
    )
      .bind(rawCanonicalId)
      .first();
    expect(rawRow).toBeNull();
  });

  it("refunds the reservation when Anthropic is unsuccessful", async () => {
    const canonicalId = "$RCAnonymousID:upstream-failure";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("https://api.revenuecat.com/")) return activeCustomer(canonicalId);
        if (url === "https://api.anthropic.com/v1/messages") {
          return Response.json({ error: { type: "overloaded_error" } }, { status: 529 });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const response = await worker.fetch(messageRequest("failure-alias"), env);
    expect(response.status).toBe(502);
    expect(response.headers.get("x-ai-credits-remaining")).toBe("10");
    await response.body?.cancel();

    const userHash = await hashCustomerId(canonicalId, env.USER_HASH_SECRET);
    const usage = await env.DB.prepare(
      "SELECT credits_used FROM quota_usage WHERE user_hash = ?1"
    )
      .bind(userHash)
      .first<{ credits_used: number }>();
    expect(usage?.credits_used).toBe(0);
  });

  it("returns 429 with credit/reset headers before Anthropic", async () => {
    const canonicalId = "$RCAnonymousID:route-quota";
    const userHash = await hashCustomerId(canonicalId, env.USER_HASH_SECRET);
    await env.DB.prepare(
      `INSERT INTO quota_usage (user_hash, day_utc, credits_used, updated_at)
       VALUES (?1, ?2, 10, ?3)`
    )
      .bind(userHash, new Date().toISOString().slice(0, 10), new Date().toISOString())
      .run();
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://api.revenuecat.com/")) return activeCustomer(canonicalId);
      throw new Error(`Anthropic must not be called: ${url}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await worker.fetch(messageRequest("quota-alias"), env);
    expect(response.status).toBe(429);
    expect(response.headers.get("x-ai-credits-remaining")).toBe("0");
    expect(response.headers.get("x-ai-credits-reset")).toMatch(/T00:00:00\.000Z$/);
    await response.body?.cancel();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
