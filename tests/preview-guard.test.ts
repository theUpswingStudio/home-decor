import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catalog } from "@/data/catalog";
import { DEFAULT_CONSULTATION_INTAKE } from "@/lib/ai/consultation-types";
import { createAiSessionHandshake } from "@/lib/ai/security";
import { POST } from "@/app/api/ai/consultation/preview/route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/image-runtime", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/image-runtime")>();
  return {
    ...original,
    getImageRuntime: () => ({
      model: "test-image-model",
      renderRoomPreview: async () => ({
        bytes: new Uint8Array([1, 2, 3]), mediaType: "image/png", model: "test-image-model", reportedCost: null,
      }),
    }),
  };
});

import {
  PreviewAttemptError,
  resetPreviewGuardForTests,
  runGuardedPreview,
} from "@/lib/ai/preview-guard";

const renderedImage = {
  bytes: new Uint8Array([1, 2, 3]),
  mediaType: "image/png",
  model: "openai/gpt-image-2",
  reportedCost: 0.13,
};

describe("preview attempt guard", () => {
  beforeEach(() => resetPreviewGuardForTests());
  afterEach(() => vi.unstubAllEnvs());

  it("keeps signed-session attempts used after a new room draft and returns truthful recovery copy", async () => {
    const origin = "http://127.0.0.1:3100";
    vi.stubEnv("APP_ORIGIN", origin);
    vi.stubEnv("AI_SESSION_SECRET", "preview-guard-test-secret");
    const handshake = createAiSessionHandshake(new Request(`${origin}/api/ai/session`, {
      method: "POST", headers: { origin, "x-forwarded-for": "preview-guard-route-test" },
    }));
    expect(handshake.status).toBe(200);
    const cookie = handshake.headers.get("set-cookie")!.split(";")[0];
    const { csrfToken } = await handshake.json() as { csrfToken: string };
    const product = catalog.products[0];
    const variant = catalog.variants.find((candidate) => candidate.productId === product.id)!;
    const submit = (image: string, attempt: 1 | 2) => POST(new Request(`${origin}/api/ai/consultation/preview`, {
      method: "POST",
      headers: { origin, cookie, "x-ai-csrf": csrfToken, "content-type": "application/json" },
      body: JSON.stringify({
        imageDataUrl: `data:image/jpeg;base64,${image}`,
        room: {
          assetId: crypto.randomUUID(), fileName: "room.jpg", mediaType: "image/jpeg", width: 640, height: 400,
        },
        intake: DEFAULT_CONSULTATION_INTAKE,
        products: [{ productId: product.id, variantId: variant.id }],
        attempt,
      }),
    }));

    expect((await submit("AAAA", 1)).status).toBe(200);
    expect((await submit("AAAA", 2)).status).toBe(200);
    for (const attempt of [1, 2] as const) {
      const response = await submit("BBBB", attempt);
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        error: "This preview attempt is already used for this session. Your recommendations are still available.",
      });
    }
  });

  it("deduplicates the same attempt and signature", async () => {
    const render = vi.fn().mockResolvedValue(renderedImage);
    const first = runGuardedPreview("session", 1, "signature", render);
    const duplicate = runGuardedPreview("session", 1, "signature", render);

    await expect(first).resolves.toBe(renderedImage);
    await expect(duplicate).resolves.toBe(renderedImage);
    expect(render).toHaveBeenCalledOnce();
  });

  it("allows one automatic attempt and one retry", async () => {
    const firstRender = vi.fn().mockResolvedValue(renderedImage);
    const retryRender = vi.fn().mockResolvedValue(renderedImage);

    await runGuardedPreview("session", 1, "initial", firstRender);
    await runGuardedPreview("session", 2, "updated", retryRender);

    expect(firstRender).toHaveBeenCalledOnce();
    expect(retryRender).toHaveBeenCalledOnce();
  });

  it("rejects another selection for an attempt that was already used", async () => {
    await runGuardedPreview("session", 1, "initial", async () => renderedImage);

    expect(() => runGuardedPreview("session", 1, "changed", async () => renderedImage))
      .toThrow(PreviewAttemptError);
  });
});
