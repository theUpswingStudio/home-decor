import { createServer } from "node:http";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import type { Page, Route } from "@playwright/test";

export async function startConsultationStream(
  page: Page,
  { target = "chat", ignoreAbort = false }: {
    readonly target?: "chat" | "preview-error";
    readonly ignoreAbort?: boolean;
  } = {},
) {
  // Chrome requires this permission for a second loopback origin. Playwright
  // disposes this isolated context after the test; production CSP is unchanged.
  await page.context().grantPermissions(["local-network-access"], { origin: "http://127.0.0.1:3100" });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let markFirstChunk!: () => void;
  const firstChunk = new Promise<void>((resolve) => { markFirstChunk = resolve; });
  let markDisconnected!: () => void;
  const disconnected = new Promise<void>((resolve) => { markDisconnected = resolve; });
  let requestCount = 0;
  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", request.headers.origin ?? "http://127.0.0.1:3100");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", request.headers["access-control-request-headers"] ?? "content-type");
    response.setHeader("Cache-Control", "no-store");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    if (request.method !== "POST" || request.url !== "/stream") {
      response.writeHead(404).end();
      return;
    }
    requestCount += 1;
    response.once("close", markDisconnected);
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      if (target === "preview-error") {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.write('{"error":"Obsolete preview');
        markFirstChunk();
        await gate;
        response.end(' failure"}');
        return;
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString()) as { messages: UIMessage[] };
      const stream = createUIMessageStream({
        originalMessages: payload.messages,
        async execute({ writer }) {
          writer.write({ type: "text-start", id: "review-stream-text" });
          writer.write({ type: "text-delta", id: "review-stream-text", delta: "A streamed room suggestion" });
          await gate;
          writer.write({ type: "text-delta", id: "review-stream-text", delta: " with space to move." });
          writer.write({ type: "text-end", id: "review-stream-text" });
        },
      });
      const streamed = createUIMessageStreamResponse({ stream });
      streamed.headers.forEach((value, key) => response.setHeader(key, value));
      response.flushHeaders();
      const reader = streamed.body!.getReader();
      try {
        while (!response.destroyed) {
          const { done, value } = await reader.read();
          if (done) break;
          response.write(value);
          if (Buffer.from(value).toString().includes("A streamed room suggestion")) markFirstChunk();
        }
      } finally {
        await reader.cancel();
      }
      response.end();
    } catch (error) {
      response.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The test stream server did not start.");
  const url = `http://127.0.0.1:${address.port}/stream`;
  const documentPattern = "**/ai-consultation";
  const allowTestStream = async (route: Route) => {
    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const headers = response.headers();
    const policy = headers["content-security-policy"];
    if (policy) {
      // Preserve every other production CSP directive. Only this document may
      // connect to the exact ephemeral fixture origin for this test.
      headers["content-security-policy"] = policy.replace(
        /(^|;)\s*connect-src([^;]*)/,
        `$1 connect-src$2 ${new URL(url).origin}`,
      );
    }
    await route.fulfill({ response, headers });
  };
  await page.route(documentPattern, allowTestStream);

  // Only the chosen consultation request uses this real streaming fixture.
  // Session protection and analysis still reach the application server.
  await page.addInitScript(({ url, target, ignoreAbort }) => {
    const scope = window as typeof window & {
      __restoreConsultationStream?: () => void;
      __consultationBodyStarted?: boolean;
      __consultationBodyRead?: boolean;
    };
    const original = window.fetch;
    window.fetch = (input, init) => {
      const requestUrl = new URL(input instanceof Request ? input.url : String(input), location.href);
      let action = "";
      if (typeof init?.body === "string") {
        try { action = JSON.parse(init.body).action; } catch { /* Not consultation JSON. */ }
      }
      const matches = target === "chat"
        ? requestUrl.pathname === "/api/ai/consultation" && action === "chat"
        : requestUrl.pathname === "/api/ai/consultation/preview";
      if (!matches) return original(input, init);
      return original(url, { ...init, credentials: "omit", ...(ignoreAbort ? { signal: undefined } : {}) })
        .then((response) => {
          if (target === "preview-error") {
            const readJson = response.json.bind(response);
            response.json = async () => {
              scope.__consultationBodyStarted = true;
              try {
                return await readJson();
              } finally {
                scope.__consultationBodyRead = true;
              }
            };
          }
          return response;
        });
    };
    scope.__restoreConsultationStream = () => {
      window.fetch = original;
      delete scope.__restoreConsultationStream;
      delete scope.__consultationBodyStarted;
      delete scope.__consultationBodyRead;
    };
  }, { url, target, ignoreAbort });

  return {
    release,
    firstChunk,
    disconnected: () => disconnected,
    bodyStarted: async () => {
      await page.waitForFunction(() => (window as typeof window & { __consultationBodyStarted?: boolean }).__consultationBodyStarted);
    },
    bodyRead: async () => {
      await page.waitForFunction(() => (window as typeof window & { __consultationBodyRead?: boolean }).__consultationBodyRead);
    },
    requests: () => requestCount,
    async close() {
      release();
      if (!page.isClosed()) {
        await page.unroute(documentPattern, allowTestStream);
        await page.evaluate(() => {
          const scope = window as typeof window & { __restoreConsultationStream?: () => void };
          scope.__restoreConsultationStream?.();
        }).catch(() => undefined);
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    },
  };
}
