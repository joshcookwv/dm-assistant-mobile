import { getClientId } from "./client-id";
import { getProStatus, requireProAppUserId } from "./purchases";

export const AI_MODEL = "claude-haiku-4-5-20251001";
export const FILES_API_BETA = "files-api-2025-04-14";

const CONFIGURED_PROXY_BASE_URL = process.env.EXPO_PUBLIC_AI_PROXY_BASE_URL?.trim().replace(/\/$/, "");
const AI_PROXY_BASE_URL = CONFIGURED_PROXY_BASE_URL || (__DEV__ ? "http://10.0.2.2:8787" : "");
const AI_PROXY_URL = `${AI_PROXY_BASE_URL}/v1/messages`;
const AI_PROXY_FILES_URL = `${AI_PROXY_BASE_URL}/v1/files`;

export class AiNotConfiguredError extends Error {
  constructor(message: string = "Infernal Codex Pro is required. Upgrade to unlock AI features.") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

class AiRequestError extends Error {}

export async function isAiConfigured(): Promise<boolean> {
  return (await getProStatus()).isPro;
}

export function cachedText(text: string) {
  return { type: "text" as const, text, cache_control: { type: "ephemeral" as const } };
}

interface MessagesParams {
  max_tokens: number;
  system?: unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
  messages: unknown[];
}

function extractErrorMessage(body: any, status: number): string {
  if (typeof body?.error === "string" && typeof body?.message === "string") {
    return body.message;
  }
  if (typeof body?.error?.message === "string") {
    return body.error.message;
  }
  return `Request failed (HTTP ${status})`;
}

async function proxyHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  if (!AI_PROXY_BASE_URL) {
    throw new AiNotConfiguredError("AI service is not configured for this build yet.");
  }

  try {
    const [clientId, appUserId] = await Promise.all([getClientId(), requireProAppUserId()]);
    return {
      "x-client-id": clientId,
      "x-revenuecat-app-user-id": appUserId,
      ...extra,
    };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) throw error;
    if (error instanceof Error && error.message.includes("Pro is required")) {
      throw new AiNotConfiguredError(error.message);
    }
    throw error;
  }
}

/**
 * All AI is a Pro feature and all calls go through the shared Worker. The
 * mobile entitlement check protects normal UI paths; the Worker independently
 * verifies the RevenueCat app-user ID before it spends shared AI quota.
 */
export async function callMessages(params: MessagesParams, betas?: string[]): Promise<any> {
  const body = JSON.stringify({ model: AI_MODEL, ...params });

  try {
    const res = await fetch(AI_PROXY_URL, {
      method: "POST",
      headers: await proxyHeaders({
        "content-type": "application/json",
        ...(betas?.length ? { "anthropic-beta": betas.join(",") } : {}),
      }),
      body,
    });

    const responseBody = await res.json();
    if (!res.ok) {
      throw new AiRequestError(extractErrorMessage(responseBody, res.status));
    }
    return responseBody;
  } catch (error) {
    if (error instanceof AiRequestError || error instanceof AiNotConfiguredError) throw error;
    console.error("[ai] callMessages failed:", error);
    throw new AiRequestError("Couldn't reach Claude. Try again in a moment.");
  }
}

/**
 * Uploads a PDF through the shared Worker and returns Anthropic's file ID.
 * React Native's classic fetch is intentionally enabled in .env because the
 * Expo SDK 56 fetch bridge mishandles this standard FormData file shape.
 */
export async function uploadFile(uri: string, filename: string, mimeType: string): Promise<string> {
  const form = new FormData();
  form.append("file", { uri, name: filename, type: mimeType } as unknown as Blob);

  try {
    const res = await fetch(AI_PROXY_FILES_URL, {
      method: "POST",
      headers: await proxyHeaders(),
      // Fetch derives the multipart boundary from FormData.
      body: form,
    });

    const responseBody = await res.json();
    if (!res.ok) {
      throw new AiRequestError(extractErrorMessage(responseBody, res.status));
    }
    return responseBody.id;
  } catch (error) {
    if (error instanceof AiRequestError || error instanceof AiNotConfiguredError) throw error;
    console.error("[ai] uploadFile failed:", error);
    throw new AiRequestError("Couldn't upload that file. Try again in a moment.");
  }
}

/** Best-effort cleanup of a file uploaded through the shared Worker. */
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await fetch(`${AI_PROXY_FILES_URL}/${fileId}`, {
      method: "DELETE",
      headers: await proxyHeaders(),
    });
  } catch {
    // Cleanup should never hide the result of the extraction it follows.
  }
}
