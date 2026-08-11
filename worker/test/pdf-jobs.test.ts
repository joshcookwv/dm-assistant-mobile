import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../src/index";
import {
  completePdfJob,
  createPdfJob,
  failPdfJob,
  getPdfJob,
  recordPdfUpload,
  validatePdfMetadata,
} from "../src/pdf-jobs";

const TEST_NOW = new Date("2026-08-11T12:00:00.000Z");

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

function authHeaders(appUserId: string): HeadersInit {
  return { "x-revenuecat-app-user-id": appUserId };
}

describe("PDF job state", () => {
  it("reserves exactly five credits and binds the job to the customer hash", async () => {
    const created = await createPdfJob(env.DB, "pdf-job-user", TEST_NOW);

    expect(created).toMatchObject({
      allowed: true,
      credits: { limit: 10, used: 5, remaining: 5 },
    });
    expect(created.jobId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(getPdfJob(env.DB, created.jobId!, "pdf-job-user")).resolves.toMatchObject({
      status: "created",
      userHash: "pdf-job-user",
    });
    await expect(getPdfJob(env.DB, created.jobId!, "different-user")).resolves.toBeNull();
  });

  it("does not create a third PDF job after ten credits are reserved", async () => {
    const userHash = "pdf-limit-user";
    await createPdfJob(env.DB, userHash, TEST_NOW);
    await createPdfJob(env.DB, userHash, TEST_NOW);
    const denied = await createPdfJob(env.DB, userHash, TEST_NOW);

    expect(denied).toMatchObject({ allowed: false, jobId: null });
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM pdf_jobs WHERE user_hash = ?1"
    )
      .bind(userHash)
      .first<{ count: number }>();
    expect(row?.count).toBe(2);
  });

  it("records only the upstream file ID for an authorized upload", async () => {
    const created = await createPdfJob(env.DB, "upload-user", TEST_NOW);
    await recordPdfUpload(env.DB, created.jobId!, "upload-user", "file_123");

    await expect(getPdfJob(env.DB, created.jobId!, "upload-user")).resolves.toMatchObject({
      status: "uploaded",
      anthropicFileId: "file_123",
    });
  });

  it("refunds the five-credit reservation when a job fails", async () => {
    const userHash = "failed-job-user";
    const created = await createPdfJob(env.DB, userHash, TEST_NOW);

    await failPdfJob(env.DB, created.jobId!, userHash);

    const usage = await env.DB.prepare(
      "SELECT credits_used FROM quota_usage WHERE user_hash = ?1 AND day_utc = '2026-08-11'"
    )
      .bind(userHash)
      .first<{ credits_used: number }>();
    expect(usage?.credits_used).toBe(0);
    await expect(getPdfJob(env.DB, created.jobId!, userHash)).resolves.toMatchObject({
      status: "failed",
    });
  });

  it("completes the reservation with a successful extraction", async () => {
    const userHash = "completed-job-user";
    const created = await createPdfJob(env.DB, userHash, TEST_NOW);
    await recordPdfUpload(env.DB, created.jobId!, userHash, "file_complete");

    await completePdfJob(env.DB, created.jobId!, userHash);

    const reservation = await env.DB.prepare(
      `SELECT r.status
       FROM quota_reservations r
       JOIN pdf_jobs p ON p.reservation_id = r.id
       WHERE p.id = ?1`
    )
      .bind(created.jobId)
      .first<{ status: string }>();
    expect(reservation?.status).toBe("completed");
    await expect(getPdfJob(env.DB, created.jobId!, userHash)).resolves.toMatchObject({
      status: "completed",
    });
  });
});

describe("PDF bounds", () => {
  it("accepts an application/pdf file at exactly 25 MiB", () => {
    expect(
      validatePdfMetadata({ type: "application/pdf", size: 25 * 1024 * 1024 })
    ).toBeUndefined();
  });

  it("rejects non-PDF and oversized files", () => {
    expect(() => validatePdfMetadata({ type: "text/plain", size: 100 })).toThrowError(
      expect.objectContaining({ code: "invalid_pdf", status: 400 })
    );
    expect(() =>
      validatePdfMetadata({ type: "application/pdf", size: 25 * 1024 * 1024 + 1 })
    ).toThrowError(expect.objectContaining({ code: "pdf_too_large", status: 413 }));
  });
});

