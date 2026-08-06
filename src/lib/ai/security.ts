import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "vestrel-ai-session";
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const MAX_REQUEST_BYTES = 9_000_000;
const SESSION_HOURLY_LIMIT = 5;
const SESSION_DAILY_LIMIT = 20;
const REQUEST_HOURLY_LIMIT = 60;

interface RateWindow {
  timestamps: number[];
}

const newSessionWindows = new Map<string, RateWindow>();
const requestWindows = new Map<string, RateWindow>();

function getSecret(): string {
  const configured = process.env.AI_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AI_SESSION_SECRET is required in production.");
  }
  return "vestrel-house-local-poc-secret-change-before-production";
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookieHeader(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    cookies.set(part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim()));
  }
  return cookies;
}

function readSessionId(request: Request): string | null {
  const value = parseCookieHeader(request.headers.get("cookie")).get(SESSION_COOKIE);
  if (!value) return null;
  const [sessionId, issuedAtValue, signature] = value.split(".");
  const issuedAt = Number(issuedAtValue);
  if (!sessionId || !issuedAtValue || !signature || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS || issuedAt > Date.now() + 60_000) return null;
  const unsigned = `${sessionId}.${issuedAtValue}`;
  return safeEqual(sign(unsigned), signature) ? sessionId : null;
}

function csrfFor(sessionId: string): string {
  return sign(`csrf:${sessionId}`);
}

function isSameOriginBrowserRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const expectedOrigin = process.env.APP_ORIGIN?.trim() || new URL(request.url).origin;
  return origin === expectedOrigin;
}

function sourceNetworkKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const source = forwarded || request.headers.get("x-real-ip")?.trim() || "local-development";
  return sign(`network:${source}`);
}

function consumeWindow(
  windows: Map<string, RateWindow>,
  key: string,
  limit: number,
  durationMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - durationMs;
  const window = windows.get(key) ?? { timestamps: [] };
  window.timestamps = window.timestamps.filter((timestamp) => timestamp > cutoff);
  if (window.timestamps.length >= limit) {
    const retryAt = window.timestamps[0] + durationMs;
    windows.set(key, window);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now) / 1000)) };
  }
  window.timestamps.push(now);
  windows.set(key, window);
  return { allowed: true, retryAfterSeconds: 0 };
}

function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "This design session has reached its current request limit. Please try again soon." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export function createAiSessionHandshake(request: Request): Response {
  if (!isSameOriginBrowserRequest(request)) {
    return Response.json({ error: "Cross-site session requests are not allowed." }, { status: 403 });
  }

  const existingSessionId = readSessionId(request);
  if (existingSessionId) {
    return Response.json(
      {
        csrfToken: csrfFor(existingSessionId),
        expiresInSeconds: SESSION_MAX_AGE_MS / 1000,
        previewAvailable: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const networkKey = sourceNetworkKey(request);
  const hourly = consumeWindow(
    newSessionWindows,
    `hour:${networkKey}`,
    SESSION_HOURLY_LIMIT,
    60 * 60 * 1000,
  );
  if (!hourly.allowed) return rateLimitResponse(hourly.retryAfterSeconds);
  const daily = consumeWindow(
    newSessionWindows,
    `day:${networkKey}`,
    SESSION_DAILY_LIMIT,
    24 * 60 * 60 * 1000,
  );
  if (!daily.allowed) return rateLimitResponse(daily.retryAfterSeconds);

  const sessionId = randomBytes(24).toString("base64url");
  const issuedAt = Date.now();
  const unsigned = `${sessionId}.${issuedAt}`;
  const cookieValue = `${unsigned}.${sign(unsigned)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    {
      csrfToken: csrfFor(sessionId),
      expiresInSeconds: SESSION_MAX_AGE_MS / 1000,
      previewAvailable: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(cookieValue)}; Path=/api/ai; HttpOnly; SameSite=Strict${secure}`,
      },
    },
  );
}

export function protectAiRequest(request: Request): { sessionId: string } | Response {
  if (!isSameOriginBrowserRequest(request)) {
    return Response.json({ error: "Cross-site AI requests are not allowed." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "The room image is too large." }, { status: 413 });
  }
  const sessionId = readSessionId(request);
  const csrf = request.headers.get("x-ai-csrf");
  if (!sessionId || !csrf || !safeEqual(csrfFor(sessionId), csrf)) {
    return Response.json({ error: "Start a new design session before using the assistant." }, { status: 401 });
  }
  const requestLimit = consumeWindow(
    requestWindows,
    sessionId,
    REQUEST_HOURLY_LIMIT,
    60 * 60 * 1000,
  );
  if (!requestLimit.allowed) return rateLimitResponse(requestLimit.retryAfterSeconds);
  return { sessionId };
}
