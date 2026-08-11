export interface CleanupResult {
  reports: number;
  pdfJobs: number;
  reservations: number;
  reportUsage: number;
  quotaUsage: number;
}

export async function cleanupExpired(
  env: Env,
  now: Date
): Promise<CleanupResult> {
  const db = env.DB;
  const nowIso = now.toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1_000);
  const twoDaysAgoIso = twoDaysAgo.toISOString();
  const twoDaysAgoUtcDay = twoDaysAgoIso.slice(0, 10);

  const expiredPdfJobs = await listExpiredPdfJobs(db, now);
  for (const job of expiredPdfJobs) {
    if (["created", "uploading", "uploaded", "extracting"].includes(job.status)) {
      await failPdfJob(db, job.id, job.userHash);
    }
    if (job.anthropicFileId) {
      try {
        const response = await deleteAnthropicFile(job.anthropicFileId, env);
        const deleted = response.ok || response.status === 404;
        await response.body?.cancel();
        if (!deleted) continue;
      } catch {
        continue;
      }
    }
    await markPdfDeleted(db, job.id, job.userHash);
  }
  const pdfJobs = await deleteExpiredPdfJobRows(db, now);

  const [reports, reservations, reportUsage, quotaUsage] = await db.batch([
    db.prepare("DELETE FROM ai_reports WHERE expires_at <= ?1").bind(nowIso),
    db
      .prepare(
        `DELETE FROM quota_reservations
         WHERE status IN ('completed', 'refunded') AND created_at < ?1
           AND NOT EXISTS (
             SELECT 1 FROM pdf_jobs WHERE pdf_jobs.reservation_id = quota_reservations.id
           )`
      )
      .bind(twoDaysAgoIso),
    db.prepare("DELETE FROM report_usage WHERE day_utc < ?1").bind(twoDaysAgoUtcDay),
    db.prepare("DELETE FROM quota_usage WHERE day_utc < ?1").bind(twoDaysAgoUtcDay),
  ]);

  return {
    reports: reports.meta.changes ?? 0,
    pdfJobs,
    reservations: reservations.meta.changes ?? 0,
    reportUsage: reportUsage.meta.changes ?? 0,
    quotaUsage: quotaUsage.meta.changes ?? 0,
  };
}
import { deleteAnthropicFile } from "./anthropic";
import {
  deleteExpiredPdfJobRows,
  failPdfJob,
  listExpiredPdfJobs,
  markPdfDeleted,
} from "./pdf-jobs";
