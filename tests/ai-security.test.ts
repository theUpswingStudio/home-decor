import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const origin = "http://127.0.0.1:3100";
const hour = 60 * 60 * 1000;

function request(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { origin, "x-forwarded-for": "security-test-network", ...headers },
  });
}

async function loadSecurity(environment: string | undefined) {
  vi.stubEnv("NODE_ENV", environment);
  return import("@/lib/ai/security");
}

async function credentials(handshake: Response) {
  expect(handshake.status).toBe(200);
  const cookie = handshake.headers.get("set-cookie")?.split(";")[0];
  expect(cookie).toBeTruthy();
  const { csrfToken } = await handshake.json() as { csrfToken: string };
  expect(csrfToken).toBeTruthy();
  return { cookie: cookie!, "x-ai-csrf": csrfToken };
}

function expectStatus(result: { sessionId: string } | Response, status: number) {
  expect(result).toBeInstanceOf(Response);
  expect((result as Response).status).toBe(status);
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("AI_SESSION_SECRET", "security-test-secret");
  vi.stubEnv("APP_ORIGIN", origin);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-08T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("AI request security", () => {
  it("allows 21 new handshakes on one network in development", async () => {
    const { createAiSessionHandshake } = await loadSecurity("development");
    const cookies = new Set<string>();
    for (let index = 0; index < 21; index += 1) {
      const headers = await credentials(createAiSessionHandshake(request("/api/ai/session")));
      cookies.add(headers.cookie);
    }
    expect(cookies.size).toBe(21);
  });

  it("allows 61 protected requests on one session in development", async () => {
    const { createAiSessionHandshake, protectAiRequest } = await loadSecurity("development");
    const headers = await credentials(createAiSessionHandshake(request("/api/ai/session")));
    for (let index = 0; index < 61; index += 1) {
      expect(protectAiRequest(request("/api/ai/consultation", headers)))
        .toEqual({ sessionId: expect.any(String) });
    }
  });

  it.each(["production", "test", undefined])(
    "limits new handshakes when NODE_ENV is %s",
    async (environment) => {
      const { createAiSessionHandshake } = await loadSecurity(environment);
      for (let index = 0; index < 5; index += 1) {
        await credentials(createAiSessionHandshake(request("/api/ai/session")));
      }
      const blocked = createAiSessionHandshake(request("/api/ai/session"));
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).toBe("3600");
      vi.advanceTimersByTime(hour);
      expect(createAiSessionHandshake(request("/api/ai/session")).status).toBe(200);
    },
  );

  it("enforces the production daily limit outside hourly windows", async () => {
    const { createAiSessionHandshake } = await loadSecurity("production");
    for (let index = 0; index < 20; index += 1) {
      await credentials(createAiSessionHandshake(request("/api/ai/session")));
      vi.advanceTimersByTime(hour + 1);
    }
    const blocked = createAiSessionHandshake(request("/api/ai/session"));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(3600);
    vi.advanceTimersByTime(4 * hour);
    expect(createAiSessionHandshake(request("/api/ai/session")).status).toBe(200);
  });

  it.each(["production", "test", undefined])(
    "limits protected requests when NODE_ENV is %s",
    async (environment) => {
      const { createAiSessionHandshake, protectAiRequest } = await loadSecurity(environment);
      const headers = await credentials(createAiSessionHandshake(request("/api/ai/session")));
      for (let index = 0; index < 60; index += 1) {
        expect(protectAiRequest(request("/api/ai/consultation", headers)))
          .toEqual({ sessionId: expect.any(String) });
      }
      const blocked = protectAiRequest(request("/api/ai/consultation", headers));
      expectStatus(blocked, 429);
      expect((blocked as Response).headers.get("retry-after")).toBe("3600");
      vi.advanceTimersByTime(hour);
      expect(protectAiRequest(request("/api/ai/consultation", headers)))
        .toEqual({ sessionId: expect.any(String) });
    },
  );

  it.each<{ name: string; headers: Record<string, string>; status: number }>([
    { name: "cross-origin", headers: { origin: "https://other.example" }, status: 403 },
    { name: "cross-site", headers: { "sec-fetch-site": "cross-site" }, status: 403 },
    { name: "missing CSRF", headers: { "x-ai-csrf": "" }, status: 401 },
    { name: "incorrect CSRF", headers: { "x-ai-csrf": "incorrect" }, status: 401 },
    { name: "missing cookie", headers: { cookie: "" }, status: 401 },
    { name: "invalid cookie", headers: { cookie: "vestrel-ai-session=invalid" }, status: 401 },
    { name: "oversized request", headers: { "content-length": "9000001" }, status: 413 },
  ])("rejects $name in development", async ({ headers: overrides, status }) => {
    const { createAiSessionHandshake, protectAiRequest } = await loadSecurity("development");
    const headers = await credentials(createAiSessionHandshake(request("/api/ai/session")));
    expectStatus(protectAiRequest(request("/api/ai/consultation", { ...headers, ...overrides })), status);
  });

  it("rejects cross-origin handshakes in development", async () => {
    const { createAiSessionHandshake } = await loadSecurity("development");
    expect(createAiSessionHandshake(request("/api/ai/session", {
      origin: "https://other.example",
    })).status).toBe(403);
  });

  it("rejects a tampered signed cookie in development", async () => {
    const { createAiSessionHandshake, protectAiRequest } = await loadSecurity("development");
    const headers = await credentials(createAiSessionHandshake(request("/api/ai/session")));
    expectStatus(protectAiRequest(request("/api/ai/consultation", {
      ...headers,
      cookie: `${headers.cookie}tampered`,
    })), 401);
  });
});
