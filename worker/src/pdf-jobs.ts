import { refundCredits, reserveCredits } from "./quota";
import { RequestValidationError } from "./request-validation";
import type { CreditState } from "./types";

export const PDF_SIZE_LIMIT_BYTES = 25 * 1024 * 1024;

export interface PdfJob {
  id: string;
  userHash: string;
  reservationId: string;
  anthropicFileId: string | null;
  status:
    | "created"
    | "uploading"
    | "uploaded"
    | "extracting"
    | "completed"
    | "failed"
    | "deleted";
  createdAt: string;
  expiresAt: string;
}

interface PdfJobRow {
  id: string;
  user_hash: string;
  reservation_id: string;
  anthropic_file_id: string | null;
  status: PdfJob["status"];
  created_at: string;
  expires_at: string;
}

export interface CreatePdfJobResult {
  allowed: boolean;
  jobId: string | null;
  credits: CreditState;
}

function fromRow(row: PdfJobRow): PdfJob {
  return {
    id: row.id,
    userHash: row.user_hash,
    reservationId: row.reservation_id,
    anthropicFileId: row.anthropic_file_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function createPdfJob(
  db: D1Database,
  userHash: string,
  now: Date
): Promise<CreatePdfJobResult> {
  const reservation = await reserveCredits(db, userHash, "pdf", now);
  if (!reservation.allowed || !reservation.reservationId) {
    return { allowed: false, jobId: null, credits: reservation.credits };
  }
  const jobId = crypto.randomUUID();
  try {
    await db
      .prepare(
        `INSERT INTO pdf_jobs
           (id, user_hash, reservation_id, status, created_at, expires_at)
         VALUES (?1, ?2, ?3, 'created', ?4, ?5)`
      )
      .bind(
        jobId,
        userHash,
        reservation.reservationId,
        now.toISOString(),
        reservation.credits.resetAt
      )
      .run();
  } catch (error) {
    await refundCredits(db, reservation.reservationId);
    throw error;
  }
  return { allowed: true, jobId, credits: reservation.credits };
}

export async function getPdfJob(
  db: D1Database,
  jobId: string,
  userHash: string
): Promise<PdfJob | null> {
  const row = await db
    .prepare(
      `SELECT id, user_hash, reservation_id, anthropic_file_id, status, created_at, expires_at
       FROM pdf_jobs
       WHERE id = ?1 AND user_hash = ?2`
    )
    .bind(jobId, userHash)
    .first<PdfJobRow>();
  return row ? fromRow(row) : null;
}

export async function recordPdfUpload(
  db: D1Database,
  jobId: string,
  userHash: string,
  anthropicFileId: string
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE pdf_jobs
       SET anthropic_file_id = ?1, status = 'uploaded'
       WHERE id = ?2 AND user_hash = ?3 AND status = 'uploading'`
    )
    .bind(anthropicFileId, jobId, userHash)
    .run();
  if ((result.meta.changes ?? 0) !== 1) {
    throw new RequestValidationError("pdf_job_invalid", 409, "PDF job cannot accept an upload.");
  }
}

async function claimPdfTransition(
  db: D1Database,
  jobId: string,
  userHash: string,
  fromStatus: "created" | "uploaded",
  toStatus: "uploading" | "extracting"
): Promise<PdfJob> {
  const row = await db
    .prepare(
      `UPDATE pdf_jobs SET status = ?1
       WHERE id = ?2 AND user_hash = ?3 AND status = ?4
       RETURNING id, user_hash, reservation_id, anthropic_file_id, status,
                 created_at, expires_at`
    )
    .bind(toStatus, jobId, userHash, fromStatus)
    .first<PdfJobRow>();
  if (!row) {
    throw new RequestValidationError(
      "pdf_job_invalid",
      409,
      fromStatus === "created"
        ? "PDF job cannot accept an upload."
        : "PDF job is not ready."
    );
  }
  return fromRow(row);
}

export function claimPdfUpload(
  db: D1Database,
  jobId: string,
  userHash: string
): Promise<PdfJob> {
  return claimPdfTransition(db, jobId, userHash, "created", "uploading");
}

export async function claimPdfExtraction(
  db: D1Database,
  jobId: string,
  userHash: string
): Promise<PdfJob> {
  const job = await claimPdfTransition(db, jobId, userHash, "uploaded", "extracting");
  if (!job.anthropicFileId) {
    await failPdfJob(db, jobId, userHash);
    throw new RequestValidationError("pdf_job_invalid", 409, "PDF job is not ready.");
  }
  return job;
}

export async function failPdfJob(
  db: D1Database,
  jobId: string,
  userHash: string
): Promise<void> {
  const job = await getPdfJob(db, jobId, userHash);
  if (!job || job.status === "completed" || job.status === "deleted") return;
  const timestamp = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE pdf_jobs SET status = 'failed'
         WHERE id = ?1 AND user_hash = ?2
           AND status IN ('created', 'uploading', 'uploaded', 'extracting', 'failed')`
      )
      .bind(jobId, userHash),
    db
      .prepare(
        `UPDATE quota_reservations SET status = 'refunded'
         WHERE id = ?1 AND status = 'reserved'`
      )
      .bind(job.reservationId),
    db
      .prepare(
        `UPDATE quota_usage
         SET credits_used = MAX(
               0,
               credits_used - COALESCE(
                 (SELECT credits FROM quota_reservations WHERE id = ?1),
                 0
               )
             ),
             updated_at = ?2
         WHERE changes() = 1
           AND (user_hash, day_utc) = (
             SELECT user_hash, day_utc FROM quota_reservations WHERE id = ?1
           )`
      )
      .bind(job.reservationId, timestamp),
  ]);
}

