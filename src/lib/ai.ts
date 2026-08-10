import { File } from "expo-file-system";

import { getApiKey } from "./secure-settings";
import { getClientId } from "./client-id";
import { getUseSharedAi } from "./settings";

export const AI_MODEL = "claude-haiku-4-5-20251001";

const ANTHROPIC_DIRECT_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_FILES_URL = "https://api.anthropic.com/v1/files";
const ANTHROPIC_VERSION = "2023-06-01";

// Files API is still beta — required on both the upload and any messages.create
// call that references the resulting file_id. As of the 2026-08-09 "PDF
// import too" doc update, uploads can go through either the direct-to-
// Anthropic branch or the proxy Worker branch (see uploadFile below) — this
// header is forwarded on both.
export const FILES_API_BETA = "files-api-2025-04-14";

/**
 * Local `wrangler dev` address for the AI proxy Worker (see worker/). The
 * Android emulator (Pixel8_API35, per start-emulator.bat) reaches the host
 * machine's loopback via this special alias — plain "localhost" from
 * inside the emulator means the emulator itself, not the host running
 * `wrangler dev`. A physical device instead of the emulator would need
 * the host's LAN IP here instead. Swap these to the real deployed Worker
 * URL only after the deploy checkpoint actually happens (see
 * docs/cloudflare-backend-plan.md) — single obvious constants, deliberately.
 */
const AI_PROXY_URL = "http://10.0.2.2:8787/v1/messages";
const AI_PROXY_FILES_URL = "http://10.0.2.2:8787/v1/files";

export class AiNotConfiguredError extends Error {
  constructor(message: string = "No Claude API key configured yet. Add one in Settings.") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

/**
 * Marks an Error's message as already vetted/user-facing — either one of
 * this app's own deliberately-written strings (extractErrorMessage's
 * cleaned-up HTTP error text, including the Worker's 429 copy) or the
 * generic fallback below. callMessages/uploadFile catch anything NOT
 * already one of these and replace it with that fallback instead of
 * letting it reach the screen verbatim.
 *
 * Added after dm-reviewer's on-device PDF-import pass hit the
 * pre-fix "Unsupported FormDataPart implementation" native error and it
 * surfaced raw, character-for-character, in the UI — technically accurate
 * but meaningless to a DM mid-session, who reads it as "the app is broken"
 * rather than a specific, actionable failure. That exact bug is fixed
 * (see uploadFile below), but the same passthrough would happen for *any*
 * unanticipated failure — a native exception, a JSON parse failure, a raw
 * network rejection reason — since none of those are written for an
 * end-user to read. Not exported: callers only ever see `.message`,
 * already guaranteed friendly by the time it gets there either way.
 */
class AiRequestError extends Error {}

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
 * file_id in a document block) — forwarded on both branches now. Before the
 * 2026-08-09 "PDF import too" update this only ever needed to reach the
 * direct branch, since uploadFile was personal-key-only and so the proxy
 * branch here was never reached from extractFromPdf at all; now that
 * uploadFile shares the same three-state logic, a no-key+toggle-on PDF
 * import reaches this proxy branch needing the Files API beta too, so it's
 * sent to the Worker the same way — the Worker itself allowlists which
 * beta values it'll relay on to Anthropic (see worker/src/index.ts).
 */
export async function callMessages(params: MessagesParams, betas?: string[]): Promise<any> {
  const apiKey = await getApiKey();
  if (!apiKey && !getUseSharedAi()) {
    throw new AiNotConfiguredError(
      "Add your own API key in Settings, or turn on Free Shared AI, to use this."
    );
  }

  const body = JSON.stringify({ model: AI_MODEL, ...params });

  try {
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
            ...(betas?.length ? { "anthropic-beta": betas.join(",") } : {}),
          },
          body,
        });

    const responseBody = await res.json();
    if (!res.ok) {
      throw new AiRequestError(extractErrorMessage(responseBody, res.status));
    }
    return responseBody;
  } catch (err) {
    if (err instanceof AiRequestError) throw err;
    console.error("[ai] callMessages failed:", err);
    throw new AiRequestError("Couldn't reach Claude. Try again in a moment.");
  }
}

