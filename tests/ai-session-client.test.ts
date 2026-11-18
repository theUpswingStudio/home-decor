import { describe, expect, it, vi } from "vitest";
import { fetchWithAiSessionRecovery } from "@/lib/ai/client-session";

describe("fetchWithAiSessionRecovery", () => {
  it("does not renew when the request is abandoned after a 401", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      return Response.json({ error: "expired" }, { status: 401 });
    });
    const renew = vi.fn().mockResolvedValue("unused-token");

    await expect(fetchWithAiSessionRecovery("/api/ai/consultation", {
      signal: controller.signal,
    }, { fetch: request, renew })).rejects.toMatchObject({ name: "AbortError" });
    expect(request).toHaveBeenCalledOnce();
    expect(renew).not.toHaveBeenCalled();
  });

  it("cancels renewal with the caller's signal and does not retry", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ error: "expired" }, { status: 401 }),
    );
    let renewalStarted!: () => void;
    const started = new Promise<void>((resolve) => { renewalStarted = resolve; });
    const renew = vi.fn(async (signal?: AbortSignal) => {
      renewalStarted();
      if (!signal) return "uncancelled-token";
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });
    const result = fetchWithAiSessionRecovery("/api/ai/consultation", {
      signal: controller.signal,
    }, { fetch: request, renew });
    const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await started;
    controller.abort();

    await rejected;
    expect(renew).toHaveBeenCalledWith(controller.signal);
    expect(request).toHaveBeenCalledOnce();
  });

  it("ignores renewed credentials when renewal finishes after abandonment", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ error: "expired" }, { status: 401 }),
    );
    const renew = vi.fn(async () => {
      controller.abort();
      return "obsolete-token";
    });
    const input = new Request("http://localhost/api/ai/consultation", {
      method: "POST", signal: controller.signal, body: "{}",
    });

    await expect(fetchWithAiSessionRecovery(input, undefined, {
      fetch: request, renew,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(request).toHaveBeenCalledOnce();
    expect(renew).toHaveBeenCalledWith(input.signal);
  });

  it("renews a stale design session and retries once with the new CSRF token", async () => {
    const controller = new AbortController();
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ error: "expired" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    const renew = vi.fn().mockResolvedValue("fresh-csrf-token");

    const response = await fetchWithAiSessionRecovery(
      "/api/ai/consultation",
      {
        method: "POST",
        headers: { "x-ai-csrf": "stale-csrf-token" },
        body: JSON.stringify({ action: "analyze" }),
        signal: controller.signal,
      },
      { fetch: request, renew },
    );

    expect(response.status).toBe(200);
    expect(renew).toHaveBeenCalledOnce();
    expect(renew).toHaveBeenCalledWith(controller.signal);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1]?.[1]?.signal).toBe(controller.signal);
    expect(new Headers(request.mock.calls[1]?.[1]?.headers).get("x-ai-csrf"))
      .toBe("fresh-csrf-token");
  });

  it("does not renew or retry non-session failures", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ error: "model unavailable" }, { status: 503 }),
    );
    const renew = vi.fn().mockResolvedValue("unused-token");

    const response = await fetchWithAiSessionRecovery(
      "/api/ai/consultation",
      { method: "POST" },
      { fetch: request, renew },
    );

    expect(response.status).toBe(503);
    expect(renew).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledOnce();
  });
  it.each(["init", "request"])("rejects an already-aborted %s signal before sending", async (source) => {
    const controller = new AbortController();
    controller.abort();
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    const renew = vi.fn().mockResolvedValue("unused");
    await expect(fetchWithAiSessionRecovery(
      source === "request" ? new Request("https://example.com", { signal: controller.signal }) : "/api/ai/consultation",
      source === "init" ? { signal: controller.signal } : undefined,
      { fetch: request, renew },
    )).rejects.toMatchObject({ name: "AbortError" });
    expect(request).not.toHaveBeenCalled();
    expect(renew).not.toHaveBeenCalled();
  });

});