describe("protected PDF routes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates a five-credit job for an entitled canonical customer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(activeCustomer("$RCAnonymousID:pdf-route"))
    );
    const response = await worker.fetch(
      new Request("https://worker.test/v1/pdf-jobs", {
        method: "POST",
        headers: authHeaders("pdf-route-alias"),
      }),
      env
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("x-ai-credits-remaining")).toBe("5");
    await expect(response.json()).resolves.toMatchObject({
      jobId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      credits: { used: 5, remaining: 5 },
    });
  });

  it("refunds an oversized upload before contacting Anthropic", async () => {
    const canonicalId = "$RCAnonymousID:oversized-pdf";
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://api.revenuecat.com/")) return activeCustomer(canonicalId);
      throw new Error(`Anthropic must not be called: ${url}`);
    });
    vi.stubGlobal("fetch", fetchSpy);
    const createResponse = await worker.fetch(
      new Request("https://worker.test/v1/pdf-jobs", {
        method: "POST",
        headers: authHeaders("oversized-alias"),
      }),
      env
    );
    const created = await createResponse.json<{ jobId: string }>();

    const oversizedForm = new FormData();
    oversizedForm.set(
      "file",
      new File([new Uint8Array(25 * 1024 * 1024 + 1)], "oversized.pdf", {
        type: "application/pdf",
      })
    );
    const uploadResponse = await worker.fetch(
      new Request(`https://worker.test/v1/pdf-jobs/${created.jobId}/file`, {
        method: "PUT",
        headers: authHeaders("oversized-alias"),
        body: oversizedForm,
      }),
      env
    );

    expect(uploadResponse.status).toBe(413);
    expect(uploadResponse.headers.get("x-ai-credits-remaining")).toBe("10");
    await uploadResponse.body?.cancel();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uploads, extracts at 8192 tokens, completes five credits, and deletes for free", async () => {
    const canonicalId = "$RCAnonymousID:pdf-flow";
    let extractionBody: Record<string, unknown> | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("https://api.revenuecat.com/")) return activeCustomer(canonicalId);
        if (url === "https://api.anthropic.com/v1/files" && init?.method === "POST") {
          return Response.json({
            id: "file_pdf_flow",
            type: "file",
            filename: "adventure.pdf",
            mime_type: "application/pdf",
            size_bytes: 12,
            created_at: "2026-08-11T12:00:00Z",
            downloadable: false,
          });
        }
        if (url === "https://api.anthropic.com/v1/messages") {
          extractionBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return Response.json({
            id: "msg_pdf",
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: "Extracted adventure data" }],
            model: "claude-haiku-4-5-20251001",
            stop_reason: "end_turn",
            usage: { input_tokens: 500, output_tokens: 50 },
          });
        }
        if (
          url === "https://api.anthropic.com/v1/files/file_pdf_flow" &&
          init?.method === "DELETE"
        ) {
          return Response.json({ id: "file_pdf_flow", type: "file_deleted" });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const createResponse = await worker.fetch(
      new Request("https://worker.test/v1/pdf-jobs", {
        method: "POST",
        headers: authHeaders("pdf-flow-alias"),
      }),
      env
    );
    const created = await createResponse.json<{ jobId: string }>();
    const form = new FormData();
    form.set("file", new File(["%PDF-1.7 test"], "adventure.pdf", { type: "application/pdf" }));
    const uploadResponse = await worker.fetch(
      new Request(`https://worker.test/v1/pdf-jobs/${created.jobId}/file`, {
        method: "PUT",
        headers: authHeaders("pdf-flow-alias"),
        body: form,
      }),
      env
    );
    expect(uploadResponse.status).toBe(200);
    await uploadResponse.body?.cancel();

    const extractResponse = await worker.fetch(
      new Request(`https://worker.test/v1/pdf-jobs/${created.jobId}/extract`, {
        method: "POST",
        headers: {
          ...authHeaders("pdf-flow-alias"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ prompt: "Extract the adventure structure." }),
      }),
      env
    );
    expect(extractResponse.status).toBe(200);
    expect(extractResponse.headers.get("x-ai-credits-remaining")).toBe("5");
    await extractResponse.body?.cancel();
    expect(extractionBody).toMatchObject({ max_tokens: 8192 });
    expect(JSON.stringify(extractionBody)).toContain("file_pdf_flow");

    const deleteResponse = await worker.fetch(
      new Request(`https://worker.test/v1/pdf-jobs/${created.jobId}/file`, {
        method: "DELETE",
        headers: authHeaders("pdf-flow-alias"),
      }),
      env
    );
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.headers.get("x-ai-credits-remaining")).toBe("5");
    await deleteResponse.body?.cancel();
  });
});
