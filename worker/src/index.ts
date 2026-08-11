import {
  deleteAnthropicFile,
  sendAnthropicMessage,
  uploadAnthropicPdf,
} from "./anthropic";
import { cleanupExpired } from "./cleanup";
import { hashCustomerId } from "./identity";
import { recordUsage, usageFromResponseBody } from "./metrics";
import {
  completePdfJob,
  createPdfJob,
  failPdfJob,
  getPdfJob,
  markPdfDeleted,
  recordPdfUpload,
  validatePdfMetadata,
} from "./pdf-jobs";
import {
  completeReservation,
  getCreditState,
  refundCredits,
  reserveCredits,
} from "./quota";
import {
  FILES_BETA,
  PDF_OUTPUT_TOKEN_LIMIT,
  RequestValidationError,
  STANDARD_BODY_LIMIT_BYTES,
  readBoundedJson,
  validateBetaHeader,
  validateStandardRequest,
} from "./request-validation";
import {
  RevenueCatError,
  isConfiguredValue,
  verifyEntitlement,
} from "./revenuecat";
import { submitReport, validateReportInput } from "./reports";
import type { CreditState } from "./types";

const APP_USER_ID_HEADER = "x-revenuecat-app-user-id";

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers":
      "content-type, x-revenuecat-app-user-id, anthropic-beta",
    "access-control-expose-headers":
      "x-ai-credits-limit, x-ai-credits-remaining, x-ai-credits-reset",
  };
}

function creditHeaders(credits: CreditState): Record<string, string> {
  return {
    "x-ai-credits-limit": String(credits.limit),
    "x-ai-credits-remaining": String(credits.remaining),
    "x-ai-credits-reset": credits.resetAt,
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(),
      ...headers,
    },
  });
}

function errorResponse(
  error: RevenueCatError | RequestValidationError,
  credits?: CreditState
): Response {
  return jsonResponse(
    { error: error.code, message: error.message },
    error.status,
    credits ? creditHeaders(credits) : undefined
  );
}

function requireAiConfiguration(env: Env): void {
  requireIdentityConfiguration(env);
  if (!isConfiguredValue(env.ANTHROPIC_API_KEY)) {
    throw new RequestValidationError(
      "server_misconfigured",
      500,
      "AI service is not configured. Try again later."
    );
  }
}

function requireIdentityConfiguration(env: Env): void {
  if (!isConfiguredValue(env.USER_HASH_SECRET)) {
    throw new RequestValidationError(
      "server_misconfigured",
      500,
      "Customer identity service is not configured. Try again later."
    );
  }
}

async function recordUsageSafely(
  env: Env,
  feature: "standard" | "pdf_import",
  responseBody: string | undefined,
  error: boolean
): Promise<void> {
  try {
    await recordUsage(
      env.DB,
      feature,
      responseBody ? usageFromResponseBody(responseBody) : undefined,
      error,
      new Date()
    );
  } catch {
    console.error(JSON.stringify({ event: "metrics_write_failed", feature }));
  }
}

async function authenticate(request: Request, env: Env): Promise<string> {
  const appUserId = request.headers.get(APP_USER_ID_HEADER) ?? "";
  const customer = await verifyEntitlement(appUserId, env);
  return hashCustomerId(customer.canonicalId, env.USER_HASH_SECRET);
}

function upstreamError(credits: CreditState): Response {
  return jsonResponse(
    { error: "ai_unavailable", message: "AI service is unavailable. Try again." },
    502,
    creditHeaders(credits)
  );
}

async function handleMessages(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Use POST." }, 405);
  }

  validateBetaHeader(request.headers.get("anthropic-beta"), false);
  const body = validateStandardRequest(
    await readBoundedJson(request, STANDARD_BODY_LIMIT_BYTES)
  );
  requireAiConfiguration(env);
  const userHash = await authenticate(request, env);
  const reservation = await reserveCredits(env.DB, userHash, "standard", new Date());
  if (!reservation.allowed || !reservation.reservationId) {
    return jsonResponse(
      { error: "credit_limit_reached", message: "Daily AI credit limit reached." },
      429,
      creditHeaders(reservation.credits)
    );
  }

  let upstream: Response;
  try {
    upstream = await sendAnthropicMessage(body, env);
  } catch {
    await recordUsageSafely(env, "standard", undefined, true);
    await refundCredits(env.DB, reservation.reservationId);
    return upstreamError(await getCreditState(env.DB, userHash, new Date()));
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    await recordUsageSafely(env, "standard", undefined, true);
    await refundCredits(env.DB, reservation.reservationId);
    return upstreamError(await getCreditState(env.DB, userHash, new Date()));
  }

  const responseBody = await upstream.text();
  await recordUsageSafely(env, "standard", responseBody, false);
  await completeReservation(env.DB, reservation.reservationId);
  return new Response(responseBody, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      ...corsHeaders(),
      ...creditHeaders(reservation.credits),
    },
  });
}

