import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupExpired } from "../src/cleanup";

describe("retention cleanup", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("removes expired reports/jobs and only usage data older than two days", async () => {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO ai_reports
          (id, user_hash, category, comment, output, feature, model, created_at, expires_at)
         VALUES ('expired-report', 'hash-a', 'other', '', 'old', 'npc', 'model',
                 '2026-07-01T00:00:00.000Z', '2026-08-11T05:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO ai_reports
          (id, user_hash, category, comment, output, feature, model, created_at, expires_at)
         VALUES ('future-report', 'hash-b', 'other', '', 'new', 'npc', 'model',
                 '2026-08-01T00:00:00.000Z', '2026-08-12T05:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO quota_usage (user_hash, day_utc, credits_used, updated_at)
         VALUES ('old-quota', '2026-08-08', 1, '2026-08-08T12:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO quota_usage (user_hash, day_utc, credits_used, updated_at)
         VALUES ('fresh-quota', '2026-08-09', 1, '2026-08-09T12:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO report_usage (user_hash, day_utc, reports_submitted, updated_at)
         VALUES ('old-reports', '2026-08-08', 1, '2026-08-08T12:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO report_usage (user_hash, day_utc, reports_submitted, updated_at)
         VALUES ('fresh-reports', '2026-08-09', 1, '2026-08-09T12:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO quota_reservations
          (id, user_hash, day_utc, credits, kind, status, created_at, expires_at)
         VALUES ('old-reservation', 'hash-c', '2026-08-08', 5, 'pdf', 'completed',
                 '2026-08-08T01:00:00.000Z', '2026-08-09T00:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO pdf_jobs
          (id, user_hash, reservation_id, status, created_at, expires_at)
         VALUES ('expired-job', 'hash-c', 'old-reservation', 'completed',
                 '2026-08-08T01:00:00.000Z', '2026-08-11T05:00:00.000Z')`
      ),
    ]);

    const result = await cleanupExpired(env, new Date("2026-08-11T05:00:00.000Z"));
    expect(result).toEqual({
      reports: 1,
      pdfJobs: 1,
      reservations: 1,
      reportUsage: 1,
      quotaUsage: 1,
    });

    await expect(
      env.DB.prepare("SELECT id FROM ai_reports WHERE id = 'expired-report'").first()
    ).resolves.toBeNull();
    await expect(
      env.DB.prepare("SELECT id FROM ai_reports WHERE id = 'future-report'").first()
    ).resolves.not.toBeNull();
    await expect(
      env.DB.prepare("SELECT user_hash FROM quota_usage WHERE user_hash = 'fresh-quota'").first()
    ).resolves.not.toBeNull();
    await expect(
      env.DB.prepare("SELECT user_hash FROM report_usage WHERE user_hash = 'fresh-reports'").first()
    ).resolves.not.toBeNull();
  });

  it("retains an expired PDF cleanup record until upstream deletion succeeds", async () => {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO quota_usage (user_hash, day_utc, credits_used, updated_at)
         VALUES ('retry-cleanup-user', '2026-08-08', 5, '2026-08-08T01:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO quota_reservations
          (id, user_hash, day_utc, credits, kind, status, created_at, expires_at)
         VALUES ('retry-cleanup-reservation', 'retry-cleanup-user', '2026-08-08', 5,
                 'pdf', 'completed', '2026-08-08T01:00:00.000Z',
                 '2026-08-09T00:00:00.000Z')`
      ),
      env.DB.prepare(
        `INSERT INTO pdf_jobs
          (id, user_hash, reservation_id, anthropic_file_id, status, created_at, expires_at)
         VALUES ('retry-cleanup-job', 'retry-cleanup-user', 'retry-cleanup-reservation',
                 'file_retry_cleanup', 'completed', '2026-08-08T01:00:00.000Z',
                 '2026-08-11T05:00:00.000Z')`
      ),
    ]);
    const deleteFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: "overloaded" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ error: "not_found" }, { status: 404 }));
    vi.stubGlobal("fetch", deleteFetch);

    const first = await cleanupExpired(env, new Date("2026-08-11T05:00:00.000Z"));
    expect(first.pdfJobs).toBe(0);
    await expect(
      env.DB.prepare("SELECT status FROM pdf_jobs WHERE id = 'retry-cleanup-job'").first()
    ).resolves.toEqual({ status: "completed" });

    const second = await cleanupExpired(env, new Date("2026-08-11T05:00:01.000Z"));
    expect(second.pdfJobs).toBe(1);
    await expect(
      env.DB.prepare("SELECT status FROM pdf_jobs WHERE id = 'retry-cleanup-job'").first()
    ).resolves.toBeNull();
    expect(deleteFetch).toHaveBeenCalledTimes(2);
  });
});
