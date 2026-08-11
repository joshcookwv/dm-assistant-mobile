export interface AiCreditState {
  limit: number;
  remaining: number;
  resetAt: string;
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly credits: AiCreditState | null,
    readonly code?: string
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

export function parseCreditHeaders(headers: Headers): AiCreditState | null {
  const rawLimit = headers.get("x-ai-credits-limit");
  const rawRemaining = headers.get("x-ai-credits-remaining");
  const resetAt = headers.get("x-ai-credits-reset");
  if (rawLimit === null || rawRemaining === null || resetAt === null) return null;
  const limit = Number(rawLimit);
  const remaining = Number(rawRemaining);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(remaining) ||
    remaining < 0 ||
    remaining > limit ||
    !resetAt ||
    !Number.isFinite(Date.parse(resetAt))
  ) {
    return null;
  }
  return { limit, remaining, resetAt };
}

function errorMessage(body: unknown, status: number): { message: string; code?: string } {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string" && typeof record.message === "string") {
      return { message: record.message, code: record.error };
    }
    if (
      typeof record.error === "object" &&
      record.error !== null &&
      typeof (record.error as Record<string, unknown>).message === "string"
    ) {
      return { message: (record.error as Record<string, string>).message };
    }
  }
  return { message: `Request failed (HTTP ${status})` };
}

export async function parseAiProxyResponse<T = unknown>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const error = errorMessage(body, response.status);
    throw new AiRequestError(
      error.message,
      response.status,
      parseCreditHeaders(response.headers),
      error.code
    );
  }
  return body as T;
}
