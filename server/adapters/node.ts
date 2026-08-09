import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { handleGenerateRequest, type Env } from "../src/handler";
import { MemoryRateLimiter } from "../src/rate-limit";

// A single Node process (Fly.io, Render, a plain VPS) has one shared
// memory space, so — unlike the edge adapters — this limiter is accurate
// as long as you run one instance. Scaling to multiple instances brings
// back the cross-instance caveat from rate-limit.ts.
const rateLimiter = new MemoryRateLimiter(20, 60 * 60 * 1000); // 20 requests/hour/user

const env: Env = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  REVENUECAT_SECRET_KEY: process.env.REVENUECAT_SECRET_KEY ?? "",
};

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  if (req.method !== "GET" && req.method !== "HEAD") {
    for await (const chunk of req) chunks.push(chunk as Buffer);
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  return new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers,
    body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
  });
}

async function sendWebResponse(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
}

const server = createServer((req, res) => {
  if (new URL(req.url ?? "/", "http://localhost").pathname !== "/generate") {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }
  toWebRequest(req)
    .then((webRequest) => handleGenerateRequest(webRequest, { env, rateLimiter }))
    .then((webResponse) => sendWebResponse(webResponse, res))
    .catch((err) => {
      res.statusCode = 500;
      res.end(err instanceof Error ? err.message : "Internal error");
    });
});

const port = Number(process.env.PORT ?? 8787);
server.listen(port, () => {
  console.log(`AI proxy listening on :${port}`);
});
