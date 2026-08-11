export const STANDARD_BODY_LIMIT_BYTES = 256 * 1024;
export const STANDARD_OUTPUT_TOKEN_LIMIT = 800;
export const PDF_OUTPUT_TOKEN_LIMIT = 8192;
export const ALLOWED_MODEL = "claude-haiku-4-5-20251001";
export const FILES_BETA = "files-api-2025-04-14";

export class RequestValidationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RequestValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestValidationError("body_too_large", 413, "Request body is too large.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RequestValidationError("body_too_large", 413, "Request body is too large.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestValidationError("invalid_json", 400, "Request body must be valid JSON.");
  }
}

export function validateBetaHeader(raw: string | null, allowFiles: boolean): string | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowFiles || values.length !== 1 || values[0] !== FILES_BETA) {
    throw new RequestValidationError(
      "beta_not_allowed",
      400,
      "Requested anthropic-beta value isn't supported."
    );
  }
  return FILES_BETA;
}

function containsDocumentBlock(messages: unknown[]): boolean {
  return messages.some((message) => {
    if (!isRecord(message) || !Array.isArray(message.content)) return false;
    return message.content.some((block) => {
      if (!isRecord(block)) return false;
      if (block.type === "document" || block.type === "file") return true;
      return isRecord(block.source) && block.source.type === "file";
    });
  });
}

export function validateStandardRequest(body: unknown): Record<string, unknown> {
  if (!isRecord(body) || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new RequestValidationError(
      "invalid_request",
      400,
      "Request body must include a messages array."
    );
  }
  if (body.model !== undefined && body.model !== ALLOWED_MODEL) {
    throw new RequestValidationError(
      "model_not_allowed",
      400,
      `Only ${ALLOWED_MODEL} is available through the shared proxy.`
    );
  }
  if (
    !Number.isInteger(body.max_tokens) ||
    (body.max_tokens as number) < 1 ||
    (body.max_tokens as number) > STANDARD_OUTPUT_TOKEN_LIMIT
  ) {
    throw new RequestValidationError(
      "token_limit_exceeded",
      400,
      `Standard AI output is limited to ${STANDARD_OUTPUT_TOKEN_LIMIT} tokens.`
    );
  }
  if (containsDocumentBlock(body.messages)) {
    throw new RequestValidationError(
      "file_not_allowed",
      400,
      "Files and documents require the protected PDF job flow."
    );
  }
  return { ...body, model: ALLOWED_MODEL };
}
