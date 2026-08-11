import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../src/index";
import { hashCustomerId } from "../src/identity";
import {
  submitReport,
  validateReportInput,
  type AiOutputReportInput,
} from "../src/reports";

const TEST_NOW = new Date("2026-08-11T12:00:00.000Z");
const validReport: AiOutputReportInput = {
  category: "deceptive_unsafe",
  comment: "This advice should be reviewed.",
  output: "Flagged generated output",
  feature: "npc",
  model: "claude-haiku-4-5-20251001",
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

describe("report validation", () => {
  it("accepts only the approved flagged-output contract and normalizes comment", () => {
    expect(validateReportInput({ ...validReport, comment: undefined })).toEqual({
      ...validReport,
      comment: "",
    });
  });

  it("rejects invalid categories, features, and content bounds", () => {
    for (const input of [
      { ...validReport, category: "spam" },
      { ...validReport, feature: "freeform" },
      { ...validReport, output: "" },
      { ...validReport, output: "x".repeat(20_001) },
      { ...validReport, comment: "x".repeat(1_001) },
      { ...validReport, model: "" },
    ]) {
      expect(() => validateReportInput(input)).toThrowError(
        expect.objectContaining({ code: "invalid_report", status: 400 })
      );
    }
  });
});

describe("report storage", () => {
  it("stores the hashed customer report for exactly 30 days", async () => {
    const result = await submitReport(env.DB, "report-user", validReport, TEST_NOW);
    expect(result).toMatchObject({ allowed: true });

    const row = await env.DB.prepare(
      `SELECT user_hash, category, comment, output, feature, model, created_at, expires_at
       FROM ai_reports WHERE id = ?1`
    )
      .bind(result.reportId)
      .first<Record<string, string>>();
    expect(row).toMatchObject({
      user_hash: "report-user",
      category: validReport.category,
      comment: validReport.comment,
      output: validReport.output,
      feature: validReport.feature,
      model: validReport.model,
      created_at: "2026-08-11T12:00:00.000Z",
      expires_at: "2026-09-10T12:00:00.000Z",
    });
  });

  it("atomically accepts only ten reports per customer per UTC day", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 20 }, () =>
        submitReport(env.DB, "report-limit-user", validReport, TEST_NOW)
      )
    );
    expect(attempts.filter((attempt) => attempt.allowed)).toHaveLength(10);
    expect(attempts.filter((attempt) => !attempt.allowed)).toHaveLength(10);

    const usage = await env.DB.prepare(
      "SELECT reports_submitted FROM report_usage WHERE user_hash = ?1 AND day_utc = '2026-08-11'"
    )
      .bind("report-limit-user")
      .first<{ reports_submitted: number }>();
    expect(usage?.reports_submitted).toBe(10);
  });

  it("does not consume report capacity when insertion fails", async () => {
    await env.DB.prepare(
      `CREATE TRIGGER reject_test_report
       BEFORE INSERT ON ai_reports
       BEGIN
         SELECT RAISE(ABORT, 'test insertion failure');
       END`
    ).run();

    await expect(
      submitReport(env.DB, "rollback-report-user", validReport, TEST_NOW)
    ).rejects.toThrow();
    await env.DB.prepare("DROP TRIGGER reject_test_report").run();
    const usage = await env.DB.prepare(
      "SELECT reports_submitted FROM report_usage WHERE user_hash = ?1"
    )
      .bind("rollback-report-user")
      .first();
    expect(usage).toBeNull();
  });
});

describe("POST /v1/reports", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requires entitlement but consumes no AI credits and emits no sensitive logs", async () => {
    const canonicalId = "$RCAnonymousID:report-route-raw";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(activeCustomer(canonicalId)));
    const spies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
    ];

    const response = await worker.fetch(
      new Request("https://worker.test/v1/reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revenuecat-app-user-id": "report-route-alias",
        },
        body: JSON.stringify({
          ...validReport,
          output: "PROMPT_MARKER flagged output SECRET_MARKER",
        }),
      }),
      env
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("x-ai-credits-remaining")).toBe("10");
    await expect(response.json()).resolves.toMatchObject({
      reportId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });

    const userHash = await hashCustomerId(canonicalId, env.USER_HASH_SECRET);
    const quota = await env.DB.prepare(
      "SELECT credits_used FROM quota_usage WHERE user_hash = ?1"
    )
      .bind(userHash)
      .first();
    expect(quota).toBeNull();

    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain("PROMPT_MARKER");
    expect(logged).not.toContain("SECRET_MARKER");
    expect(logged).not.toContain(canonicalId);
    expect(logged).not.toContain(env.USER_HASH_SECRET);
  });
});
