import { getApiKey } from "./secure-settings";
import { getClientId } from "./client-id";
import { getUseSharedAi } from "./settings";

export const AI_MODEL = "claude-haiku-4-5-20251001";

const ANTHROPIC_DIRECT_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_FILES_URL = "https://api.anthropic.com/v1/files";
const ANTHROPIC_VERSION = "2023-06-01";

// Files API is still beta — required on both the upload and any messages.create
// call that references the resulting file_id. Uploads always go direct to
// Anthropic with a personal key (see uploadFile below), so this header only
// ever needs to reach the direct-fetch branch of callMessages, never the
// proxy Worker branch.
export const FILES_API_BETA = "files-api-2025-04-14";

/**
 * Local `wrangler dev` address for the AI proxy Worker (see worker/). The
 * Android emulator (Pixel8_API35, per start-emulator.bat) reaches the host
 * machine's loopback via this special alias — plain "localhost" from
 * inside the emulator means the emulator itself, not the host running
 * `wrangler dev`. A physical device instead of the emulator would need
 * the host's LAN IP here instead. Swap this to the real deployed Worker
 * URL only after the deploy checkpoint actually happens (see
 * docs/cloudflare-backend-plan.md) — single obvious constant, deliberately.
 */
const AI_PROXY_URL = "http://10.0.2.2:8787/v1/messages";

export class AiNotConfiguredError extends Error {
  constructor(message: string = "No Claude API key configured yet. Add one in Settings.") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

export async function isAiConfigured(): Promise<boolean> {
  return Boolean(await getApiKey()) || getUseSharedAi();
}

/**
 * Marks a block of text as cacheable so repeated calls that share this exact
 * prefix (e.g. static instructions/tool schemas sent on every request) are
 * served from Anthropic's prompt cache instead of being recomputed/rebilled
 * each time.
 */
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

/**
 * Extracts a user-facing message from a non-2xx JSON error body, handling
 * both shapes this app can now receive:
 *  - Anthropic's native shape:      { error: { type, message } }
 *  - The AI proxy Worker's shape:   { error: "code", message: "..." }
 * The Worker's `error` is a short string code, not an object, so it needs
 * its own check first — falling straight through to `body?.error?.message`
 * would read `undefined` off a string and silently drop the Worker's
 * actual (often actionable, e.g. the 429 rate-limit text) message.
 */
function extractErrorMessage(body: any, status: number): string {
  if (typeof body?.error === "string" && typeof body?.message === "string") {
    return body.message;
  }
  if (typeof body?.error?.message === "string") {
    return body.error.message;
  }
  return `Request failed (HTTP ${status})`;
}

/**
 * Fetch to either Anthropic directly or this app's AI proxy Worker,
 * depending on whether the user has set a personal API key in Settings —
 * plain fetch rather than @anthropic-ai/sdk to avoid the SDK's Node-oriented
 * assumptions; React Native isn't subject to browser CORS, so an
 * authenticated POST works directly either way.
 *
 * Three states (Josh's addendum to docs/cloudflare-backend-plan.md, added
 * mid-build — see src/lib/settings.ts's getUseSharedAi for the Phase-1/
 * Phase-2 caveat on that toggle):
 * - Personal key set: calls Anthropic directly, exactly as before this
 *   proxy existed — unchanged behavior, unlimited use, key never leaves
 *   the device except straight to Anthropic. Takes priority regardless of
 *   the toggle below.
 * - No personal key, "Use Free Shared AI" toggle on: calls the Worker
 *   instead, identifying this device with an anonymous client ID rather
 *   than a real API key. Subject to the Worker's shared daily rate limit;
 *   a 429 surfaces via the normal thrown-Error path with the Worker's own
 *   friendly message text (which mentions "Settings", so existing
 *   AiError-style UI that deep-links on that word picks it up with no
 *   extra wiring).
 * - No personal key, toggle off (the default): don't call anything —
 *   throw AiNotConfiguredError with a message pointing at both remedies,
 *   surfaced the same way a real call failure would be.
 *
 * `betas` adds an anthropic-beta header (e.g. to reference a Files API
 * file_id in a document block) — only meaningful on the direct-to-Anthropic
 * branch, since a beta feature that needs it (see uploadFile below) always
 * requires a personal key in the first place, unconditionally — uploadFile
 * never consults the toggle at all, so this function's toggle check has no
 * effect on that path (uploadFile's own check always runs first and either
 * throws or guarantees apiKey is set before callMessages is ever reached
 * from extractFromPdf).
 */
export async function callMessages(params: MessagesParams, betas?: string[]): Promise<any> {
  const apiKey = await getApiKey();
  if (!apiKey && !getUseSharedAi()) {
    throw new AiNotConfiguredError(
      "Add your own API key in Settings, or turn on Free Shared AI, to use this."
    );
  }

  const body = JSON.stringify({ model: AI_MODEL, ...params });

  const res = apiKey
    ? await fetch(ANTHROPIC_DIRECT_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          ...(betas?.length ? { "anthropic-beta": betas.join(",") } : {}),
        },
        body,
      })
    : await fetch(AI_PROXY_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-client-id": await getClientId(),
        },
        body,
      });

  const responseBody = await res.json();
  if (!res.ok) {
    throw new Error(extractErrorMessage(responseBody, res.status));
  }
  return responseBody;
}

/**
 * Uploads a file to Anthropic's Files API and returns its file_id, for
 * referencing in a Messages API document/image block instead of inlining as
 * base64. Two problems this avoids: base64 inflates size ~33%, so anything
 * over ~24MB raw would blow the 32MB total-request-size cap on inline
 * base64 documents; and reading a large file into a base64 JS string
 * on-device is itself memory-heavy, independent of the wire limit.
 *
 * Always goes direct to Anthropic with a personal key — unlike callMessages,
 * there is no proxy-Worker fallback. A shared anonymous proxy accepting
 * arbitrary large file uploads on someone else's behalf is a cost/abuse
 * surface the proxy work hasn't taken on, so this intentionally doesn't
 * route through it even once the Worker is live.
 *
 * `uri` is a local file URI (e.g. from expo-document-picker) — RN's fetch/
 * FormData understands the {uri, name, type} shape natively and streams the
 * file from disk at the native layer rather than loading it into JS first.
 */
export async function uploadFile(uri: string, filename: string, mimeType: string): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AiNotConfiguredError();

  const form = new FormData();
  form.append("file", { uri, name: filename, type: mimeType } as unknown as Blob);

  const res = await fetch(ANTHROPIC_FILES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-beta": FILES_API_BETA,
      // No content-type — fetch derives the multipart boundary from the FormData body itself.
    },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(extractErrorMessage(body, res.status));
  }
  return body.id;
}

/** Best-effort delete of a previously uploaded file. Never throws. */
export async function deleteFile(fileId: string): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey) return;
  try {
    await fetch(`${ANTHROPIC_FILES_URL}/${fileId}`, {
      method: "DELETE",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": FILES_API_BETA,
      },
    });
  } catch {
    // Cleanup is opportunistic — a failed delete shouldn't surface as a
    // user-facing error when the extraction it was cleaning up after already
    // succeeded or failed on its own terms.
  }
}
