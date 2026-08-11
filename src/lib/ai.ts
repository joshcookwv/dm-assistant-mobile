import { updateAiCreditsFromHeaders } from "@/providers/ai-credits";

import { AiRequestError, parseAiProxyResponse } from "./ai-contract";
import { getProStatus, requireProAppUserId } from "./purchases";

export const AI_MODEL = "claude-haiku-4-5-20251001";

const CONFIGURED_PROXY_BASE_URL = process.env.EXPO_PUBLIC_AI_PROXY_BASE_URL?.trim().replace(/\/$/, "");
const AI_PROXY_BASE_URL = CONFIGURED_PROXY_BASE_URL || (__DEV__ ? "http://10.0.2.2:8787" : "");

export class AiNotConfiguredError extends Error {
  constructor(message: string = "Infernal Codex Pro is required. Upgrade to unlock AI features.") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

export { AiRequestError } from "./ai-contract";

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

export interface PdfExtractionParams {
  prompt: string;
  system?: string | unknown[];
  tools?: unknown[];
  tool_choice?: Record<string, unknown>;
}

async function proxyHeaders(initial?: HeadersInit): Promise<Headers> {
  if (!AI_PROXY_BASE_URL) {
    throw new AiNotConfiguredError("AI service is not configured for this build yet.");
  }
  try {
    const appUserId = await requireProAppUserId();
    const headers = new Headers(initial);
    headers.set("x-revenuecat-app-user-id", appUserId);
    return headers;
  } catch (error) {
    if (error instanceof AiNotConfiguredError) throw error;
    if (error instanceof Error && error.message.includes("Pro is required")) {
      throw new AiNotConfiguredError(error.message);
    }
    throw error;
  }
}

export async function requestAiProxy<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${AI_PROXY_BASE_URL}${path}`, {
      ...init,
      headers: await proxyHeaders(init.headers),
    });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) throw error;
    throw new AiRequestError("Couldn't reach the AI service. Try again in a moment.", 0, null);
  }
  updateAiCreditsFromHeaders(response.headers);
  return parseAiProxyResponse<T>(response);
}

export async function callMessages(params: MessagesParams): Promise<any> {
  return requestAiProxy("/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, ...params }),
  });
}

export async function createPdfJob(): Promise<string> {
  const response = await requestAiProxy<{ jobId?: unknown }>("/v1/pdf-jobs", {
    method: "POST",
  });
  if (typeof response.jobId !== "string" || !response.jobId) {
    throw new AiRequestError("The PDF job could not be created.", 502, null);
  }
  return response.jobId;
}

export async function uploadPdfJob(
  jobId: string,
  uri: string,
  filename: string,
  mimeType: string
): Promise<void> {
  const form = new FormData();
  form.append("file", { uri, name: filename, type: mimeType } as unknown as Blob);
  await requestAiProxy(`/v1/pdf-jobs/${encodeURIComponent(jobId)}/file`, {
    method: "PUT",
    body: form,
  });
}

export async function extractPdfJob(
  jobId: string,
  input: PdfExtractionParams
): Promise<any> {
  return requestAiProxy(`/v1/pdf-jobs/${encodeURIComponent(jobId)}/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deletePdfJob(jobId: string): Promise<void> {
  try {
    await requestAiProxy(`/v1/pdf-jobs/${encodeURIComponent(jobId)}/file`, {
      method: "DELETE",
    });
  } catch {
    // Cleanup must never hide the extraction result or its original error.
  }
}
