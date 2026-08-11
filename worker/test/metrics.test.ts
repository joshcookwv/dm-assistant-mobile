import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { recordUsage } from "../src/metrics";

describe("aggregate AI metrics", () => {
  it("records only daily feature totals without a customer identifier", async () => {
    const now = new Date("2026-08-11T23:59:00.000Z");
    await recordUsage(env.DB, "npc", { input_tokens: 20, output_tokens: 8 }, false, now);
    await recordUsage(env.DB, "npc", { input_tokens: 30, output_tokens: 12 }, false, now);
    await recordUsage(env.DB, "npc", undefined, true, now);

    const row = await env.DB.prepare(
      `SELECT day_utc, feature, requests, input_tokens, output_tokens, errors
       FROM daily_metrics WHERE day_utc = '2026-08-11' AND feature = 'npc'`
    ).first<Record<string, string | number>>();
    expect(row).toEqual({
      day_utc: "2026-08-11",
      feature: "npc",
      requests: 3,
      input_tokens: 50,
      output_tokens: 20,
      errors: 1,
    });

    const columns = await env.DB.prepare("PRAGMA table_info(daily_metrics)").all<{
      name: string;
    }>();
    expect(columns.results.map((column) => column.name)).not.toContain("user_hash");
  });
});