/**
 * Uploads a file to Anthropic's Files API and returns its file_id, for
 * referencing in a Messages API document/image block instead of inlining as
 * base64. Two problems this avoids: base64 inflates size ~33%, so anything
 * over ~24MB raw would blow the 32MB total-request-size cap on inline
 * base64 documents; and reading a large file into a base64 JS string
 * on-device is itself memory-heavy, independent of the wire limit.
 *
 * Same three-state branching as callMessages, as of the 2026-08-09 "PDF
 * import too" doc update — previously this was unconditionally
 * personal-key-only. Note this only changes Phase 1's temporary, open,
 * must-not-ship-as-is toggle (see getUseSharedAi's doc comment); Addendum 2
 * still means free (non-subscribed, post-launch) users get zero proxy
 * access to this once Phase 2's real entitlement gate replaces the toggle.
 *
 * `uri` is a local file URI (e.g. from expo-document-picker, which copies
 * the picked file into FileSystem.CacheDirectory by default — so this is a
 * plain sandboxed file, not a raw content:// SAF URI).
 *
 * This has been through two broken approaches before landing here — both
 * left as history in case either resurfaces after a future SDK bump:
 *
 * 1. Plain `fetch` + `FormData` (RN's textbook file-upload idiom, and what
 *    callMessages still uses for its JSON-only calls). Threw "Unsupported
 *    FormDataPart implementation" on-device, before any network I/O, on
 *    both the direct and proxy branches equally. Root cause, traced
 *    through source: this Expo SDK installs its own WinterCG-compliant
 *    fetch globally (node_modules/expo/src/winter/fetch/), superseding RN
 *    core's classic bridge fetch app-wide. Its FormData interop shim
 *    (winter/fetch/convertFormData.ts) only recognizes RN FormData parts
 *    keyed `string`, `file`, or `blob` — but RN's own FormData.getParts()
 *    (Libraries/Network/FormData.js) spreads a `{uri, name, type}` value
 *    straight onto the part, so the resulting key is `uri`, silently
 *    converted to `undefined` by the shim and rejected by the type checks
 *    after it.
 * 2. expo-file-system's own `File.upload()` (native multipart, bypasses
 *    fetch/FormData entirely) — the fix for #1, and genuinely the right
 *    call in principle: same File API local-files.ts/srd.ts already use
 *    elsewhere. But it throws its own native-bridge error before any
 *    network I/O: "Value for headers cannot be cast from Double to
 *    ReadableNativeMap" inside FileSystemUploadTask.start. Traced through
 *    source: the Kotlin `UploadTaskOptions` record (expo-file-system's
 *    android/.../FileSystemUploadTask.kt) is annotated `@OptimizedRecord`,
 *    and declares fields in the order headers/httpMethod/uploadType/
 *    fieldName/mimeType/parameters — a *different* order than the JS-side
 *    `nativeOpts` object NetworkTasks.ts's UploadTask.uploadAsync()
 *    constructs internally (httpMethod/uploadType/headers/...). The only
 *    numeric (Double-typed) field either side has is `uploadType`, which
 *    is exactly the value the error reports landing in `headers`'s slot —
 *    consistent with some positional mismatch in however @OptimizedRecord
 *    deserializes on this installed expo-modules-core version. This isn't
 *    fixable from a call site: NetworkTasks.ts builds that object
 *    internally regardless of what shape is passed into .upload().
 *
 * Current approach: hand-build the multipart/form-data bytes and send them
 * as a plain Uint8Array fetch body. Confirmed via source
 * (winter/fetch/RequestUtils.ts's normalizeBodyInitAsync) that an
 * ArrayBufferView body is handled directly — converted straight to bytes
 * for the native request layer — without going through either of the two
 * broken paths above. The Worker's /v1/files handler already streams
 * whatever it receives through unparsed, so this needed no Worker-side
 * change, same as approach #2 didn't.
 */
export async function uploadFile(uri: string, filename: string, mimeType: string): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey && !getUseSharedAi()) {
    throw new AiNotConfiguredError(
      "Add your own API key in Settings, or turn on Free Shared AI, to use this."
    );
  }

  const headers: Record<string, string> = apiKey
    ? {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": FILES_API_BETA,
      }
    : { "x-client-id": await getClientId() };

  try {
    const fileBytes = new Uint8Array(await new File(uri).arrayBuffer());

    // Mirrors winter/fetch/convertFormData.ts's own createBoundary()/
    // encodeFilename() conventions so this looks like nothing unusual to
    // whatever parses it on the other end.
    const boundary = `----dmAssistant${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const encoder = new TextEncoder();
    const head = encoder.encode(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${encodeURIComponent(filename.replace(/\//g, "_"))}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
    );
    const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
    const multipartBody = new Uint8Array(head.length + fileBytes.length + tail.length);
    multipartBody.set(head, 0);
    multipartBody.set(fileBytes, head.length);
    multipartBody.set(tail, head.length + fileBytes.length);

    const res = await fetch(apiKey ? ANTHROPIC_FILES_URL : AI_PROXY_FILES_URL, {
      method: "POST",
      headers: { ...headers, "content-type": `multipart/form-data; boundary=${boundary}` },
      body: multipartBody,
    });

    const body = await res.json();
    if (!res.ok) {
      throw new AiRequestError(extractErrorMessage(body, res.status));
    }
    return body.id;
  } catch (err) {
    if (err instanceof AiRequestError) throw err;
    console.error("[ai] uploadFile failed:", err);
    throw new AiRequestError("Couldn't upload that file. Try again in a moment.");
  }
}

/**
 * Best-effort delete of a previously uploaded file. Never throws.
 *
 * Re-derives the same apiKey/toggle branch uploadFile would have taken
 * rather than remembering which path the matching upload used — in
 * practice these are always called moments apart in the same operation
 * (see pdf-import.ts's extractFromPdf), so the state can't realistically
 * change in between. A file uploaded via the shared proxy can only be
 * deleted via that same proxy (it belongs to the shared account, not
 * whatever's read here), so this has to match, not just "have a key".
 */
export async function deleteFile(fileId: string): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey && !getUseSharedAi()) return;
  try {
    if (apiKey) {
      await fetch(`${ANTHROPIC_FILES_URL}/${fileId}`, {
        method: "DELETE",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-beta": FILES_API_BETA,
        },
      });
    } else {
      await fetch(`${AI_PROXY_FILES_URL}/${fileId}`, {
        method: "DELETE",
        headers: { "x-client-id": await getClientId() },
      });
    }
  } catch {
    // Cleanup is opportunistic — a failed delete shouldn't surface as a
    // user-facing error when the extraction it was cleaning up after already
    // succeeded or failed on its own terms.
  }
}
