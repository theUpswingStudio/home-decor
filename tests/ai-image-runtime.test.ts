import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createOpenRouterImageRuntime,
} from "@/lib/ai/image-runtime";
import { getAiRuntime } from "@/lib/ai/model";

const imageResponse = {
  data: [{ b64_json: Buffer.from("preview-bytes").toString("base64"), media_type: "image/png" }],
  usage: { cost: 0.13 },
};

describe("OpenRouter image runtime", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "openai/gpt-image-2");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["local-proxy", "openrouter", "mock"])(
    "uses OpenRouter images when text AI_PROVIDER is %s",
    async (provider) => {
      vi.stubEnv("AI_PROVIDER", provider);
      const request = vi.fn<typeof fetch>().mockImplementation(async (input) => {
        if (String(input) === "https://images.example/hero.jpg") {
          return new Response(Buffer.from("hero-image"), {
            headers: { "Content-Type": "image/jpeg" },
          });
        }
        return Response.json(imageResponse);
      });
      const runtime = createOpenRouterImageRuntime({ fetch: request, timeoutMs: 1_000 });
      const textRuntime = getAiRuntime();

      const result = await runtime.renderRoomPreview({
        prompt: "fixed prompt",
        aspectRatio: "16:9",
        references: [
          { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } },
          { type: "image_url", image_url: { url: "https://images.example/hero.jpg" } },
        ],
        signal: new AbortController().signal,
      });
      const providerRequest = request.mock.calls.find(([input]) => (
        String(input) === "https://openrouter.ai/api/v1/images"
      ));
      const requestBody = JSON.parse(String(providerRequest?.[1]?.body));

      expect(runtime.provider).toBe("openrouter");
      expect(textRuntime.mode === "mock" ? "mock" : textRuntime.label).toBe(provider);
      expect(providerRequest?.[0]).toBe("https://openrouter.ai/api/v1/images");
      expect(requestBody).toMatchObject({
        model: "openai/gpt-image-2",
        quality: "high",
        n: 1,
        background: "opaque",
        aspect_ratio: "16:9",
      });
      expect(requestBody.input_references[0].image_url.url).toBe("data:image/jpeg;base64,AAAA");
      expect(requestBody.input_references[1].image_url.url).toBe(
        `data:image/jpeg;base64,${Buffer.from("hero-image").toString("base64")}`,
      );
      expect(new TextDecoder().decode(result.bytes)).toBe("preview-bytes");
      expect(result.reportedCost).toBe(0.13);
    },
  );

  it("rejects a catalog reference that is not an image", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("not an image", {
      headers: { "Content-Type": "text/plain" },
    }));
    const runtime = createOpenRouterImageRuntime({ fetch: request, timeoutMs: 1_000 });

    await expect(runtime.renderRoomPreview({
      prompt: "fixed prompt",
      aspectRatio: "1:1",
      references: [{ type: "image_url", image_url: { url: "https://images.example/hero.jpg" } }],
      signal: new AbortController().signal,
    })).rejects.toEqual(expect.objectContaining({ kind: "invalid-response" }));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not call any provider when the OpenRouter image key is missing", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("AI_PROVIDER", "local-proxy");
    const request = vi.fn<typeof fetch>();

    expect(getAiRuntime()).toMatchObject({ mode: "model", label: "local-proxy" });
    expect(() => createOpenRouterImageRuntime({ fetch: request })).toThrowError(
      expect.objectContaining({ kind: "configuration" }),
    );
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [402, "credit"],
    [429, "rate-limit"],
    [504, "timeout"],
    [422, "moderation"],
    [500, "provider"],
  ] as const)("maps provider status %s to %s", async (status, kind) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(
      { error: { message: status === 422 ? "content moderation" : "provider failure" } },
      { status },
    ));
    const runtime = createOpenRouterImageRuntime({ fetch: request, timeoutMs: 1_000 });

    await expect(runtime.renderRoomPreview({
      prompt: "fixed prompt",
      aspectRatio: "1:1",
      references: [{ type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } }],
      signal: new AbortController().signal,
    })).rejects.toEqual(expect.objectContaining({ kind }));
  });
});
