export interface CleanupResult {
  reports: number;
  pdfJobs: number;
  reservations: number;
  reportUsage: number;
  quotaUsage: number;
}

export async function cleanupExpired(
  db: D1Database,
  now: Date
): Promise<CleanupResult> {
  const nowIso = now.toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1_000);
  const twoDaysAgoIso = twoDaysAgo.toISOString();
  const twoDaysAgoUtcDay = twoDaysAgoIso.slice(0, 10);

  const [reports, pdfJobs, reservations, reportUsage, quotaUsage] = await db.batch([
    db.prepare("DELETE FROM ai_reports WHERE expires_at <= ?1").bind(nowIso),
    db.prepare("DELETE FROM pdf_jobs WHERE expires_at <= ?1").bind(nowIso),
    db
      .prepare(
        `DELETE FROM quota_reservations
         WHERE status IN ('completed', 'refunded') AND created_at < ?1`
      )
      .bind(twoDaysAgoIso),
    db.prepare("DELETE FROM report_usage WHERE day_utc < ?1").bind(twoDaysAgoUtcDay),
    db.prepare("DELETE FROM quota_usage WHERE day_utc < ?1").bind(twoDaysAgoUtcDay),
  ]);

  return {
    reports: reports.meta.changes ?? 0,
    pdfJobs: pdfJobs.meta.changes ?? 0,
    reservations: reservations.meta.changes ?? 0,
    reportUsage: reportUsage.meta.changes ?? 0,
    quotaUsage: quotaUsage.meta.changes ?? 0,
  };
}
