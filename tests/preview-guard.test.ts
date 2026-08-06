import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
