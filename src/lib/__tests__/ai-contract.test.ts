import { describe, expect, it } from "@jest/globals";

import {
  parseAiProxyResponse,
  parseCreditHeaders,
} from "../ai-contract";

function headers(values: Record<string, string | undefined>): Headers {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  } as Headers;
}

describe("AI credit response contract", () => {
  it("parses server-provided credit state", () => {
    expect(
      parseCreditHeaders(
        headers({
          "x-ai-credits-limit": "10",
          "x-ai-credits-remaining": "5",
          "x-ai-credits-reset": "2026-08-12T00:00:00.000Z",
        })
      )
    ).toEqual({
      limit: 10,
      remaining: 5,
      resetAt: "2026-08-12T00:00:00.000Z",
    });
  });

  it("returns null for missing, malformed, or impossible credit headers", () => {
    for (const value of [
      {},
      {
        "x-ai-credits-limit": "ten",
        "x-ai-credits-remaining": "5",
        "x-ai-credits-reset": "2026-08-12T00:00:00.000Z",
      },
      {
        "x-ai-credits-limit": "10",
        "x-ai-credits-remaining": "11",
        "x-ai-credits-reset": "2026-08-12T00:00:00.000Z",
      },
      {
        "x-ai-credits-limit": "10",
        "x-ai-credits-remaining": "5",
        "x-ai-credits-reset": "tomorrow",
      },
    ]) {
      expect(parseCreditHeaders(headers(value))).toBeNull();
    }
  });

  it("preserves 429 credit and reset data on the thrown error", async () => {
    const response = {
      ok: false,
      status: 429,
      headers: headers({
        "x-ai-credits-limit": "10",
        "x-ai-credits-remaining": "0",
        "x-ai-credits-reset": "2026-08-12T00:00:00.000Z",
      }),
      json: async () => ({
        error: "credit_limit_reached",
        message: "Daily AI credit limit reached.",
      }),
    } as Response;

    await expect(parseAiProxyResponse(response)).rejects.toEqual(
      expect.objectContaining({
        status: 429,
        credits: {
          limit: 10,
          remaining: 0,
          resetAt: "2026-08-12T00:00:00.000Z",
        },
      })
    );
  });
});
