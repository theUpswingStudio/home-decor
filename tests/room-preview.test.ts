import { describe, expect, it } from "vitest";
import { catalog } from "@/data/catalog";
import {
  ROOM_PREVIEW_PROMPT_VERSION,
  RoomPreviewValidationError,
  buildRoomPreviewPrompt,
  closestRoomPreviewAspectRatio,
  resolvePreviewProducts,
  roomPreviewSignature,
} from "@/lib/ai/room-preview";
import { DEFAULT_CONSULTATION_INTAKE } from "@/lib/ai/consultation-types";

function firstPair() {
  const product = catalog.products[0];
  const variant = catalog.variants.find((candidate) => candidate.productId === product.id);
  if (!variant) throw new Error("Catalog fixture has no variant.");
  return { product, variant, pair: { productId: product.id, variantId: variant.id } };
}

describe("room preview inputs", () => {
  it("maps room dimensions to the closest GPT Image 2 aspect ratio", () => {
    expect(closestRoomPreviewAspectRatio(1_600, 900)).toBe("16:9");
    expect(closestRoomPreviewAspectRatio(900, 1_600)).toBe("9:16");
    expect(closestRoomPreviewAspectRatio(1_200, 1_200)).toBe("1:1");
    expect(closestRoomPreviewAspectRatio(1_400, 1_000)).toBe("4:3");
  });

  it("resolves the selected variant and only the product hero image", () => {
    const { product, pair } = firstPair();
    const [resolved] = resolvePreviewProducts([pair]);
    const hero = product.images.find((image) => image.role === "hero");

    expect(resolved.heroUrl).toBe(hero?.url);
    expect(product.images.find((image) => image.role === "context")?.url)
      .not.toBe(resolved.heroUrl);
  });

  it("rejects a variant owned by another product", () => {
    const first = catalog.products[0];
    const otherVariant = catalog.variants.find((variant) => variant.productId !== first.id);
    if (!otherVariant) throw new Error("Catalog fixture needs two products.");

    expect(() => resolvePreviewProducts([{
      productId: first.id,
      variantId: otherVariant.id,
    }])).toThrow(RoomPreviewValidationError);
  });

  it("builds a versioned prompt with room preservation and verified product facts", () => {
    const { product, variant, pair } = firstPair();
    const resolved = resolvePreviewProducts([pair]);
    const prompt = buildRoomPreviewPrompt(DEFAULT_CONSULTATION_INTAKE, resolved);

    expect(prompt).toContain(ROOM_PREVIEW_PROMPT_VERSION);
    expect(prompt).toContain("Reference 1 is the user's room");
    expect(prompt).toContain("Preserve its architecture, camera position");
    expect(prompt).toContain(`Reference 2: ${product.name}`);
    expect(prompt).toContain(variant.options[0]?.value);
    expect(prompt).toContain("Replace visible furniture");
    expect(prompt).toContain("Add a referenced product only when no matching item exists");
  });

  it("changes the signature when the room source or product selection changes", () => {
    const { pair } = firstPair();
    const resolved = resolvePreviewProducts([pair]);
    const original = roomPreviewSignature("data:image/jpeg;base64,AAAA", resolved);
    const duplicate = roomPreviewSignature("data:image/jpeg;base64,AAAA", resolved);
    const changed = roomPreviewSignature("data:image/jpeg;base64,BBBB", resolved);

    expect(original).toBe(duplicate);
    expect(changed).not.toBe(original);
  });
});
