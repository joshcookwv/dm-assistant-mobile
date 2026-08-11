import type { CreditState, ReservationResult } from "./types";

const DAILY_LIMIT = 10 as const;
const CREDIT_COST = { standard: 1, pdf: 5 } as const;

interface QuotaBatchRow {
  credits_used?: number;
  id?: string;
}

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function nextUtcMidnight(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  ).toISOString();
}

function creditState(used: number, resetAt: string): CreditState {
  return {
    limit: DAILY_LIMIT,
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
    resetAt,
  };
}

export async function reserveCredits(
  db: D1Database,
  userHash: string,
  kind: "standard" | "pdf",
  now: Date
): Promise<ReservationResult> {
  const credits = CREDIT_COST[kind];
  const dayUtc = utcDay(now);
  const timestamp = now.toISOString();
  const resetAt = nextUtcMidnight(now);
  const reservationId = crypto.randomUUID();

  const [, reservationResult, currentUsageResult] = await db.batch<QuotaBatchRow>([
    db
      .prepare(
        `INSERT INTO quota_usage (user_hash, day_utc, credits_used, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (user_hash, day_utc) DO UPDATE SET
           credits_used = quota_usage.credits_used + excluded.credits_used,
           updated_at = excluded.updated_at
         WHERE quota_usage.credits_used + excluded.credits_used <= 10
         RETURNING credits_used`
      )
      .bind(userHash, dayUtc, credits, timestamp),
    db
      .prepare(
        `INSERT INTO quota_reservations
           (id, user_hash, day_utc, credits, kind, status, created_at, expires_at)
         SELECT ?1, ?2, ?3, ?4, ?5, 'reserved', ?6, ?7
         WHERE changes() = 1
         RETURNING id`
      )
      .bind(reservationId, userHash, dayUtc, credits, kind, timestamp, resetAt),
    db
      .prepare(
        `SELECT credits_used
         FROM quota_usage
         WHERE user_hash = ?1 AND day_utc = ?2`
      )
      .bind(userHash, dayUtc),
  ]);

  const allowed = reservationResult.results.some((row) => row.id === reservationId);
  const used = currentUsageResult.results[0]?.credits_used ?? 0;
  return {
    allowed,
    reservationId: allowed ? reservationId : null,
    credits: creditState(used, resetAt),
  };
}

export async function completeReservation(
  db: D1Database,
  reservationId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE quota_reservations
       SET status = 'completed'
       WHERE id = ?1 AND status = 'reserved'`
    )
    .bind(reservationId)
    .run();
}

export async function refundCredits(
  db: D1Database,
  reservationId: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE quota_reservations
         SET status = 'refunded'
         WHERE id = ?1 AND status = 'reserved'`
      )
      .bind(reservationId),
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
             SELECT user_hash, day_utc
             FROM quota_reservations
             WHERE id = ?1
           )`
      )
      .bind(reservationId, timestamp),
  ]);
}
