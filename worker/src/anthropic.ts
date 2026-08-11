import { FILES_BETA } from "./request-validation";

const ANTHROPIC_API_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

function headers(env: Pick<Env, "ANTHROPIC_API_KEY">, beta?: string): HeadersInit {
  return {
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": ANTHROPIC_VERSION,
    ...(beta ? { "anthropic-beta": beta } : {}),
  };
}

export async function sendAnthropicMessage(
  body: Record<string, unknown>,
  env: Pick<Env, "ANTHROPIC_API_KEY">,
  beta?: string
): Promise<Response> {
  return fetch(`${ANTHROPIC_API_BASE_URL}/messages`, {
    method: "POST",
    headers: { ...headers(env, beta), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function uploadAnthropicPdf(
  file: File,
  env: Pick<Env, "ANTHROPIC_API_KEY">
): Promise<Response> {
  const form = new FormData();
  form.set("file", file, file.name);
  return fetch(`${ANTHROPIC_API_BASE_URL}/files`, {
    method: "POST",
    headers: headers(env, FILES_BETA),
    body: form,
  });
}

export async function deleteAnthropicFile(
  fileId: string,
  env: Pick<Env, "ANTHROPIC_API_KEY">
): Promise<Response> {
  return fetch(`${ANTHROPIC_API_BASE_URL}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: headers(env, FILES_BETA),
  });
}