async function handleCreatePdfJob(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Use POST." }, 405);
  }
  requireAiConfiguration(env);
  const userHash = await authenticate(request, env);
  const created = await createPdfJob(env.DB, userHash, new Date());
  if (!created.allowed || !created.jobId) {
    return jsonResponse(
      { error: "credit_limit_reached", message: "Daily AI credit limit reached." },
      429,
      creditHeaders(created.credits)
    );
  }
  return jsonResponse(
    { jobId: created.jobId, credits: created.credits },
    201,
    creditHeaders(created.credits)
  );
}

async function requirePdfJob(
  env: Env,
  jobId: string,
  userHash: string
): Promise<NonNullable<Awaited<ReturnType<typeof getPdfJob>>>> {
  const job = await getPdfJob(env.DB, jobId, userHash);
  if (!job) {
    throw new RequestValidationError("pdf_job_not_found", 404, "PDF job was not found.");
  }
  return job;
}

async function refundFailedPdfJob(
  env: Env,
  jobId: string,
  userHash: string
): Promise<CreditState> {
  await failPdfJob(env.DB, jobId, userHash);
  return getCreditState(env.DB, userHash, new Date());
}

async function handlePdfUpload(
  request: Request,
  env: Env,
  jobId: string,
  userHash: string
): Promise<Response> {
  const job = await requirePdfJob(env, jobId, userHash);
  if (job.status !== "created") {
    throw new RequestValidationError(
      "pdf_job_invalid",
      409,
      "PDF job cannot accept an upload."
    );
  }

  let file: File;
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      throw new RequestValidationError("invalid_pdf", 400, "A PDF file is required.");
    }
    file = candidate;
    validatePdfMetadata(file);
  } catch (error) {
    const credits = await refundFailedPdfJob(env, jobId, userHash);
    if (error instanceof RequestValidationError) return errorResponse(error, credits);
    return errorResponse(
      new RequestValidationError("invalid_pdf", 400, "A valid PDF upload is required."),
      credits
    );
  }

  let upstream: Response;
  try {
    upstream = await uploadAnthropicPdf(file, env);
  } catch {
    return upstreamError(await refundFailedPdfJob(env, jobId, userHash));
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    return upstreamError(await refundFailedPdfJob(env, jobId, userHash));
  }

  let fileId: string | undefined;
  try {
    const body = await upstream.json<{ id?: unknown }>();
    fileId = typeof body.id === "string" && body.id ? body.id : undefined;
  } catch {
    fileId = undefined;
  }
  if (!fileId) {
    return upstreamError(await refundFailedPdfJob(env, jobId, userHash));
  }

  await recordPdfUpload(env.DB, jobId, userHash, fileId);
  const credits = await getCreditState(env.DB, userHash, new Date());
  return jsonResponse({ status: "uploaded" }, 200, creditHeaders(credits));
}

async function handlePdfExtraction(
  request: Request,
  env: Env,
  jobId: string,
  userHash: string
): Promise<Response> {
  const job = await requirePdfJob(env, jobId, userHash);
  if (job.status !== "uploaded" || !job.anthropicFileId) {
    throw new RequestValidationError("pdf_job_invalid", 409, "PDF job is not ready.");
  }

  let prompt: string;
  try {
    const body = await readBoundedJson(request, STANDARD_BODY_LIMIT_BYTES);
    if (
      typeof body !== "object" ||
      body === null ||
      !("prompt" in body) ||
      typeof body.prompt !== "string" ||
      !body.prompt.trim()
    ) {
      throw new RequestValidationError(
        "invalid_request",
        400,
        "Request body must include a prompt."
      );
    }
    prompt = body.prompt;
  } catch (error) {
    const credits = await refundFailedPdfJob(env, jobId, userHash);
    if (error instanceof RequestValidationError) return errorResponse(error, credits);
    throw error;
  }

  const body: Record<string, unknown> = {
    model: env.ALLOWED_MODEL,
    max_tokens: PDF_OUTPUT_TOKEN_LIMIT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "file", file_id: job.anthropicFileId },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  };

  let upstream: Response;
  try {
    upstream = await sendAnthropicMessage(body, env, FILES_BETA);
  } catch {
    await recordUsageSafely(env, "pdf_import", undefined, true);
    return upstreamError(await refundFailedPdfJob(env, jobId, userHash));
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    await recordUsageSafely(env, "pdf_import", undefined, true);
    return upstreamError(await refundFailedPdfJob(env, jobId, userHash));
  }

  const responseBody = await upstream.text();
  await recordUsageSafely(env, "pdf_import", responseBody, false);
  await completePdfJob(env.DB, jobId, userHash);
  const credits = await getCreditState(env.DB, userHash, new Date());
  return new Response(responseBody, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      ...corsHeaders(),
      ...creditHeaders(credits),
    },
  });
}

