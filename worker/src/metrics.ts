export interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

function tokenCount(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function usageFromResponseBody(body: string): AnthropicUsage | undefined {
  try {
    const parsed = JSON.parse(body) as { usage?: AnthropicUsage };
    return parsed && typeof parsed === "object" ? parsed.usage : undefined;
  } catch {
    return undefined;
  }
}

export async function recordUsage(
  db: D1Database,
  feature: string,
  usage: AnthropicUsage | undefined,
  error: boolean,
  now: Date
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO daily_metrics
        (day_utc, feature, requests, input_tokens, output_tokens, errors)
       VALUES (?1, ?2, 1, ?3, ?4, ?5)
       ON CONFLICT (day_utc, feature) DO UPDATE SET
         requests = daily_metrics.requests + 1,
         input_tokens = daily_metrics.input_tokens + excluded.input_tokens,
         output_tokens = daily_metrics.output_tokens + excluded.output_tokens,
         errors = daily_metrics.errors + excluded.errors`
    )
    .bind(
      now.toISOString().slice(0, 10),
      feature,
      tokenCount(usage?.input_tokens),
      tokenCount(usage?.output_tokens),
      error ? 1 : 0
    )
    .run();
}
