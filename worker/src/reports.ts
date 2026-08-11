import { RequestValidationError } from "./request-validation";

export type ReportCategory =
  | "offensive"
  | "sexual"
  | "violence_self_harm"
  | "deceptive_unsafe"
  | "other";

export type ReportFeature =
  | "npc"
  | "campaign_summary"
  | "session_summary"
  | "pdf_import";

export interface AiOutputReportInput {
  category: ReportCategory;
  comment?: string;
  output: string;
  feature: ReportFeature;
  model: string;
}

export interface ReportSubmissionResult {
  allowed: boolean;
  reportId: string | null;
  limit: 10;
  remaining: number;
  resetAt: string;
}

const REPORT_LIMIT = 10 as const;
const REPORT_RETENTION_DAYS = 30;
const CATEGORIES = new Set<ReportCategory>([
  "offensive",
  "sexual",
  "violence_self_harm",
  "deceptive_unsafe",
  "other",
]);
const FEATURES = new Set<ReportFeature>([
  "npc",
  "campaign_summary",
  "session_summary",
  "pdf_import",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidReport(): never {
  throw new RequestValidationError(
    "invalid_report",
    400,
    "Report must contain an approved category, feature, and flagged AI output."
  );
}

export function validateReportInput(value: unknown): Required<AiOutputReportInput> {
  if (!isRecord(value)) invalidReport();
  const category = value.category;
  const feature = value.feature;
  const comment = value.comment ?? "";
  const output = value.output;
  const model = value.model;
  if (
    typeof category !== "string" ||
    !CATEGORIES.has(category as ReportCategory) ||
    typeof feature !== "string" ||
    !FEATURES.has(feature as ReportFeature) ||
    typeof comment !== "string" ||
    comment.length > 1_000 ||
    typeof output !== "string" ||
    output.length < 1 ||
    output.length > 20_000 ||
    typeof model !== "string" ||
    !model.trim()
  ) {
    invalidReport();
  }
  return {
    category: category as ReportCategory,
    comment,
    output,
    feature: feature as ReportFeature,
    model,
  };
}

function nextUtcMidnight(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  ).toISOString();
}

export async function submitReport(
  db: D1Database,
  userHash: string,
  input: AiOutputReportInput,
  now: Date
): Promise<ReportSubmissionResult> {
  const report = validateReportInput(input);
  const reportId = crypto.randomUUID();
  const dayUtc = now.toISOString().slice(0, 10);
  const createdAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1_000
  ).toISOString();

  const [, inserted, usage] = await db.batch<{ id?: string; reports_submitted?: number }>([
    db
      .prepare(
        `INSERT INTO report_usage (user_hash, day_utc, reports_submitted, updated_at)
         VALUES (?1, ?2, 1, ?3)
         ON CONFLICT (user_hash, day_utc) DO UPDATE SET
           reports_submitted = report_usage.reports_submitted + 1,
           updated_at = excluded.updated_at
         WHERE report_usage.reports_submitted < 10
         RETURNING reports_submitted`
      )
      .bind(userHash, dayUtc, createdAt),
    db
      .prepare(
        `INSERT INTO ai_reports
          (id, user_hash, category, comment, output, feature, model, created_at, expires_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
         WHERE changes() = 1
         RETURNING id`
      )
      .bind(
        reportId,
        userHash,
        report.category,
        report.comment,
        report.output,
        report.feature,
        report.model,
        createdAt,
        expiresAt
      ),
    db
      .prepare(
        `SELECT reports_submitted
         FROM report_usage WHERE user_hash = ?1 AND day_utc = ?2`
      )
      .bind(userHash, dayUtc),
  ]);

  const allowed = inserted.results.some((row) => row.id === reportId);
  const used = usage.results[0]?.reports_submitted ?? 0;
  return {
    allowed,
    reportId: allowed ? reportId : null,
    limit: REPORT_LIMIT,
    remaining: Math.max(0, REPORT_LIMIT - used),
    resetAt: nextUtcMidnight(now),
  };
}
