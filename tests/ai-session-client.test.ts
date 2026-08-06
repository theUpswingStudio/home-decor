import { describe, expect, it, vi } from "vitest";
import { fetchWithAiSessionRecovery } from "@/lib/ai/client-session";

describe("fetchWithAiSessionRecovery", () => {
  it("renews a stale design session and retries once with the new CSRF token", async () => {
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
      },
      { fetch: request, renew },
    );

    expect(response.status).toBe(200);
    expect(renew).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
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
});