async function handlePdfDelete(
  env: Env,
  jobId: string,
  userHash: string
): Promise<Response> {
  const job = await requirePdfJob(env, jobId, userHash);
  if (!job.anthropicFileId || !["uploaded", "completed"].includes(job.status)) {
    throw new RequestValidationError("pdf_job_invalid", 409, "PDF file is not available.");
  }

  let upstream: Response;
  try {
    upstream = await deleteAnthropicFile(job.anthropicFileId, env);
  } catch {
    return upstreamError(await getCreditState(env.DB, userHash, new Date()));
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    return upstreamError(await getCreditState(env.DB, userHash, new Date()));
  }
  await upstream.body?.cancel();
  await markPdfDeleted(env.DB, jobId, userHash);
  const credits = await getCreditState(env.DB, userHash, new Date());
  return jsonResponse({ status: "deleted" }, 200, creditHeaders(credits));
}

async function handleReport(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Use POST." }, 405);
  }
  const report = validateReportInput(
    await readBoundedJson(request, STANDARD_BODY_LIMIT_BYTES)
  );
  requireIdentityConfiguration(env);
  const userHash = await authenticate(request, env);
  const submitted = await submitReport(env.DB, userHash, report, new Date());
  const credits = await getCreditState(env.DB, userHash, new Date());
  if (!submitted.allowed || !submitted.reportId) {
    return jsonResponse(
      {
        error: "report_limit_reached",
        message: "Daily report limit reached.",
        reportLimit: submitted.limit,
        reportRemaining: submitted.remaining,
        reportReset: submitted.resetAt,
      },
      429,
      creditHeaders(credits)
    );
  }
  return jsonResponse(
    { reportId: submitted.reportId },
    201,
    creditHeaders(credits)
  );
}

async function handlePdfRoute(
  request: Request,
  env: Env,
  jobId: string,
  action: "file" | "extract"
): Promise<Response> {
  requireAiConfiguration(env);
  validateBetaHeader(request.headers.get("anthropic-beta"), action === "file");
  const userHash = await authenticate(request, env);

  if (action === "file" && request.method === "PUT") {
    return handlePdfUpload(request, env, jobId, userHash);
  }
  if (action === "file" && request.method === "DELETE") {
    return handlePdfDelete(env, jobId, userHash);
  }
  if (action === "extract" && request.method === "POST") {
    return handlePdfExtraction(request, env, jobId, userHash);
  }
  return jsonResponse({ error: "method_not_allowed", message: "Method not allowed." }, 405);
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return jsonResponse({ status: "ok" });
  }
  if (url.pathname === "/v1/messages") return handleMessages(request, env);
  if (url.pathname === "/v1/pdf-jobs") return handleCreatePdfJob(request, env);
  if (url.pathname === "/v1/reports") return handleReport(request, env);

  const pdfMatch = url.pathname.match(/^\/v1\/pdf-jobs\/([^/]+)\/(file|extract)$/);
  if (pdfMatch) {
    return handlePdfRoute(
      request,
      env,
      decodeURIComponent(pdfMatch[1]),
      pdfMatch[2] as "file" | "extract"
    );
  }
  return jsonResponse({ error: "not_found", message: "Route not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof RevenueCatError || error instanceof RequestValidationError) {
        return errorResponse(error);
      }
      console.error(
        JSON.stringify({
          event: "worker_error",
          method: request.method,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.name : "UnknownError",
        })
      );
      return jsonResponse(
        { error: "internal_error", message: "An unexpected error occurred." },
        500
      );
    }
  },
  scheduled(_controller, env, ctx): void {
    ctx.waitUntil(cleanupExpired(env.DB, new Date()));
  },
} satisfies ExportedHandler<Env>;