export async function completePdfJob(
  db: D1Database,
  jobId: string,
  userHash: string
): Promise<void> {
  const job = await getPdfJob(db, jobId, userHash);
  if (!job || job.status !== "extracting") {
    throw new RequestValidationError("pdf_job_invalid", 409, "PDF job is not ready.");
  }
  await db.batch([
    db
      .prepare(
        `UPDATE pdf_jobs SET status = 'completed'
         WHERE id = ?1 AND user_hash = ?2 AND status = 'extracting'`
      )
      .bind(jobId, userHash),
    db
      .prepare(
        `UPDATE quota_reservations SET status = 'completed'
         WHERE id = ?1 AND status = 'reserved'`
      )
      .bind(job.reservationId),
  ]);
}

export async function markPdfDeleted(
  db: D1Database,
  jobId: string,
  userHash: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE pdf_jobs SET status = 'deleted', anthropic_file_id = NULL
       WHERE id = ?1 AND user_hash = ?2
         AND status IN ('failed', 'uploaded', 'completed')`
    )
    .bind(jobId, userHash)
    .run();
}

export async function listExpiredPdfJobs(
  db: D1Database,
  now: Date
): Promise<PdfJob[]> {
  const result = await db
    .prepare(
      `SELECT id, user_hash, reservation_id, anthropic_file_id, status,
              created_at, expires_at
       FROM pdf_jobs
       WHERE expires_at <= ?1 AND status <> 'deleted'
       ORDER BY expires_at ASC
       LIMIT 25`
    )
    .bind(now.toISOString())
    .all<PdfJobRow>();
  return result.results.map(fromRow);
}

export async function deleteExpiredPdfJobRows(
  db: D1Database,
  now: Date
): Promise<number> {
  const result = await db
    .prepare("DELETE FROM pdf_jobs WHERE expires_at <= ?1 AND status = 'deleted'")
    .bind(now.toISOString())
    .run();
  return result.meta.changes ?? 0;
}

export function validatePdfMetadata(file: { type: string; size: number }): void {
  if (file.type.toLowerCase() !== "application/pdf") {
    throw new RequestValidationError("invalid_pdf", 400, "Upload must be a PDF file.");
  }
  if (file.size > PDF_SIZE_LIMIT_BYTES) {
    throw new RequestValidationError(
      "pdf_too_large",
      413,
      "PDF files are limited to 25 MB."
    );
  }
}
