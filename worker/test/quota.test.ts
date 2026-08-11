import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import {
  completeReservation,
  refundCredits,
  reserveCredits,
} from "../src/quota";

const TEST_NOW = new Date("2026-08-11T12:00:00.000Z");

async function storedUsage(userHash: string, dayUtc: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT credits_used FROM quota_usage WHERE user_hash = ?1 AND day_utc = ?2"
  )
    .bind(userHash, dayUtc)
    .first<{ credits_used: number }>();
  return row?.credits_used ?? 0;
}

async function reservationCount(userHash: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM quota_reservations WHERE user_hash = ?1"
  )
    .bind(userHash)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

describe("reserveCredits", () => {
  it("allows ten one-credit requests and denies the eleventh", async () => {
    const userHash = "standard-user";
    const results = [];
    for (let index = 0; index < 11; index += 1) {
      results.push(await reserveCredits(env.DB, userHash, "standard", TEST_NOW));
    }

    expect(results.slice(0, 10).every((result) => result.allowed)).toBe(true);
    expect(results[9].credits).toEqual({
      limit: 10,
      used: 10,
      remaining: 0,
      resetAt: "2026-08-12T00:00:00.000Z",
    });
    expect(results[10]).toMatchObject({
      allowed: false,
      reservationId: null,
      credits: { limit: 10, used: 10, remaining: 0 },
    });
    expect(await storedUsage(userHash, "2026-08-11")).toBe(10);
    expect(await reservationCount(userHash)).toBe(10);
  });

  it("charges five credits per PDF job", async () => {
    const userHash = "pdf-user";
    const first = await reserveCredits(env.DB, userHash, "pdf", TEST_NOW);
    const second = await reserveCredits(env.DB, userHash, "pdf", TEST_NOW);
    const third = await reserveCredits(env.DB, userHash, "pdf", TEST_NOW);

    expect(first).toMatchObject({ allowed: true, credits: { used: 5, remaining: 5 } });
    expect(second).toMatchObject({ allowed: true, credits: { used: 10, remaining: 0 } });
    expect(third).toMatchObject({ allowed: false, credits: { used: 10, remaining: 0 } });
    expect(await reservationCount(userHash)).toBe(2);
  });

  it("resets usage at UTC midnight", async () => {
    const userHash = "utc-user";
    const beforeMidnight = new Date("2026-08-11T23:59:59.000Z");
    const afterMidnight = new Date("2026-08-12T00:00:01.000Z");

    await reserveCredits(env.DB, userHash, "pdf", beforeMidnight);
    await reserveCredits(env.DB, userHash, "pdf", beforeMidnight);
    const nextDay = await reserveCredits(env.DB, userHash, "standard", afterMidnight);

    expect(nextDay).toMatchObject({
      allowed: true,
      credits: { limit: 10, used: 1, remaining: 9 },
    });
    expect(nextDay.credits.resetAt).toBe("2026-08-13T00:00:00.000Z");
  });

  it("never exceeds ten credits under concurrent reservation attempts", async () => {
    const userHash = "concurrent-user";
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        reserveCredits(env.DB, userHash, "standard", TEST_NOW)
      )
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(10);
    expect(results.filter((result) => !result.allowed)).toHaveLength(10);
    expect(await storedUsage(userHash, "2026-08-11")).toBe(10);
    expect(await reservationCount(userHash)).toBe(10);
  });
});

describe("reservation finalization", () => {
  it("refunds a reserved PDF job exactly once", async () => {
    const userHash = "refund-user";
    const reservation = await reserveCredits(env.DB, userHash, "pdf", TEST_NOW);
    expect(reservation.reservationId).not.toBeNull();

    await refundCredits(env.DB, reservation.reservationId!);
    await refundCredits(env.DB, reservation.reservationId!);

    expect(await storedUsage(userHash, "2026-08-11")).toBe(0);
    const row = await env.DB.prepare(
      "SELECT status FROM quota_reservations WHERE id = ?1"
    )
      .bind(reservation.reservationId)
      .first<{ status: string }>();
    expect(row?.status).toBe("refunded");
  });

  it("does not refund a completed reservation", async () => {
    const userHash = "completed-user";
    const reservation = await reserveCredits(env.DB, userHash, "standard", TEST_NOW);
    expect(reservation.reservationId).not.toBeNull();

    await completeReservation(env.DB, reservation.reservationId!);
    await refundCredits(env.DB, reservation.reservationId!);

    expect(await storedUsage(userHash, "2026-08-11")).toBe(1);
  });
});
